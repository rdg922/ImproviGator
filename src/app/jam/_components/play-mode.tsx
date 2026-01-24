"use client";

import { useState } from "react";

export default function PlayMode() {
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Example chord data - will be generated dynamically later
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

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRecord = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left 1/3 - Setup Panel */}
      <div className="w-1/3">
        <div className="flex h-full flex-col border-4 border-black bg-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="mb-3 text-2xl font-black">Setup</h2>
          
          <div className="flex-1 space-y-4 overflow-y-auto">
            {/* Key Selection */}
            <div>
              <label className="mb-2 block text-sm font-bold uppercase tracking-wide">
                Key
              </label>
              <select className="w-full border-4 border-black bg-yellow-200 px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <option>C</option>
                <option>C#</option>
                <option>D</option>
                <option>D#</option>
                <option>E</option>
                <option>F</option>
                <option>F#</option>
                <option>G</option>
                <option>G#</option>
                <option>A</option>
                <option>A#</option>
                <option>B</option>
              </select>
            </div>

            {/* Modality Selection */}
            <div>
              <label className="mb-2 block text-sm font-bold uppercase tracking-wide">
                Modality
              </label>
              <select className="w-full border-4 border-black bg-pink-200 px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <option>Major</option>
                <option>Minor</option>
                <option>Dorian</option>
                <option>Phrygian</option>
                <option>Lydian</option>
                <option>Mixolydian</option>
                <option>Aeolian</option>
                <option>Locrian</option>
              </select>
            </div>

            {/* Tempo */}
            <div>
              <label className="mb-2 block text-sm font-bold uppercase tracking-wide">
                Tempo (BPM)
              </label>
              <input
                type="number"
                defaultValue={120}
                min={40}
                max={240}
                className="w-full border-4 border-black bg-blue-200 px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-bold uppercase tracking-wide">
                Description (genre, mood, etc.)
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Jazzy, upbeat, latin vibes..."
                className="w-full border-4 border-black bg-green-200 px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0"
              ></textarea>
            </div>

            {/* Generate Button */}
            <button className="w-full border-4 border-black bg-orange-400 px-6 py-3 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none">
              Generate Chords
            </button>
          </div>
        </div>
      </div>

      {/* Right 2/3 - Chord Grid and Controls */}
      <div className="flex w-2/3 flex-col">
        {/* 4x4 Chord Grid */}
        <div className="mb-6 flex-1 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
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

        {/* Play and Record Controls */}
        <div className="flex justify-center gap-4">
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
        </div>
      </div>
    </div>
  );
}
