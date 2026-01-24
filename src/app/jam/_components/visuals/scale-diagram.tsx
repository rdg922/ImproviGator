"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Note as TonalNote, Scale } from "tonal";
import { useJamSession } from "../context/jam-session-context";

interface GuitarProps {
  className?: string;
  strings: number[];
  onChange: (strings: number[]) => void;
  frets: { from: number; amount: number };
  renderFinger?: (stringIndex: number, fret: number) => ReactNode;
}

const Guitar = dynamic<GuitarProps>(
  () => import("react-guitar").then((mod) => mod.default),
  { ssr: false },
);
Guitar.displayName = "Guitar";

const STANDARD_TUNING = [64, 59, 55, 50, 45, 40]; // High E to Low E
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

  const renderFinger = useMemo(() => {
    const renderFingerInternal = (stringIndex: number, fret: number) => {
      const openPitch = STANDARD_TUNING[stringIndex] ?? 0;
      const midiNote = openPitch + fret;
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
    };

    return renderFingerInternal;
  }, [rootPitchClass, scalePitchClasses]);

  return (
    <div className="flex h-full flex-col border-4 border-black bg-white p-3">
      <h2 className="text-xl font-black">
        Scale Guide - {key} {modality}
      </h2>

      <Guitar
        className="scale-guide-board flex-1 text-[0.5rem] border-black border-4"
        strings={selectedFrets}
        onChange={setSelectedFrets}
        frets={FRET_RANGE}
        renderFinger={renderFinger}
      />
    </div>
  );
}
