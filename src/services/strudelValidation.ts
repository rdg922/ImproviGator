import { transpiler } from "@strudel/transpiler";

export type StrudelValidationError = {
  message: string;
  line?: number;
  column?: number;
};

export type StrudelValidationResult = {
  isValid: boolean;
  error: StrudelValidationError | null;
};

const UNKNOWN_ERROR_MESSAGE = "Unable to validate Strudel code.";
const RUNTIME_INIT_ERROR_MESSAGE =
  "Unable to initialize the Strudel runtime for validation.";

const trimToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const toValidationError = (error: unknown): StrudelValidationError => {
  if (error instanceof Error) {
    const { loc } = error as { loc?: { line?: number; column?: number } };
    const location = loc && typeof loc === "object" ? loc : undefined;

    return {
      message: error.message || UNKNOWN_ERROR_MESSAGE,
      line: location?.line,
      column: location?.column,
    };
  }

  return { message: UNKNOWN_ERROR_MESSAGE };
};

type StrudelCoreModule = typeof import("@strudel/core");
type StrudelMiniModule = typeof import("@strudel/mini");
type StrudelTonalModule = typeof import("@strudel/tonal");
type StrudelWebAudioModule = typeof import("@strudel/webaudio");
type StrudelSoundfontsModule = typeof import("@strudel/soundfonts");

let strudelCoreModulePromise: Promise<StrudelCoreModule> | null = null;
let strudelMiniModulePromise: Promise<StrudelMiniModule> | null = null;
let strudelTonalModulePromise: Promise<StrudelTonalModule> | null = null;
let strudelWebAudioModulePromise: Promise<StrudelWebAudioModule> | null = null;
let strudelSoundfontsModulePromise: Promise<StrudelSoundfontsModule> | null =
  null;

const loadStrudelCoreModule = () => {
  if (!strudelCoreModulePromise) {
    strudelCoreModulePromise = import("@strudel/core");
  }
  return strudelCoreModulePromise;
};

const loadStrudelMiniModule = () => {
  if (!strudelMiniModulePromise) {
    strudelMiniModulePromise = import("@strudel/mini");
  }
  return strudelMiniModulePromise;
};

const loadStrudelTonalModule = () => {
  if (!strudelTonalModulePromise) {
    strudelTonalModulePromise = import("@strudel/tonal");
  }
  return strudelTonalModulePromise;
};

const loadStrudelWebAudioModule = () => {
  if (!strudelWebAudioModulePromise) {
    strudelWebAudioModulePromise = import("@strudel/webaudio");
  }
  return strudelWebAudioModulePromise;
};

const loadStrudelSoundfontsModule = () => {
  if (!strudelSoundfontsModulePromise) {
    strudelSoundfontsModulePromise = import("@strudel/soundfonts");
  }
  return strudelSoundfontsModulePromise;
};

const supportsRuntimeValidation = () => typeof window !== "undefined";

let strudelRuntimePromise: Promise<void> | null = null;
type ValidatorReplEvaluator = {
  evaluate: (source: string) => Promise<Error | null>;
};

let validatorReplPromise: Promise<ValidatorReplEvaluator> | null = null;

const ensureStrudelRuntime = async () => {
  if (!supportsRuntimeValidation()) {
    return;
  }

  if (!strudelRuntimePromise) {
    strudelRuntimePromise = (async () => {
      const [coreModule, miniModule, tonalModule, webaudioModule] =
        await Promise.all([
          loadStrudelCoreModule(),
          loadStrudelMiniModule(),
          loadStrudelTonalModule(),
          loadStrudelWebAudioModule(),
        ]);

      const loadScope = coreModule.evalScope(
        Promise.resolve(coreModule),
        Promise.resolve(miniModule),
        Promise.resolve(tonalModule),
        Promise.resolve(webaudioModule),
      );
      const loadSoundfonts = loadStrudelSoundfontsModule().then(
        (mod) => mod.registerSoundfonts?.() ?? Promise.resolve(),
      );

      const { registerSynthSounds } = webaudioModule;

      await Promise.all([
        loadScope,
        registerSynthSounds?.() ?? Promise.resolve(),
        loadSoundfonts,
      ]);
    })().catch((error) => {
      strudelRuntimePromise = null;
      throw error;
    });
  }

  return strudelRuntimePromise;
};

const nowInSeconds = () =>
  typeof performance !== "undefined"
    ? performance.now() / 1000
    : Date.now() / 1000;

const createValidatorRepl = async (): Promise<ValidatorReplEvaluator> => {
  let lastError: Error | null = null;
  const { repl } = await loadStrudelCoreModule();

  const replInstance = repl({
    defaultOutput: async () => undefined,
    getTime: () => nowInSeconds(),
    transpiler,
    onEvalError: (error) => {
      lastError = error instanceof Error ? error : new Error(String(error));
    },
  });

  return {
    evaluate: async (source: string) => {
      lastError = null;
      await replInstance.evaluate(source, false);
      return lastError;
    },
  };
};

const getValidatorRepl = async () => {
  if (!supportsRuntimeValidation()) {
    return null;
  }

  if (!validatorReplPromise) {
    validatorReplPromise = (async () => {
      await ensureStrudelRuntime();
      return createValidatorRepl();
    })().catch((error) => {
      validatorReplPromise = null;
      throw error;
    });
  }

  return validatorReplPromise;
};

const runSyntaxCheck = (source: string): StrudelValidationError | null => {
  try {
    transpiler(source, {
      addReturn: false,
      emitMiniLocations: false,
      emitWidgets: false,
    });
    return null;
  } catch (error) {
    return toValidationError(error);
  }
};

const runRuntimeCheck = async (
  source: string,
): Promise<StrudelValidationError | null> => {
  if (!supportsRuntimeValidation()) {
    return null;
  }

  let validator;
  try {
    validator = await getValidatorRepl();
  } catch (error) {
    console.warn("Strudel runtime bootstrap failed", error);
    return { message: RUNTIME_INIT_ERROR_MESSAGE };
  }

  if (!validator) {
    return null;
  }

  try {
    const runtimeError = await validator.evaluate(source);
    if (runtimeError) {
      return toValidationError(runtimeError);
    }
    return null;
  } catch (error) {
    return toValidationError(error);
  }
};

/**
 * Attempts to transpile and evaluate Strudel code to catch both syntax and
 * runtime issues (e.g., calling undefined methods) before execution.
 * Returns a structured error payload so callers can surface helpful feedback.
 */
export const validateStrudel = async (
  code: string,
): Promise<StrudelValidationResult> => {
  const source = trimToNull(code);
  if (!source) {
    return {
      isValid: false,
      error: { message: "Please provide Strudel code to validate." },
    };
  }

  const syntaxError = runSyntaxCheck(source);
  if (syntaxError) {
    return { isValid: false, error: syntaxError };
  }

  const runtimeError = await runRuntimeCheck(source);
  if (runtimeError) {
    return { isValid: false, error: runtimeError };
  }

  return { isValid: true, error: null };
};

const STRUDEL_LINE_PATTERN = /^\s*\$:/;
const GAIN_FUNCTION_REGEX = /\.gain\(\s*[^)]+\s*\)/;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const detectNewline = (value: string) =>
  value.includes("\r\n") ? "\r\n" : "\n";

const addGainIfMissing = (line: string, gain: number) =>
  GAIN_FUNCTION_REGEX.test(line) ? line : `${line}.gain(${gain})`;

const setGainValue = (line: string, gain: number) =>
  GAIN_FUNCTION_REGEX.test(line)
    ? line.replace(GAIN_FUNCTION_REGEX, `.gain(${gain})`)
    : `${line}.gain(${gain})`;

export const handleStrudel = {
  formatStrudel(code: string) {
    if (typeof code !== "string" || !code.length) {
      return code;
    }

    const newline = detectNewline(code);
    const updatedLines = code
      .split(/\r?\n/)
      .map((line) =>
        STRUDEL_LINE_PATTERN.test(line) ? addGainIfMissing(line, 1) : line,
      );

    return updatedLines.join(newline);
  },

  setInstrumentGain(code: string, instrument: string, gain: number) {
    if (
      typeof code !== "string" ||
      !code.length ||
      typeof instrument !== "string" ||
      !instrument.trim().length ||
      !Number.isFinite(gain)
    ) {
      return code;
    }

    const newline = detectNewline(code);
    const lines = code.split(/\r?\n/);
    const instrumentPattern = new RegExp(
      `^\\s*//\\s*${escapeRegExp(instrument.trim())}\\s*:`,
      "i",
    );

    for (let index = 0; index < lines.length; index += 1) {
      if (!instrumentPattern.test(lines[index])) {
        continue;
      }

      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const trimmedLine = lines[cursor].trim();

        if (!trimmedLine.length) {
          continue;
        }

        if (trimmedLine.startsWith("//")) {
          break;
        }

        if (STRUDEL_LINE_PATTERN.test(lines[cursor])) {
          lines[cursor] = setGainValue(lines[cursor], gain);
          return lines.join(newline);
        }
      }

      break;
    }

    return code;
  },
};
