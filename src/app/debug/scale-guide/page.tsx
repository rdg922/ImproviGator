"use client";

import { useMemo } from "react";
import ScaleDiagram from "~/app/jam/_components/visuals/scale-diagram";
import {
  JamSessionProvider,
  useJamSession,
} from "~/app/jam/_components/context/jam-session-context";

const KEY_OPTIONS = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const MODALITY_OPTIONS = [
  "Major",
  "Minor",
  "Dorian",
  "Phrygian",
  "Lydian",
  "Mixolydian",
  "Aeolian",
  "Locrian",
];

function ScaleGuideDebugPanel() {
  const { key, setKey, modality, setModality } = useJamSession();
  const scaleLabel = useMemo(
    () => `${key} ${modality}`.trim(),
    [key, modality],
  );

  return (
    <section className="flex flex-col gap-4 rounded-xl border-4 border-black bg-white p-4 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
      <header>
        <p className="text-xs font-black tracking-[0.35em] text-gray-500 uppercase">
          debug panel
        </p>
        <h2 className="text-2xl font-black">Scale Guide Controls</h2>
        <p className="text-sm font-semibold text-gray-600">
          Current scale: <span className="font-black">{scaleLabel}</span>
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-bold tracking-wide uppercase">
          Key
          <select
            value={key}
            onChange={(event) => setKey(event.target.value)}
            className="border-4 border-black bg-yellow-200 px-3 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            {KEY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm font-bold tracking-wide uppercase">
          Modality
          <select
            value={modality}
            onChange={(event) => setModality(event.target.value)}
            className="border-4 border-black bg-lime-200 px-3 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            {MODALITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-3 text-sm font-semibold text-gray-600">
        <p>
          Tip: This page mirrors the jam room scale guide styling. Use the
          controls to verify note labeling, fretboard highlights, and modality
          changes without affecting other jam components.
        </p>
      </div>
    </section>
  );
}

export default function ScaleGuideDebugPage() {
  return (
    <JamSessionProvider>
      <main className="min-h-screen bg-gradient-to-br from-pink-100 via-amber-100 to-cyan-100 p-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="w-full">
            <div className="rotate-[0.4deg] overflow-hidden border-4 border-black bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
              <ScaleDiagram />
            </div>
          </div>
          <div className="w-full">
            <ScaleGuideDebugPanel />
          </div>
        </div>
      </main>
    </JamSessionProvider>
  );
}
