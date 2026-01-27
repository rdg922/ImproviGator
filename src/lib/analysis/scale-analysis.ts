import type { Note } from "./pitch-detection";
import { NOTE_NAMES, SCALES } from "~/lib/music/theory";

export { NOTE_NAMES, SCALES };

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
