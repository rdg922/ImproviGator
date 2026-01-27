import { Note as TonalNote, Scale } from "tonal";
import { normalizeScaleName } from "~/lib/music/theory";

export const STANDARD_GUITAR_TUNING_MIDI = [64, 59, 55, 50, 45, 40]; // High E to Low E
export const GUITAR_FRET_RANGE = { from: 0, amount: 12 } as const;

export const pitchClassFromMidi = (midi: number) => ((midi % 12) + 12) % 12;

export function normalizeModality(modality: string) {
  return normalizeScaleName(modality);
}

export function getScalePitchClasses(key: string, modality: string) {
  const rootPitchClass = (() => {
    const chroma = TonalNote.chroma(key);
    return typeof chroma === "number" ? chroma : 0;
  })();

  const scaleQuery = `${key} ${normalizeModality(modality)}`.trim();
  const tonalScale = Scale.get(scaleQuery);

  const scalePitchClasses = tonalScale.notes.length
    ? new Set(
        tonalScale.notes
          .map((noteName) => TonalNote.chroma(noteName))
          .filter((value): value is number => typeof value === "number"),
      )
    : new Set([rootPitchClass]);

  return { rootPitchClass, scalePitchClasses };
}

export function getScalePitchClassSet(key: string, modality: string) {
  const scaleQuery = `${key} ${normalizeModality(modality)}`.trim();
  const tonalScale = Scale.get(scaleQuery);
  if (!tonalScale.notes.length) {
    return new Set<string>();
  }

  return new Set(
    tonalScale.notes
      .map((noteName) => TonalNote.pitchClass(noteName))
      .filter((value): value is string => Boolean(value)),
  );
}
