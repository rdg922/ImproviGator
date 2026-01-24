"use client";

import { useState } from "react";
import ChatPanel from "./chat-panel";
import CreatePanel from "./create-panel";
import TrackSettingsPanel from "./track-settings-panel";

type LeftMode = "Create" | "Chat" | "TrackSettings";

export default function LeftPanel() {
  const [mode, setMode] = useState<LeftMode>("Create");

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
          onClick={() => setMode("TrackSettings")}
          className={`flex-1 px-4 py-3 font-bold transition-colors ${
            mode === "TrackSettings"
              ? "bg-purple-400 text-black"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Track Settings
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {mode === "Create" && (
          <CreatePanel onGenerationComplete={() => setMode("TrackSettings")} />
        )}
        {mode === "Chat" && <ChatPanel />}
        {mode === "TrackSettings" && <TrackSettingsPanel />}
      </div>
    </div>
  );
}
