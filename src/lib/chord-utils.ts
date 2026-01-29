import { Chord as TonalChord } from "tonal";
import guitarDb from "~/app/_components/chords-db/lib/guitar.json";

export const GUITAR_INSTRUMENT = {
  strings: 6,
  fretsOnChord: 4,
  name: "Guitar",
  keys: [],
  tunings: {
    standard: ["E", "A", "D", "G", "B", "E"],
  },
};

export type ChordPosition = {
  frets: number[];
  fingers?: number[];
  barres?: number[];
  capo?: boolean;
  baseFret?: number;
  midi?: number[];
};

type GuitarDb = {
  chords: Record<
    string,
    Array<{ key: string; suffix: string; positions: ChordPosition[] }>
  >;
  suffixes: string[];
};

const CHORD_DB = guitarDb as GuitarDb;

export const normalizeDbKey = (key: string) => {
  const normalized = key.trim();

  if (CHORD_DB.chords[normalized]) {
    return normalized;
  }

  const flatToSharp: Record<string, string> = {
    Db: "C#",
    Eb: "D#",
    Gb: "F#",
    Ab: "G#",
    Bb: "A#",
  };

  const sharpToFlat: Record<string, string> = {
    "C#": "Db",
    "D#": "Eb",
    "F#": "Gb",
    "G#": "Ab",
    "A#": "Bb",
  };

  const sharpKey = flatToSharp[normalized] ?? normalized;
  if (CHORD_DB.chords[sharpKey]) {
    return sharpKey;
  }

  const flatKey = sharpToFlat[normalized] ?? normalized;
  if (CHORD_DB.chords[flatKey]) {
    return flatKey;
  }

  return normalized;
};

const mapSuffixToDb = (suffix: string) => {
  const normalized = suffix.replace(/\s+/g, "").trim();
  const lower = normalized.toLowerCase();

  if (!lower) return "major";

  const mappings: Record<string, string> = {
    maj: "major",
    major: "major",
    m: "minor",
    min: "minor",
    minor: "minor",
    "-": "minor",
    "^": "major",
    maj7: "maj7",
    ma7: "maj7",
    "^7": "maj7",
    m7: "m7",
    min7: "m7",
    "-7": "m7",
    dim: "dim",
    dim7: "dim7",
    o: "dim",
    o7: "dim7",
    m7b5: "m7b5",
    ø: "m7b5",
    "^9": "maj9",
    m9: "m9",
    min9: "m9",
    "-9": "m9",
    "-11": "m11",
    "-13": "m13",
    "7alt": "alt",
    "7b13": "aug7",
    "7#5": "aug7",
    "#5": "aug",
    b13: "aug",
  };

  return mappings[lower] ?? normalized;
};

const parseChordParts = (chordName: string) => {
  const chordInfo = TonalChord.get(chordName);
  const symbol = chordInfo.empty ? chordName : chordInfo.symbol || chordName;
  const match = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/i.exec(
    symbol.trim(),
  );
  if (!match) return null;

  const root = match[1];
  if (!root) return null;

  return {
    root,
    suffix: match[2] ?? "",
    bass: match[3],
  };
};

export const getChordVoicings = (chordName: string): ChordPosition[] => {
  const parts = parseChordParts(chordName);
  if (!parts) return [];

  const dbKey = normalizeDbKey(parts.root);
  const baseSuffix = mapSuffixToDb(parts.suffix);
  const suffixWithBass = parts.bass
    ? baseSuffix === "major"
      ? `/${parts.bass}`
      : baseSuffix === "minor"
        ? `m/${parts.bass}`
        : `${baseSuffix}/${parts.bass}`
    : baseSuffix;

  const chordEntries = CHORD_DB.chords[dbKey] ?? [];
  const entry = chordEntries.find((item) => item.suffix === suffixWithBass);
  return entry?.positions ?? [];
};

export const getChordData = (chordName: string, voicingIndex: number) => {
  const voicings = getChordVoicings(chordName);
  if (voicings.length === 0) {
    return {
      frets: [-1, -1, -1, -1, -1, -1],
      fingers: [0, 0, 0, 0, 0, 0],
      barres: [],
      capo: false,
      baseFret: 1,
    };
  }
  const selectedVoicing =
    voicings[Math.min(Math.max(voicingIndex, 0), voicings.length - 1)];
  return selectedVoicing ?? voicings[0]!;
};
