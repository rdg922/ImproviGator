"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { Note as TonalNote } from "tonal";
import { useJamSession } from "../context/jam-session-context";
import {
  STANDARD_GUITAR_TUNING_MIDI,
  GUITAR_FRET_RANGE,
  getScalePitchClasses,
  pitchClassFromMidi,
} from "~/lib/music/scale-utils";

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

export default function ScaleDiagram() {
  const { key, modality } = useJamSession();
  const [selectedFrets, setSelectedFrets] = useState<number[]>(() =>
    STANDARD_GUITAR_TUNING_MIDI.map(() => 0),
  );

  const { rootPitchClass, scalePitchClasses } = useMemo(
    () => getScalePitchClasses(key, modality),
    [key, modality],
  );

  const renderFinger = useMemo(() => {
    const renderFingerInternal = (stringIndex: number, fret: number) => {
      const openPitch = STANDARD_GUITAR_TUNING_MIDI[stringIndex] ?? 0;
      const midiNote = openPitch + fret;
      const chroma = pitchClassFromMidi(midiNote);
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
    <div className="flex h-full flex-col border-4 border-black bg-white">
      <div className="border-b-4 border-black bg-lime-200 px-4 py-2 text-sm font-black tracking-wide uppercase">
        Scale Guide — {key} {modality}
      </div>
      <div className="flex flex-1">
        <Guitar
          className="scale-guide-board flex-1 text-[0.6rem]"
          strings={selectedFrets}
          onChange={setSelectedFrets}
          frets={GUITAR_FRET_RANGE}
          renderFinger={renderFinger}
        />
      </div>
    </div>
  );
}
