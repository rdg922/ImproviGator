"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useJamSession } from "../context/jam-session-context";

const formatDuration = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

const FALLBACK_CHORDS: Array<{ chord: string | string[]; index: number }> = [
  { chord: "Cmaj7", index: 0 },
  { chord: "Dm7", index: 1 },
  { chord: "G7", index: 2 },
  { chord: "Cmaj7", index: 3 },
];

const getChordLabel = (slice: { chord: string | string[] }) =>
  Array.isArray(slice.chord) ? slice.chord.join(" / ") : slice.chord;

const hashChord = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const getChordColors = (label: string) => {
  const hue = hashChord(label) % 360;
  return {
    background: `hsla(${hue}, 70%, 85%, 0.35)`,
    divider: `hsla(${hue}, 30%, 35%, 0.35)`,
    label: `hsla(${hue}, 35%, 20%, 0.55)`,
  };
};

interface RightPanelRecordingProps {
  resetToken?: number;
  currentTimeMs?: number;
  isPlaying?: boolean;
}

export default function RightPanelRecording({
  resetToken,
  currentTimeMs = 0,
  isPlaying = false,
}: RightPanelRecordingProps) {
  const {
    recording,
    midiData,
    analysisResult,
    analysisStatus,
    parsedChords,
    tempo,
    timeSignature,
  } = useJamSession();
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
    () => (midiData.length ? midiData : (recording?.notes ?? [])),
    [midiData, recording],
  );

  const noteRange = useMemo(() => {
    if (notes.length === 0) {
      return { min: 60, max: 72 }; // Default to one octave around middle C
    }
    const pitches = notes.map((note) => note.pitch);
    const min = Math.min(...pitches);
    const max = Math.max(...pitches);
    const padding = 2; // Add 2 notes of padding on each side
    return {
      min: Math.max(0, min - padding),
      max: Math.min(127, max + padding),
    };
  }, [notes]);

  const chordSlices = useMemo(
    () => (parsedChords.length > 0 ? parsedChords : FALLBACK_CHORDS),
    [parsedChords],
  );

  const beatsPerBar = useMemo(() => {
    const numerator = Number(timeSignature.split("/")[0]);
    return Number.isFinite(numerator) && numerator > 0 ? numerator : 4;
  }, [timeSignature]);

  const beatDurationMs = useMemo(() => {
    if (!Number.isFinite(tempo) || tempo <= 0) return 500;
    return Math.max(200, Math.round((60 / tempo) * 1000));
  }, [tempo]);

  const totalDurationMs = useMemo(() => {
    if (!recording) return 0;
    const maxEnd = notes.reduce(
      (max, note) => Math.max(max, note.startTime + note.duration),
      0,
    );
    return Math.max(recording.duration, maxEnd);
  }, [recording, notes]);

  const chordDurationMs = useMemo(
    () => Math.max(1, Math.round(beatsPerBar * beatDurationMs)),
    [beatsPerBar, beatDurationMs],
  );

  const chordSegments = useMemo(() => {
    if (!recording || chordSlices.length === 0) return [];
    const totalSegments = Math.max(
      1,
      Math.ceil(totalDurationMs / chordDurationMs),
    );

    return Array.from({ length: totalSegments }, (_, index) => {
      const slice = chordSlices[index % chordSlices.length];
      const startMs = index * chordDurationMs;
      const endMs = Math.min(totalDurationMs, startMs + chordDurationMs);
      const label = getChordLabel(slice);
      return {
        index,
        startMs,
        endMs,
        label,
        colors: getChordColors(label),
      };
    });
  }, [recording, chordSlices, chordDurationMs, totalDurationMs]);

  const pixelsPerMs = 0.15;
  const timelineWidth = Math.max(
    viewportWidth,
    Math.ceil(totalDurationMs * pixelsPerMs),
  );
  const maxScroll = Math.max(0, timelineWidth - viewportWidth);
  const scrubTimeMs = Math.min(
    totalDurationMs,
    Math.max(0, (scrollLeft + viewportWidth / 2) / pixelsPerMs),
  );
  const playheadMs = isPlaying ? currentTimeMs : scrubTimeMs;
  const playheadX = Math.min(timelineWidth, playheadMs * pixelsPerMs);

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

  useEffect(() => {
    if (!scrollRef.current || !isPlaying) return;
    const targetScroll = Math.min(
      maxScroll,
      Math.max(0, playheadX - viewportWidth / 2),
    );
    scrollRef.current.scrollLeft = targetScroll;
    setScrollLeft(targetScroll);
  }, [isPlaying, playheadX, viewportWidth, maxScroll]);

  useEffect(() => {
    if (!recording) return;
    console.info("Take overview inputs", {
      analysisStatus,
      analysisResult,
      recording,
      midiData,
      derivedStats: {
        totalDurationMs,
        timelineWidth,
        pixelsPerMs,
        maxScroll,
        currentTimeMs: playheadMs,
        notesCount: notes.length,
      },
    });
  }, [
    recording,
    analysisStatus,
    analysisResult,
    midiData,
    totalDurationMs,
    timelineWidth,
    pixelsPerMs,
    maxScroll,
    playheadMs,
    notes.length,
  ]);

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
    <div className="mb-6 flex flex-1 flex-col overflow-hidden rounded-xl border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="relative flex flex-1 overflow-hidden bg-white">
        {/* Note labels on the left */}
        <div className="z-30 w-12 flex-shrink-0 border-r-2 border-black bg-gray-50">
          <div className="h-6 border-b-2 border-black bg-gray-100" />
          <div className="relative h-[calc(100%-24px)]">
            {Array.from({
              length: noteRange.max - noteRange.min + 1,
            }).map((_, index) => {
              const pitch = noteRange.max - index;
              const NOTE_NAMES = [
                "C",
                "C#",
                "D",
                "D#",
                "E",
                "F",
                "F#",
                "G",
                "G#",
                "A",
                "A#",
                "B",
              ];
              const noteName = NOTE_NAMES[pitch % 12];
              const octave = Math.floor(pitch / 12) - 1;
              const isC = pitch % 12 === 0;
              const noteHeight = 12;
              return (
                <div
                  key={pitch}
                  className="absolute w-full border-b border-gray-200 text-[9px] font-semibold"
                  style={{
                    top: `${index * noteHeight}px`,
                    height: `${noteHeight}px`,
                    backgroundColor: isC
                      ? "rgba(59, 130, 246, 0.1)"
                      : "transparent",
                  }}
                >
                  <span
                    className={`ml-1 ${isC ? "text-blue-600" : "text-gray-600"}`}
                  >
                    {noteName}
                    {isC && <span className="text-[7px]">{octave}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        {/* Main scrollable area */}
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-full overflow-x-auto overflow-y-hidden"
          >
            <div
              className="relative h-full"
              style={{ width: `${timelineWidth}px` }}
            >
              <div
                className="pointer-events-none absolute inset-y-0 z-20 w-1 -translate-x-1/2 rounded-full bg-red-500"
                style={{ left: `${playheadX}px` }}
              />
              <div className="absolute top-0 z-10 h-6 w-full border-b-2 border-black bg-gray-100">
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
              <div className="pointer-events-none absolute inset-x-0 top-8 bottom-0">
                {chordSegments.map((segment) => (
                  <div
                    key={`chord-segment-${segment.index}`}
                    className="absolute inset-y-0 border-r-2 border-dotted"
                    style={{
                      left: `${segment.startMs * pixelsPerMs}px`,
                      width: `${Math.max(
                        2,
                        (segment.endMs - segment.startMs) * pixelsPerMs,
                      )}px`,
                      backgroundColor: segment.colors.background,
                      borderColor: segment.colors.divider,
                    }}
                  >
                    <span
                      className="absolute top-2 left-2 text-xs font-bold"
                      style={{ color: segment.colors.label }}
                    >
                      {segment.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="absolute inset-x-0 top-8 bottom-0">
                {notes.map((note, index) => {
                  const noteHeight = 12;
                  const rangeSpan = noteRange.max - noteRange.min + 1;
                  const notePosition =
                    (noteRange.max - note.pitch) * noteHeight;
                  return (
                    <div
                      key={`${note.pitch}-${index}`}
                      className="absolute rounded-md border-2 border-black bg-yellow-200"
                      style={{
                        left: `${note.startTime * pixelsPerMs}px`,
                        width: `${Math.max(6, note.duration * pixelsPerMs)}px`,
                        top: `${notePosition}px`,
                        height: `${noteHeight - 2}px`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
