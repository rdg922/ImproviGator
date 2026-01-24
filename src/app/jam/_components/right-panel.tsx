"use client";

import { useMemo, useState } from "react";
import RightPanelGrid from "./right-panel/grid";
import RightPanelRecording from "./right-panel/recording";
import { useJamSession } from "./jam-session-context";

type RightView = "Grid" | "Recording";

export default function RightPanel() {
  const { recording, setRecording, setMidiData, chordTimeline } =
    useJamSession();

  const [view, setView] = useState<RightView>("Grid");
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const highlightedChordIndex = useMemo(() => {
    const sliceCount = chordTimeline?.getSlices().length ?? 0;
    if (!sliceCount) {
      return 0;
    }
    return currentChordIndex % sliceCount;
  }, [chordTimeline, currentChordIndex]);

  const handleReset = () => {
    setCurrentChordIndex(0);
    setIsPlaying(false);
  };

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // Simulate recording - in real app, capture MIDI data
      setTimeout(() => {
        const simulatedRecording = {
          notes: [
            { pitch: 60, velocity: 80, startTime: 0, duration: 500 },
            { pitch: 64, velocity: 75, startTime: 500, duration: 500 },
            { pitch: 67, velocity: 70, startTime: 1000, duration: 500 },
          ],
          duration: 1500,
          timestamp: new Date(),
        };
        setRecording(simulatedRecording);
        setMidiData(simulatedRecording.notes);
      }, 1000);
    }
  };

  const handleToggleView = () => {
    setView(view === "Grid" ? "Recording" : "Grid");
  };

  return (
    <div className="flex h-full flex-col border-4 border-black bg-amber-200 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      {view === "Grid" ? (
        <RightPanelGrid highlightedIndex={highlightedChordIndex} />
      ) : (
        <RightPanelRecording />
      )}

      {/* Unified Controls - Always visible */}
      <div className="flex justify-center gap-4">
        <button
          onClick={handleReset}
          className="border-4 border-black bg-orange-300 px-10 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
        >
          ⏮ Reset
        </button>

        <button
          onClick={handlePlay}
          className={`border-4 border-black px-10 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none ${
            isPlaying ? "bg-red-400" : "bg-green-400"
          }`}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>

        <button
          onClick={handleRecord}
          className={`border-4 border-black px-10 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none ${
            isRecording ? "bg-red-500" : "bg-blue-400"
          }`}
        >
          {isRecording ? "⏹ Stop Recording" : "⏺ Record"}
        </button>

        <button
          onClick={handleToggleView}
          disabled={!recording}
          className={`border-4 border-black px-10 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none ${
            recording ? "bg-purple-400" : "bg-gray-300 text-gray-500"
          }`}
        >
          {view === "Grid" ? "View Recording" : "← Backing Track"}
        </button>
      </div>
    </div>
  );
}
