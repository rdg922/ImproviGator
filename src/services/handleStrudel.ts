const STRUDEL_LINE_PATTERN = /^\s*\$:/;
const COMMENT_LINE_PATTERN = /^\s*\/\//;
const GAIN_AT_END_REGEX = /\.gain\(\s*[^)]+\s*\)\s*$/;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const detectNewline = (value: string) =>
  value.includes("\r\n") ? "\r\n" : "\n";

const appendGainIfMissing = (line: string, gain: number) =>
  GAIN_AT_END_REGEX.test(line.trimEnd()) ? line : `${line}.gain(${gain})`;

const setGainValue = (line: string, gain: number) =>
  GAIN_AT_END_REGEX.test(line.trimEnd())
    ? line.replace(GAIN_AT_END_REGEX, `.gain(${gain})`)
    : `${line}.gain(${gain})`;

const toInstrumentCommentPattern = (instrument: string) =>
  new RegExp(`^\\s*//\\s*${escapeRegExp(instrument)}\\b.*$`, "i");

const applyGainToBlock = (
  lines: string[],
  startIndex: number,
  gain: number,
) => {
  let didUpdate = false;

  for (let cursor = startIndex; cursor < lines.length; cursor += 1) {
    const rawLine = lines[cursor];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine.length) {
      continue;
    }

    if (COMMENT_LINE_PATTERN.test(trimmedLine)) {
      break;
    }

    if (!STRUDEL_LINE_PATTERN.test(rawLine)) {
      break;
    }

    lines[cursor] = setGainValue(rawLine, gain);
    didUpdate = true;
  }

  return didUpdate;
};

export const handleStrudel = {
  append_gain(code: string) {
    if (typeof code !== "string" || !code.length) {
      return code;
    }

    const newline = detectNewline(code);
    const updatedLines = code
      .split(/\r?\n/)
      .map((line) =>
        STRUDEL_LINE_PATTERN.test(line) ? appendGainIfMissing(line, 1) : line,
      );

    return updatedLines.join(newline);
  },

  set_gain(code: string, instrument: string, gain: number) {
    if (
      typeof code !== "string" ||
      !code.length ||
      typeof instrument !== "string" ||
      !instrument.trim().length ||
      !Number.isFinite(gain)
    ) {
      return code;
    }

    const trimmedInstrument = instrument.trim();
    const instrumentPattern = toInstrumentCommentPattern(trimmedInstrument);
    const newline = detectNewline(code);
    const lines = code.split(/\r?\n/);

    for (let index = 0; index < lines.length; index += 1) {
      if (!instrumentPattern.test(lines[index])) {
        continue;
      }

      const updated = applyGainToBlock(lines, index + 1, gain);
      if (updated) {
        return lines.join(newline);
      }

      break;
    }

    return code;
  },
};
