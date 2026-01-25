const STRUDEL_LINE_PATTERN = /^\s*\$:/;
const COMMENT_LINE_PATTERN = /^\s*\/\//;
const INSTRUMENT_COMMENT_REGEX = /^\s*\/\/\s*(.+)$/;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const detectNewline = (value: string) =>
  value.includes("\r\n") ? "\r\n" : "\n";

const setGainValue = (line: string, gain: number) => {
  const gainIndex = line.lastIndexOf(".gain(");
  if (gainIndex === -1) {
    return line;
  }

  const closingIndex = line.indexOf(")", gainIndex);
  if (closingIndex === -1) {
    return line;
  }

  const prefix = line.slice(0, gainIndex);
  const suffix = line.slice(closingIndex + 1);
  return `${prefix}.gain(${gain})${suffix}`;
};

const extractInstrumentName = (line: string) => {
  const match = line.match(INSTRUMENT_COMMENT_REGEX);
  return match ? match[1].trim() : null;
};

const toInstrumentCommentPattern = (instrument: string) =>
  new RegExp(`^\\s*//\\s*${escapeRegExp(instrument)}\\b.*$`, "i");

const extractGainFromBlock = (lines: string[], startIndex: number) => {
  for (let cursor = startIndex; cursor < lines.length; cursor += 1) {
    const rawLine = lines[cursor];
    const trimmedLine = rawLine.trim();

    if (!trimmedLine.length) {
      continue;
    }

    if (COMMENT_LINE_PATTERN.test(trimmedLine)) {
      return 1;
    }

    if (!STRUDEL_LINE_PATTERN.test(rawLine)) {
      return 1;
    }

    const gainIndex = rawLine.lastIndexOf(".gain(");
    if (gainIndex === -1) {
      return 1;
    }

    const closingIndex = rawLine.indexOf(")", gainIndex);
    if (closingIndex === -1) {
      return 1;
    }

    const gainValue = rawLine.slice(gainIndex + 6, closingIndex).trim();
    const parsedGain = Number(gainValue);
    return Number.isFinite(parsedGain) ? parsedGain : 1;
  }

  return 1;
};

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

  get_tracks(code: string) {
    if (typeof code !== "string" || !code.length) {
      return [] as Array<{ instrument: string; gain: number }>;
    }

    const lines = code.split(/\r?\n/);
    const tracks: Array<{ instrument: string; gain: number }> = [];

    for (let index = 0; index < lines.length; index += 1) {
      const instrument = extractInstrumentName(lines[index]);
      if (!instrument) {
        continue;
      }

      const gain = extractGainFromBlock(lines, index + 1);
      tracks.push({ instrument, gain });
    }

    return tracks;
  },
};
