"use client";

import { useState } from "react";
import { useJamSession } from "./jam-session-context";

const SLIDER_MIN = 1;
const SLIDER_MAX = 5;
const SLIDER_STEP = 0.1;

type PanelMode = "volume" | "code";

const clampGain = (value: number) =>
  Math.min(
    SLIDER_MAX,
    Math.max(SLIDER_MIN, Number.isFinite(value) ? value : 1),
  );

const formatInstrumentLabel = (instrument: string) => {
  const colonIndex = instrument.indexOf(":");
  if (colonIndex === -1) {
    return instrument;
  }
  return instrument.slice(0, colonIndex).trim();
};

export default function TrackSettingsPanel() {
  const { strudelCode, setStrudelCode, tracks, setTrackGain } = useJamSession();
  const [mode, setMode] = useState<PanelMode>("volume");

  const toggleMode = () => {
    setMode((current) => (current === "volume" ? "code" : "volume"));
  };

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-4 flex items-center justify-between">
        <label className="text-sm font-bold tracking-wide uppercase">
          Track Settings
        </label>
        <button
          onClick={toggleMode}
          className="border-4 border-black bg-purple-300 px-4 py-2 text-xs font-black tracking-wide uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
        >
          {mode === "volume" ? "Advanced" : "Back"}
        </button>
      </div>

      {mode === "volume" ? (
        <div className="flex-1 space-y-4 overflow-y-auto">
          {tracks.length ? (
            tracks.map((track) => {
              const normalizedGain = clampGain(track.gain);
              return (
                <div
                  key={track.instrument}
                  className="border-4 border-black bg-white px-4 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="mb-2 flex items-center justify-between text-xs font-bold tracking-wide uppercase">
                    <span>{formatInstrumentLabel(track.instrument)}</span>
                    <span>{normalizedGain.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min={SLIDER_MIN}
                    max={SLIDER_MAX}
                    step={SLIDER_STEP}
                    value={normalizedGain}
                    onChange={(event) =>
                      setTrackGain(track.instrument, Number(event.target.value))
                    }
                    className="w-full accent-purple-500"
                  />
                </div>
              );
            })
          ) : (
            <div className="border-4 border-dashed border-black bg-gray-50 px-4 py-6 text-center text-sm font-semibold tracking-wide text-gray-500 uppercase">
              Add some instruments to your Strudel code to unlock volume
              controls.
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={strudelCode}
          onChange={(event) => setStrudelCode(event.target.value)}
          placeholder="// Strudel code"
          className="flex-1 border-4 border-black bg-gray-50 px-4 py-3 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:ring-0 focus:outline-none"
        ></textarea>
      )}
    </div>
  );
}
