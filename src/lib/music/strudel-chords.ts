export type ParsedChordToken = { chord: string | string[]; index: number };

export function parseStrudelChords(code: string): ParsedChordToken[] {
  // Match chord() with backticks, double quotes, or single quotes (with or without assignment)
  const assignmentMatch =
    /\b\w+\s*=\s*chord\(\s*([`"'])([\s\S]*?)\1\s*\)/s.exec(code);
  const directMatch = /\bchord\(\s*([`"'])([\s\S]*?)\1\s*\)/s.exec(code);
  const templateMatch = /\bchord\s*`([\s\S]*?)`/s.exec(code);

  const chordLineMatch = assignmentMatch ?? directMatch;
  let rawContent = chordLineMatch?.[2] ?? templateMatch?.[1] ?? "";
  if (!rawContent) return [];

  // Try to extract content within < > to ignore multipliers like *4
  // If no angle brackets, use the entire content
  const angleMatch = /<([^>]+)>/s.exec(rawContent);
  if (angleMatch?.[1]) {
    rawContent = angleMatch[1];
  }

  // Remove comments (// single-line comments)
  const chordContent = rawContent
    .split("\n")
    .map((line) => {
      const commentIndex = line.indexOf("//");
      return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
    })
    .join(" ")
    .trim();

  const tokens: ParsedChordToken[] = [];
  let index = 0;
  let i = 0;

  while (i < chordContent.length) {
    // Skip whitespace
    while (i < chordContent.length && /\s/.test(chordContent[i] ?? "")) {
      i++;
    }
    if (i >= chordContent.length) break;

    // Check for bracketed group
    if (chordContent[i] === "[") {
      i++;
      const groupChords: string[] = [];
      let buffer = "";

      while (i < chordContent.length && chordContent[i] !== "]") {
        if (/\s/.test(chordContent[i] ?? "")) {
          if (buffer) {
            groupChords.push(buffer);
            buffer = "";
          }
        } else {
          buffer += chordContent[i] ?? "";
        }
        i++;
      }
      if (buffer) groupChords.push(buffer);
      if (groupChords.length > 0) {
        tokens.push({ chord: groupChords, index });
        index++;
      }
      i++; // skip ']'
    } else {
      // Single chord
      let buffer = "";
      while (
        i < chordContent.length &&
        !/[\s\[\]]/.test(chordContent[i] ?? "")
      ) {
        buffer += chordContent[i] ?? "";
        i++;
      }
      if (buffer) {
        tokens.push({ chord: buffer, index });
        index++;
      }
    }
  }

  return tokens;
}
