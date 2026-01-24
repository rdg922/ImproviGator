import { Note } from "tonal";

/**
 * Converts a note name to its flat enharmonic equivalent when applicable.
 * C# -> Db, D# -> Eb, F# -> Gb, G# -> Ab, A# -> Bb
 * Natural notes (C, D, E, F, G, A, B) remain unchanged.
 */
export function toFlat(noteName: string): string {
  // Get the simplified note from Tonal (handles various formats)
  const note = Note.simplify(noteName);
  if (!note) return noteName;

  // Define the preferred flat enharmonic equivalents for sharp notes
  const sharpToFlat: Record<string, string> = {
    "C#": "Db",
    "D#": "Eb",
    "F#": "Gb",
    "G#": "Ab",
    "A#": "Bb",
  };

  // Get the pitch class (note without octave)
  const pitchClass = Note.pitchClass(note);
  
  // If it's a sharp note, convert to flat
  if (pitchClass && sharpToFlat[pitchClass]) {
    // Preserve octave if present
    const octave = Note.octave(note);
    const flatNote = sharpToFlat[pitchClass];
    return octave !== null ? `${flatNote}${octave}` : flatNote ?? pitchClass;
  }

  return note;
}

/**
 * Converts a chord name to use flat notation for the root note
 * Example: "C#maj7" -> "Dbmaj7", "F#m" -> "Gbm"
 */
export function chordToFlat(chordName: string): string {
  // Match the root note (with optional sharp/flat) at the start
  const match = /^([A-G][#b]?)(.*)$/.exec(chordName);
  if (!match) return chordName;

  const root = match[1];
  const suffix = match[2];
  
  if (!root || !suffix) return chordName;

  const flatRoot = toFlat(root);
  return `${flatRoot}${suffix}`;
}
