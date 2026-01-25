"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useJamSession } from "../context/jam-session-context";

const SLIDER_MIN = 0;
const SLIDER_MAX = 2;
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
  const { strudelCode, setStrudelCode, tracks, setTrackGain, strudelRef } =
    useJamSession();
  const [mode, setMode] = useState<PanelMode>("volume");
  const [localCode, setLocalCode] = useState(strudelCode);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);
  const codeRef = useRef<HTMLDivElement | null>(null);

  const toggleMode = () => {
    setMode((current) => (current === "volume" ? "code" : "volume"));
    if (mode === "volume") {
      // Entering code mode, sync local with context
      setLocalCode(strudelCode);
    }
  };

  const handleApplyCode = async () => {
    setStrudelCode(localCode);

    // Update the playing Strudel instance if it exists
    if (strudelRef.current) {
      try {
        await strudelRef.current.setCode?.(localCode);
        await strudelRef.current.evaluate();
      } catch (err) {
        console.error("Error updating Strudel code:", err);
      }
    }
  };

  useLayoutEffect(() => {
    if (!panelRef.current) {
      return;
    }

    const context = gsap.context(() => {
      gsap.set("[data-anim='card']", { y: 8, opacity: 0 });

      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
      intro
        .from(panelRef.current, {
          opacity: 0,
          y: 18,
          duration: 0.5,
        })
        .from(
          headerRef.current,
          {
            opacity: 0,
            y: -12,
            duration: 0.4,
          },
          "<0.05",
        )
        .to("[data-anim='card']", {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.06,
        });
    }, panelRef);

    return () => context.revert();
  }, [tracks.length]);

  useLayoutEffect(() => {
    if (!panelRef.current) {
      return;
    }

    const context = gsap.context(() => {
      if (mode === "volume" && volumeRef.current) {
        gsap.fromTo(
          volumeRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
        );
      }

      if (mode === "code" && codeRef.current) {
        gsap.fromTo(
          codeRef.current,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
        );
      }
    }, panelRef);

    return () => context.revert();
  }, [mode]);

  return (
    <div ref={panelRef} className="flex h-full flex-col p-4">
      <div ref={headerRef} className="mb-4 flex items-center justify-between">
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
        <div ref={volumeRef} className="flex-1 space-y-4 overflow-y-auto">
          {tracks.length > 0 ? (
            tracks.map((track) => {
              const normalizedGain = clampGain(track.gain);
              return (
                <div
                  key={track.instrument}
                  data-anim="card"
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
                    defaultValue={normalizedGain}
                    key={`${track.instrument}-${normalizedGain}`}
                    onInput={(event) =>
                      setTrackGain(
                        track.instrument,
                        Number((event.target as HTMLInputElement).value),
                      )
                    }
                    className="w-full accent-purple-500"
                  />
                </div>
              );
            })
          ) : (
            <div
              data-anim="card"
              className="border-4 border-dashed border-black bg-gray-50 px-4 py-6 text-center text-sm font-semibold tracking-wide text-gray-500 uppercase"
            >
              Add some instruments to your Strudel code to unlock volume
              controls.
            </div>
          )}
        </div>
      ) : (
        <div ref={codeRef} className="flex h-full flex-col gap-3">
          <textarea
            value={localCode}
            onChange={(e) => setLocalCode(e.target.value)}
            placeholder="// Edit Strudel code here..."
            className="flex-1 border-4 border-black bg-gray-50 px-4 py-3 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:ring-0 focus:outline-none"
          />
          <button
            onClick={handleApplyCode}
            className="w-full border-4 border-black bg-orange-400 px-6 py-3 text-lg font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
          >
            Apply & Play
          </button>
        </div>
      )}
    </div>
  );
}
