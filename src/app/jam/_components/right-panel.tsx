"use client";

import { useState } from "react";
import { useJamSession } from "./jam-session-context";

type RightView = "Grid" | "Recording";

export default function RightPanel() {
  const { recording, setRecording, midiData, setMidiData, tempo } = useJamSession();
  
  const [view, setView] = useState<RightView>("Grid");
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Example chord data
  const chords = [
    { chord1: "Cmaj7", chord2: null },
    { chord1: "Am7", chord2: "Dm7" },
    { chord1: "Dm7", chord2: null },
    { chord1: "G7", chord2: null },
    { chord1: "Fmaj7", chord2: null },
    { chord1: "Bdim", chord2: "Em7" },
    { chord1: "Em7", chord2: null },
    { chord1: "A7", chord2: null },
    { chord1: "Cmaj7", chord2: null },
    { chord1: "F#m7b5", chord2: "Bm7" },
    { chord1: "Bm7", chord2: null },
    { chord1: "E7", chord2: null },
    { chord1: "Am7", chord2: null },
    { chord1: "Dm7", chord2: "G7" },
    { chord1: "G7", chord2: null },
    { chord1: "Cmaj7", chord2: null }
  ];

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
        <>
          {/* 4x4 Chord Grid */}
          <div className="mb-4 flex-1 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <div className="grid h-full grid-cols-4 grid-rows-4">
              {chords.map((chordData, index) => (
                <div
                  key={index}
                  className={`flex border-b-4 border-r-4 border-black transition-all last:border-r-0 [&:nth-child(4n)]:border-r-0 [&:nth-last-child(-n+4)]:border-b-0 ${
                    index === currentChordIndex
                      ? "bg-yellow-300"
                      : "bg-white"
                  }`}
                >
                  {chordData.chord2 ? (
                    <>
                      <div className="flex flex-1 items-center justify-center border-r-4 border-gray-300 text-2xl font-black">
                        {chordData.chord1}
                      </div>
                      <div className="flex flex-1 items-center justify-center text-2xl font-black">
                        {chordData.chord2}
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-1 items-center justify-center text-2xl font-black">
                      {chordData.chord1}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* MIDI Playback Visualization */}
          <div className="mb-4 flex flex-1 flex-col border-4 border-black bg-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="mb-4 text-2xl font-black">Your Recording</h2>

            {/* MIDI Visualization Area */}
            <div className="mb-4 flex-1 border-4 border-black bg-gradient-to-b from-blue-100 to-blue-50 p-4">
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mb-2 text-6xl">🎹</div>
                  <p className="font-bold text-gray-600">
                    MIDI Playback Visualization
                  </p>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="h-3 border-4 border-black bg-gray-200">
                <div className="h-full w-1/3 bg-blue-500"></div>
              </div>
              <div className="mt-1 flex justify-between text-xs font-bold">
                <span>0:00</span>
                <span>0:45 / 2:15</span>
              </div>
            </div>
          </div>
        </>
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
