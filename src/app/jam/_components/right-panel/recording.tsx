"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useJamSession } from "../jam-session-context";

const formatDuration = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

interface RightPanelRecordingProps {
  resetToken?: number;
}

export default function RightPanelRecording({ resetToken }: RightPanelRecordingProps) {
  const { recording, midiData, analysisResult, analysisStatus } =
    useJamSession();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);

  const stats = useMemo(() => {
    if (!recording) {
      return null;
    }

    const totalNotes = recording.notes.length;
    const avgVelocity =
      totalNotes > 0
        ? Math.round(
            recording.notes.reduce((sum, note) => sum + note.velocity, 0) /
              totalNotes,
          )
        : 0;

    return {
      totalNotes,
      avgVelocity,
      durationLabel: formatDuration(recording.duration),
    };
  }, [recording]);

  const notes = useMemo(
    () => (midiData.length ? midiData : recording?.notes ?? []),
    [midiData, recording],
  );

  const totalDurationMs = useMemo(() => {
    if (!recording) return 0;
    const maxEnd = notes.reduce(
      (max, note) => Math.max(max, note.startTime + note.duration),
      0,
    );
    return Math.max(recording.duration, maxEnd);
  }, [recording, notes]);

  const pixelsPerMs = 0.15;
  const timelineWidth = Math.max(
    viewportWidth,
    Math.ceil(totalDurationMs * pixelsPerMs),
  );
  const maxScroll = Math.max(0, timelineWidth - viewportWidth);
  const currentTimeMs = Math.min(
    totalDurationMs,
    Math.max(0, (scrollLeft + viewportWidth / 2) / pixelsPerMs),
  );

  useEffect(() => {
    const updateViewport = () => {
      if (!scrollRef.current) return;
      setViewportWidth(scrollRef.current.clientWidth);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollLeft = 0;
    setScrollLeft(0);
  }, [resetToken]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleScrub = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = next;
    }
    setScrollLeft(next);
  };

  if (!recording) {
    return (
      <div className="mb-6 flex flex-1 flex-col items-center justify-center rounded-xl border-4 border-black bg-white p-6 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-semibold">No recording captured yet.</p>
        <p className="text-sm text-gray-600">
          Hit the record button to capture your improvisation.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex-1 overflow-y-auto rounded-xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase">Recording</p>
          <h2 className="text-2xl font-black tracking-wide">Take Overview</h2>
        </div>
        <span className="rounded-full border-4 border-black bg-green-200 px-4 py-1 text-xs font-black tracking-wide uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {stats?.durationLabel}
        </span>
      </div>
      <div className="mb-4 rounded-lg border-4 border-black bg-blue-50 p-4">
        <div className="mb-3 flex items-center justify-between text-xs font-bold text-gray-600">
          <span>
            {formatDuration(currentTimeMs)} / {stats?.durationLabel ?? "0s"}
          </span>
          <span>{notes.length} notes</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxScroll}
          value={scrollLeft}
          onChange={handleScrub}
          className="w-full accent-black"
        />
      </div>

      <p className="mb-2 text-xs font-bold text-gray-500 uppercase">
        MIDI Timeline
      </p>
      <div className="relative h-56 overflow-hidden rounded-lg border-4 border-black bg-white">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-red-500" />
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-full overflow-x-auto overflow-y-hidden"
        >
          <div
            className="relative h-full"
            style={{ width: `${timelineWidth}px` }}
          >
            <div className="absolute top-0 h-6 w-full border-b-2 border-black bg-gray-100">
              {Array.from({
                length: Math.ceil(totalDurationMs / 1000) + 1,
              }).map((_, index) => (
                <div
                  key={index}
                  className="absolute top-0 h-full border-r border-gray-300 text-[10px] font-bold text-gray-600"
                  style={{ left: `${index * 1000 * pixelsPerMs}px` }}
                >
                  <span className="ml-1">{index}s</span>
                </div>
              ))}
            </div>
            <div className="absolute inset-x-0 top-8 bottom-0">
              {notes.map((note, index) => (
                <div
                  key={`${note.pitch}-${index}`}
                  className="absolute rounded-md border-2 border-black bg-yellow-200"
                  style={{
                    left: `${note.startTime * pixelsPerMs}px`,
                    width: `${Math.max(6, note.duration * pixelsPerMs)}px`,
                    top: `${(127 - note.pitch) * 1.1}px`,
                    height: "10px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-lg border-4 border-black bg-gray-50 p-4 text-xs">
        <p className="mb-2 text-xs font-bold uppercase text-gray-600">
          Debug: Take Overview Inputs
        </p>
        <div className="space-y-3 font-mono">
          <div>
            <p className="mb-1 font-bold">analysisStatus</p>
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(analysisStatus, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-bold">analysisResult</p>
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(analysisResult, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-bold">recording</p>
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(recording, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-bold">midiData</p>
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(midiData, null, 2)}
            </pre>
          </div>
          <div>
            <p className="mb-1 font-bold">derivedStats</p>
            <pre className="whitespace-pre-wrap break-words">
              {JSON.stringify(
                {
                  totalDurationMs,
                  timelineWidth,
                  pixelsPerMs,
                  maxScroll,
                  currentTimeMs,
                  notesCount: notes.length,
                },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
