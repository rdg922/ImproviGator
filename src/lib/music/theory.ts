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
] as const;

export const SCALE_NAMES = [
  "Major",
  "Minor",
  "Natural Minor",
  "Harmonic Minor",
  "Melodic Minor",
  "Dorian",
  "Phrygian",
  "Lydian",
  "Mixolydian",
  "Aeolian",
  "Locrian",
  "Chromatic",
] as const;

export const SCALE_TONAL_LOOKUP: Record<string, string> = {
  Major: "major",
  Minor: "minor",
  "Natural Minor": "natural minor",
  "Harmonic Minor": "harmonic minor",
  "Melodic Minor": "melodic minor",
  Dorian: "dorian",
  Phrygian: "phrygian",
  Lydian: "lydian",
  Mixolydian: "mixolydian",
  Aeolian: "aeolian",
  Locrian: "locrian",
  Chromatic: "chromatic",
};

export const SCALES: Record<string, number[]> = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  "Natural Minor": [0, 2, 3, 5, 7, 8, 10],
  "Harmonic Minor": [0, 2, 3, 5, 7, 8, 11],
  "Melodic Minor": [0, 2, 3, 5, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Mixolydian: [0, 2, 4, 5, 7, 9, 10],
  Aeolian: [0, 2, 3, 5, 7, 8, 10],
  Locrian: [0, 1, 3, 5, 6, 8, 10],
  Chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
};

export const normalizeScaleName = (name: string) =>
  SCALE_TONAL_LOOKUP[name] ?? name.toLowerCase();
