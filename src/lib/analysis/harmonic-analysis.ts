import { Chord, Note, Scale } from "tonal";
import guitarDb from "~/app/_components/chords-db/lib/guitar.json";
import { normalizeScaleName } from "~/lib/music/theory";
import type { Note as PitchNote } from "./pitch-detection";
import {
  analyzeMelodicContour,
  getIntervalDistribution,
  type MelodicContourAnalysis,
} from "./melodic-contour";

export interface MidiNoteEvent {
  pitch: number;
  velocity: number;
  startTime: number;
  duration: number;
}

export interface ParsedChordToken {
  chord: string | string[];
  index: number;
}

export interface ChordTimelineSlot {
  chords: string[];
  startTimeSeconds: number;
  endTimeSeconds: number;
  index: number;
}

export interface NoteHarmonicContext {
  note: MidiNoteEvent;
  pitchClass: string;
  chordSlotIndex: number;
  chordNames: string[];
  isChordTone: boolean;
  isScaleTone: boolean;
  isStrongBeat: boolean;
  beatIndex: number;
  beatInBar: number;
}

export interface HarmonicAnalysisMetrics {
  totalNotes: number;
  chordToneNotes: number;
  scaleToneNotes: number;
  strongBeatNotes: number;
  strongBeatChordTones: number;
  chordToneRatio: number;
  scaleToneRatio: number;
  strongBeatChordToneRatio: number;
  outsideScaleRatio: number;
}

export interface ChordSummaryMetrics {
  chord: string;
  totalNotes: number;
  chordToneNotes: number;
  chordToneRatio: number;
}

export interface HarmonicAnalysisResult {
  metrics: HarmonicAnalysisMetrics;
  perChord: ChordSummaryMetrics[];
  melodicContour: MelodicContourAnalysis;
  intervalDistribution: Record<string, number>;
  noteContexts: NoteHarmonicContext[];
}

type ChordPosition = {
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

const normalizeDbKey = (key: string) =>
  key.includes("#") ? key.replace("#", "sharp") : key;

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
    "-9": "m9",
    "-11": "m11",
    "-13": "m13",
    "7alt": "alt",
    "7#5": "aug7",
    "7b13": "aug7",
    "#5": "aug",
    b13: "aug",
  };

  return mappings[lower] ?? normalized;
};

const parseChordParts = (chordName: string) => {
  const chordInfo = Chord.get(chordName);
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

const getChordVoicingPitchClasses = (chordName: string): string[] => {
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
  const midiValues = entry?.positions?.[0]?.midi ?? [];

  return midiValues
    .map((midi) => Note.pitchClass(Note.fromMidi(midi)))
    .filter((value): value is string => Boolean(value));
};

const getChordTonePitchClasses = (chordName: string): string[] => {
  const tonalChord = Chord.get(chordName);
  const tonalPitchClasses = tonalChord.notes
    .map((note) => Note.pitchClass(note))
    .filter((value): value is string => Boolean(value));
  const voicingPitchClasses = getChordVoicingPitchClasses(chordName);

  return Array.from(new Set([...tonalPitchClasses, ...voicingPitchClasses]));
};

const getScalePitchClasses = (key: string, modality: string): string[] => {
  const scaleName = normalizeScaleName(modality);
  const scale = Scale.get(`${key} ${scaleName}`);
  return scale.notes
    .map((note) => Note.pitchClass(note))
    .filter((value): value is string => Boolean(value));
};

const getTotalDurationSeconds = (notes: MidiNoteEvent[]): number => {
  if (notes.length === 0) return 0;
  return (
    notes.reduce(
      (max, note) => Math.max(max, note.startTime + note.duration),
      0,
    ) / 1000
  );
};

export const buildChordTimeline = (
  parsedChords: ParsedChordToken[],
  totalDurationSeconds: number,
): ChordTimelineSlot[] => {
  if (parsedChords.length === 0 || totalDurationSeconds === 0) return [];

  const slotDuration = totalDurationSeconds / parsedChords.length;

  return parsedChords.map((token, index) => {
    const chords = Array.isArray(token.chord) ? token.chord : [token.chord];

    return {
      chords: chords.filter(Boolean),
      startTimeSeconds: index * slotDuration,
      endTimeSeconds: (index + 1) * slotDuration,
      index,
    };
  });
};

const getBeatInfo = (
  timeSeconds: number,
  tempo: number,
  timeSignature: string,
) => {
  const beatsPerBar = Number(timeSignature.split("/")[0]) || 4;
  const beatDuration = 60 / tempo;
  const beatIndex = Math.floor(timeSeconds / beatDuration);
  const beatInBar = beatIndex % beatsPerBar;
  const isStrongBeat = beatInBar === 0 || (beatsPerBar >= 4 && beatInBar === 2);

  return { beatIndex, beatInBar, isStrongBeat };
};

const toPitchNote = (note: MidiNoteEvent): PitchNote => ({
  startTimeSeconds: note.startTime / 1000,
  durationSeconds: note.duration / 1000,
  pitchMidi: note.pitch,
  amplitude: Math.max(0, Math.min(note.velocity / 127, 1)),
});

export const analyzeHarmonicContext = (input: {
  midiData: MidiNoteEvent[];
  parsedChords: ParsedChordToken[];
  tempo: number;
  timeSignature: string;
  key: string;
  modality: string;
}): HarmonicAnalysisResult => {
  const { midiData, parsedChords, tempo, timeSignature, key, modality } = input;
  const totalDurationSeconds = getTotalDurationSeconds(midiData);
  const chordTimeline = buildChordTimeline(parsedChords, totalDurationSeconds);
  const scalePitchClasses = getScalePitchClasses(key, modality);

  const chordToneCache = new Map<string, string[]>();
  const getChordTones = (chordName: string) => {
    const cached = chordToneCache.get(chordName);
    if (cached) return cached;
    const tones = getChordTonePitchClasses(chordName);
    chordToneCache.set(chordName, tones);
    return tones;
  };

  const noteContexts: NoteHarmonicContext[] = midiData.map((note) => {
    const timeSeconds = note.startTime / 1000;
    const pitchClass = Note.pitchClass(Note.fromMidi(note.pitch)) ?? "";

    const slot =
      chordTimeline.find(
        (slotItem) =>
          timeSeconds >= slotItem.startTimeSeconds &&
          timeSeconds < slotItem.endTimeSeconds,
      ) ?? chordTimeline[chordTimeline.length - 1];

    const chordNames = slot?.chords ?? [];
    const chordPitchClasses = chordNames.flatMap((name) => getChordTones(name));

    const { beatIndex, beatInBar, isStrongBeat } = getBeatInfo(
      timeSeconds,
      tempo,
      timeSignature,
    );

    const isChordTone =
      pitchClass.length > 0 && chordPitchClasses.includes(pitchClass);
    const isScaleTone =
      pitchClass.length > 0 && scalePitchClasses.includes(pitchClass);

    return {
      note,
      pitchClass,
      chordSlotIndex: slot?.index ?? 0,
      chordNames,
      isChordTone,
      isScaleTone,
      isStrongBeat,
      beatIndex,
      beatInBar,
    };
  });

  const totalNotes = noteContexts.length;
  const chordToneNotes = noteContexts.filter((ctx) => ctx.isChordTone).length;
  const scaleToneNotes = noteContexts.filter((ctx) => ctx.isScaleTone).length;
  const strongBeatNotes = noteContexts.filter((ctx) => ctx.isStrongBeat).length;
  const strongBeatChordTones = noteContexts.filter(
    (ctx) => ctx.isStrongBeat && ctx.isChordTone,
  ).length;

  const metrics: HarmonicAnalysisMetrics = {
    totalNotes,
    chordToneNotes,
    scaleToneNotes,
    strongBeatNotes,
    strongBeatChordTones,
    chordToneRatio: totalNotes > 0 ? chordToneNotes / totalNotes : 0,
    scaleToneRatio: totalNotes > 0 ? scaleToneNotes / totalNotes : 0,
    strongBeatChordToneRatio:
      strongBeatNotes > 0 ? strongBeatChordTones / strongBeatNotes : 0,
    outsideScaleRatio:
      totalNotes > 0 ? (totalNotes - scaleToneNotes) / totalNotes : 0,
  };

  const perChordMap = new Map<string, { total: number; chordTones: number }>();

  noteContexts.forEach((context) => {
    const label = context.chordNames.join("/") || "Unknown";
    const entry = perChordMap.get(label) ?? { total: 0, chordTones: 0 };
    entry.total += 1;
    if (context.isChordTone) {
      entry.chordTones += 1;
    }
    perChordMap.set(label, entry);
  });

  const perChord: ChordSummaryMetrics[] = Array.from(perChordMap.entries()).map(
    ([chord, values]) => ({
      chord,
      totalNotes: values.total,
      chordToneNotes: values.chordTones,
      chordToneRatio: values.total > 0 ? values.chordTones / values.total : 0,
    }),
  );

  const pitchNotes = midiData.map((note) => toPitchNote(note));
  const melodicContour = analyzeMelodicContour(pitchNotes);
  const intervalDistribution = getIntervalDistribution(pitchNotes);

  return {
    metrics,
    perChord,
    melodicContour,
    intervalDistribution,
    noteContexts,
  };
};

export const buildChordToneRecommendation = (chordName: string) => {
  const chordInfo = Chord.get(chordName);
  const chordTones = getChordTonePitchClasses(chordName);

  return {
    chord: chordName,
    chordTones,
    quality: chordInfo.quality,
    symbol: chordInfo.symbol || chordName,
  };
};

export const buildChordScaleRecommendation = (
  chordName: string,
  key: string,
  modality: string,
) => {
  const chordInfo = Chord.get(chordName);
  const root = chordInfo.tonic ?? key;
  const quality = chordInfo.quality?.toLowerCase() ?? "";
  const symbol = chordInfo.symbol || chordName;

  let scaleName = "major";

  if (symbol.toLowerCase().includes("maj7") || quality === "major") {
    scaleName = "major";
  } else if (
    symbol.toLowerCase().includes("m7b5") ||
    symbol.toLowerCase().includes("ø")
  ) {
    scaleName = "locrian";
  } else if (quality === "minor") {
    scaleName = "dorian";
  }

  const scalePitchClasses = getScalePitchClasses(root, scaleName).filter(
    Boolean,
  );

  return {
    chord: chordName,
    scale: `${root} ${scaleName}`,
    scalePitchClasses,
    symbol,
  };
};
