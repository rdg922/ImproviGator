"use client";

import { useMemo } from "react";
import { useJamSession } from "../context/jam-session-context";

type RightPanelGridProps = {
  highlightedIndex: number;
};

const FALLBACK_CHORDS: Array<{ chord: string | string[]; index: number }> = [
  { chord: "Cmaj7", index: 0 },
  { chord: "Dm7", index: 1 },
  { chord: "G7", index: 2 },
  { chord: "Cmaj7", index: 3 },
];

export default function RightPanelGrid({
  highlightedIndex,
}: RightPanelGridProps) {
  const { parsedChords } = useJamSession();

  const chordSlices = parsedChords.length > 0 ? parsedChords : FALLBACK_CHORDS;

  return (
    <div className="flex h-full flex-1 overflow-hidden rounded-xl border-4 border-black bg-gradient-to-b from-white to-emerald-100 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="grid h-full w-full auto-rows-fr grid-cols-2 gap-3 p-3 md:grid-cols-4">
        {chordSlices.map((slice, index) => {
          const isActive = index === highlightedIndex % chordSlices.length;
          const isArray = Array.isArray(slice.chord);

          return (
            <div
              key={`chord-${index}`}
              className={`flex flex-col items-center justify-center rounded-lg border-3 border-black p-3 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all ${
                isActive ? "scale-105 bg-orange-300" : "bg-white"
              }`}
            >
              <p className="mb-1 text-xs font-bold tracking-wide text-gray-500 uppercase">
                {index + 1}
              </p>
              {isArray ? (
                <div className="flex flex-col gap-1">
                  {slice.chord.map((c, i) => (
                    <p key={i} className="text-lg font-black">
                      {c}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xl font-black">{slice.chord}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
