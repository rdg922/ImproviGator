"use client";

import { useState } from "react";

interface AnalysisModeProps {
  onSaveChord: (chord: string) => void;
}

export default function AnalysisMode({ onSaveChord }: AnalysisModeProps) {
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; suggestedChord?: string }>
  >([
    {
      role: "assistant",
      content: "Great playing! Let's analyze your improvisation. Need any chord suggestions?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    setChatMessages([
      ...chatMessages,
      { role: "user", content: inputMessage },
      {
        role: "assistant",
        content: "Based on your playing, I'd suggest trying a Dm7 chord. It fits the melodic patterns you used.",
        suggestedChord: "Dm7",
      },
    ]);
    setInputMessage("");
  };

  const handlePlayMidi = () => {
    setIsPlaying(!isPlaying);
  };

  const handleHeartChord = (chord: string) => {
    onSaveChord(chord);
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left 1/3 - Chat Window */}
      <div className="w-1/3">
        <div className="flex h-full flex-col border-4 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          {/* Chat Header */}
          <div className="border-b-4 border-black bg-purple-300 px-6 py-3 text-xl font-black">
            AI Feedback
          </div>

          {/* Chat Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {chatMessages.map((message, index) => (
              <div key={index}>
                <div
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] border-4 border-black p-3 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                      message.role === "user" ? "bg-blue-300" : "bg-green-300"
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
                {/* Suggested Chord with Heart Button */}
                {message.suggestedChord && (
                  <div className="mt-2 flex justify-start">
                    <div className="flex items-center gap-2 border-4 border-black bg-yellow-200 px-4 py-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <span className="text-lg font-black">
                        {message.suggestedChord}
                      </span>
                      <button
                        onClick={() => handleHeartChord(message.suggestedChord!)}
                        className="text-xl transition-transform hover:scale-110 active:scale-95"
                        title="Save to favorites"
                      >
                        ❤️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="border-t-4 border-black p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask for feedback..."
                className="flex-1 border-4 border-black bg-yellow-100 px-3 py-2 font-bold focus:outline-none focus:ring-0"
              />
              <button
                onClick={handleSendMessage}
                className="border-4 border-black bg-pink-400 px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right 2/3 - MIDI Playback */}
      <div className="w-2/3">
        <div className="flex h-full flex-col border-4 border-black bg-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="mb-4 text-2xl font-black">Your Recording</h2>

          {/* MIDI Visualization Area */}
          <div className="mb-4 flex-1 border-4 border-black bg-gradient-to-b from-blue-100 to-blue-50 p-4">
            {/* Placeholder for MIDI visualization */}
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <div className="mb-2 text-6xl">🎹</div>
                <p className="font-bold text-gray-600">
                  MIDI Playback Visualization
                </p>
              </div>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center justify-center gap-3">
            <button className="border-4 border-black bg-orange-300 px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none">
              ⏮ Previous
            </button>

            <button
              onClick={handlePlayMidi}
              className={`border-4 border-black px-6 py-2 text-lg font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none ${
                isPlaying ? "bg-red-400" : "bg-green-400"
              }`}
            >
              {isPlaying ? "⏸ Pause" : "▶ Play"}
            </button>

            <button className="border-4 border-black bg-orange-300 px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none">
              Next ⏭
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-3 border-4 border-black bg-gray-200">
              <div className="h-full w-1/3 bg-blue-500"></div>
            </div>
            <div className="mt-1 flex justify-between text-xs font-bold">
              <span>0:00</span>
              <span>0:45 / 2:15</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
