"use client";

import { useMemo } from "react";
import { useJamSession } from "../jam-session-context";

type RightPanelGridProps = {
  highlightedIndex: number;
};

type ChordSlice = {
  label?: string;
  chord?: string;
  description?: string;
};

const FALLBACK_CHORDS: ChordSlice[] = [
  { label: "I", chord: "Cmaj7" },
  { label: "ii", chord: "Dm7" },
  { label: "V", chord: "G7" },
  { label: "I", chord: "Cmaj7" },
];

const extractSlices = (timeline: unknown): ChordSlice[] => {
  if (!timeline || typeof timeline !== "object") {
    return FALLBACK_CHORDS;
  }

  const castedTimeline = timeline as {
    getSlices?: () => Array<ChordSlice | undefined>;
  };

  if (typeof castedTimeline.getSlices === "function") {
    const slices = castedTimeline.getSlices();
    if (Array.isArray(slices) && slices.length) {
      return slices.filter(Boolean) as ChordSlice[];
    }
  }

  return FALLBACK_CHORDS;
};

export default function RightPanelGrid({
  highlightedIndex,
}: RightPanelGridProps) {
  const { chordTimeline } = useJamSession();

  const chordSlices = useMemo(
    () => extractSlices(chordTimeline),
    [chordTimeline],
  );

  return (
    <div className="mb-6 flex-1 overflow-y-auto rounded-xl border-4 border-black bg-gradient-to-b from-white to-emerald-100 p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase">
            Chord Grid
          </p>
          <h2 className="text-2xl font-black tracking-wide">
            Backing Track Map
          </h2>
        </div>
        <span className="rounded-full border-4 border-black bg-yellow-200 px-4 py-1 text-xs font-black tracking-wide uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          Highlight #{(highlightedIndex % chordSlices.length) + 1}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {chordSlices.map((slice, index) => {
          const isActive = index === highlightedIndex % chordSlices.length;
          return (
            <div
              key={`${slice.label ?? "slice"}-${index}`}
              className={`rounded-lg border-4 border-black p-4 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform ${
                isActive ? "translate-y-[-4px] bg-orange-300" : "bg-white"
              }`}
            >
              <p className="text-xs font-bold tracking-wide text-gray-500 uppercase">
                {slice.label ?? `Chord ${index + 1}`}
              </p>
              <p className="text-xl font-black">{slice.chord ?? "—"}</p>
              {slice.description && (
                <p className="text-xs text-gray-600">{slice.description}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
