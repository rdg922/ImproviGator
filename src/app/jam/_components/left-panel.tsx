"use client";

import { useState } from "react";
import { useJamSession } from "./jam-session-context";

type LeftMode = "Create" | "Chat" | "Advanced";

export default function LeftPanel() {
  const {
    key,
    setKey,
    modality,
    setModality,
    tempo,
    setTempo,
    timeSignature,
    setTimeSignature,
    description,
    setDescription,
    strudelCode,
    setStrudelCode,
    addSavedChord,
  } = useJamSession();

  const [mode, setMode] = useState<LeftMode>("Create");
  
  // Local state for form inputs (before generation)
  const [localKey, setLocalKey] = useState(key);
  const [localModality, setLocalModality] = useState(modality);
  const [localTempo, setLocalTempo] = useState(tempo);
  const [localTimeSignature, setLocalTimeSignature] = useState(timeSignature);
  const [localDescription, setLocalDescription] = useState(description);
  
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; suggestedChord?: string }>
  >([
    {
      role: "assistant",
      content: "Great playing! Let's analyze your improvisation. Need any chord suggestions?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");

  const handleGenerate = () => {
    // Update context with local values when Generate is clicked
    setKey(localKey);
    setModality(localModality);
    setTempo(localTempo);
    setTimeSignature(localTimeSignature);
    setDescription(localDescription);
    
    // TODO: Call LLM generation logic here
  };

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

  const handleHeartChord = (chord: string) => {
    addSavedChord(chord);
  };

  return (
    <div className="flex h-full flex-col border-4 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      {/* Mode Selector */}
      <div className="flex border-b-4 border-black">
        <button
          onClick={() => setMode("Create")}
          className={`flex-1 border-r-4 border-black px-4 py-3 font-bold transition-colors ${
            mode === "Create"
              ? "bg-blue-400 text-black"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Create
        </button>
        <button
          onClick={() => setMode("Chat")}
          className={`flex-1 border-r-4 border-black px-4 py-3 font-bold transition-colors ${
            mode === "Chat"
              ? "bg-green-400 text-black"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setMode("Advanced")}
          className={`flex-1 px-4 py-3 font-bold transition-colors ${
            mode === "Advanced"
              ? "bg-purple-400 text-black"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Advanced
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {mode === "Create" && (
          <div className="flex h-full flex-col p-4">
            <div className="flex-1 space-y-4 overflow-y-auto">
              <div className="flex flex-row justify-stretch gap-x-5">
                {/* Key Selection */}
                <div className="grow">
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wide">
                    Key
                  </label>
                  <select 
                    value={localKey}
                    onChange={(e) => setLocalKey(e.target.value)}
                    className="w-full border-4 border-black bg-yellow-200 px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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
                <div className="grow">
                  <label className="mb-2 block text-sm font-bold uppercase tracking-wide">
                    Modality
                  </label>
                  <select 
                    value={localModality}
                    onChange={(e) => setLocalModality(e.target.value)}
                    className="w-full border-4 border-black bg-pink-200 px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
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
              </div>
              {/* Tempo */}
              <div>
                <label className="mb-2 block text-sm font-bold uppercase tracking-wide">
                  Tempo (BPM)
                </label>
                <input
                  type="number"
                  value={localTempo}
                  onChange={(e) => setLocalTempo(Number(e.target.value))}
                  min={40}
                  max={240}
                  className="w-full border-4 border-black bg-blue-200 px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                />
              </div>

              {/* Time Signature */}
              <div>
                <label className="mb-2 block text-sm font-bold uppercase tracking-wide">
                  Time Signature
                </label>
                <div className="flex gap-2">
                  {["2/4", "3/4", "4/4", "5/4"].map((sig) => (
                    <button
                      key={sig}
                      onClick={() => setLocalTimeSignature(sig)}
                      className={`flex-1 border-4 border-black px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        localTimeSignature === sig
                          ? "bg-cyan-400 text-black"
                          : "bg-white text-gray-700"
                      }`}
                    >
                      {sig}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-bold uppercase tracking-wide">
                  Description (genre, mood, etc.)
                </label>
                <textarea
                  rows={3}
                  value={localDescription}
                  onChange={(e) => setLocalDescription(e.target.value)}
                  placeholder="e.g., Jazzy, upbeat, latin vibes..."
                  className="w-full border-4 border-black bg-green-200 px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0"
                ></textarea>
              </div>

              {/* Generate Button */}
              <button 
                onClick={handleGenerate}
                className="w-full border-4 border-black bg-orange-400 px-6 py-3 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none">
                Generate
              </button>
            </div>
          </div>
        )}

        {mode === "Chat" && (
          <div className="flex h-full flex-col">
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
        )}

        {mode === "Advanced" && (
          <div className="flex h-full flex-col p-4">
            <label className="mb-2 text-sm font-bold uppercase tracking-wide">
              Generated Strudel Code
            </label>
            <textarea
              value={strudelCode}
              onChange={(e) => setStrudelCode(e.target.value)}
              placeholder="// Generated Strudel code will appear here..."
              className="flex-1 border-4 border-black bg-gray-50 px-4 py-3 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-0"
            ></textarea>
            <button className="mt-3 w-full border-4 border-black bg-orange-400 px-6 py-3 text-lg font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none">
              Apply Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
