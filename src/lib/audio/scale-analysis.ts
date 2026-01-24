import type { Note } from "./pitch-detection";

export const SCALES: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Melodic Minor": [0, 2, 3, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export function getMidiNoteName(midiNumber: number): string {
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteName = NOTE_NAMES[midiNumber % 12];
  return `${noteName}${octave}`;
}

export function isNoteInScale(
  midiNumber: number,
  rootNote: number,
  scaleName: string,
): boolean {
  const scale = SCALES[scaleName];
  if (!scale) return false;

  const noteInOctave = midiNumber % 12;
  const relativeToRoot = (noteInOctave - rootNote + 12) % 12;
  return scale.includes(relativeToRoot);
}

export function getNotesOutsideScale(
  notes: Note[],
  rootNote: number,
  scaleName: string,
): Note[] {
  return notes.filter(
    (note) => !isNoteInScale(note.pitchMidi, rootNote, scaleName),
  );
}

export interface ScaleAnalysis {
  totalNotes: number;
  notesInScale: number;
  notesOutsideScale: number;
  percentageInScale: number;
}

export function analyzeScaleCompliance(
  notes: Note[],
  rootNote: number,
  scaleName: string,
): ScaleAnalysis {
  const totalNotes = notes.length;
  const outsideScale = getNotesOutsideScale(notes, rootNote, scaleName);
  const notesOutsideScale = outsideScale.length;
  const notesInScale = totalNotes - notesOutsideScale;
  const percentageInScale =
    totalNotes > 0 ? (notesInScale / totalNotes) * 100 : 0;

  return {
    totalNotes,
    notesInScale,
    notesOutsideScale,
    percentageInScale,
  };
}
