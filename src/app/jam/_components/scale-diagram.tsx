"use client";

import { useMemo, useState } from "react";
import Guitar from "react-guitar";
import { Note as TonalNote, Scale } from "tonal";
import { useJamSession } from "./jam-session-context";

const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];
const FRET_RANGE = { from: 0, amount: 12 } as const;
const MODALITY_TO_SCALE: Record<string, string> = {
  Major: "major",
  Minor: "minor",
  Dorian: "dorian",
  Phrygian: "phrygian",
  Lydian: "lydian",
  Mixolydian: "mixolydian",
  Aeolian: "aeolian",
  Locrian: "locrian",
};

const pitchClass = (midi: number) => ((midi % 12) + 12) % 12;

export default function ScaleDiagram() {
  const { key, modality } = useJamSession();
  const [selectedFrets, setSelectedFrets] = useState<number[]>(() =>
    STANDARD_TUNING.map(() => 0),
  );

  const rootPitchClass = useMemo(() => {
    const chroma = TonalNote.chroma(key);
    return typeof chroma === "number" ? chroma : 0;
  }, [key]);

  const scalePitchClasses = useMemo(() => {
    const tonalModality = MODALITY_TO_SCALE[modality] ?? modality.toLowerCase();
    const scaleQuery = `${key} ${tonalModality}`.trim();
    const tonalScale = Scale.get(scaleQuery);
    if (!tonalScale.notes.length) {
      return new Set([rootPitchClass]);
    }
    return new Set(
      tonalScale.notes
        .map((noteName) => TonalNote.chroma(noteName))
        .filter((value): value is number => typeof value === "number"),
    );
  }, [key, modality, rootPitchClass]);

  const renderFinger = useMemo(
    () => (stringIndex: number, fret: number) => {
      const midiNote = STANDARD_TUNING[stringIndex] + fret;
      const chroma = pitchClass(midiNote);
      if (!scalePitchClasses.has(chroma)) {
        return null;
      }

      const noteName = TonalNote.pitchClass(TonalNote.fromMidi(midiNote) ?? "");
      const label = noteName ?? "";
      const isRoot = chroma === rootPitchClass;

      return (
        <span
          className={`scale-guide-note ${
            isRoot ? "scale-guide-note--root" : "scale-guide-note--degree"
          }`}
          aria-label={
            label ? `${label} ${isRoot ? "root" : "scale tone"}` : undefined
          }
        >
          {label}
        </span>
      );
    },
    [rootPitchClass, scalePitchClasses],
  );

  return (
    <div className="flex h-full flex-col border-4 border-black bg-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      <h2 className="text-xl font-black">
        Scale Guide - {key} {modality}
      </h2>

      <Guitar
        className="scale-guide-board flex-1 text-[0.5rem]"
        strings={selectedFrets}
        onChange={setSelectedFrets}
        frets={FRET_RANGE}
        renderFinger={renderFinger}
      />
    </div>
  );
}
