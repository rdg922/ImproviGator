"use client";

import { useJamSession } from "../context/jam-session-context";
import ChatPanel from "./chat-panel";
import CreatePanel from "./create-panel";
import TrackSettingsPanel from "./track-settings-panel";

export default function LeftPanel() {
  const { leftPanelMode, setLeftPanelMode } = useJamSession();

  return (
    <div className="flex h-full flex-col border-4 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      {/* Mode Selector */}
      <div className="flex border-b-4 border-black">
        <button
          onClick={() => setLeftPanelMode("Create")}
          className={`flex-1 border-r-4 border-black px-4 py-1 font-bold transition-colors ${
            leftPanelMode === "Create"
              ? "bg-blue-400 text-black"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Create
        </button>
        <button
          onClick={() => setLeftPanelMode("Chat")}
          className={`flex-1 border-r-4 border-black px-4 py-1 font-bold transition-colors ${
            leftPanelMode === "Chat"
              ? "bg-green-400 text-black"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Chat
        </button>
        <button
          onClick={() => setLeftPanelMode("TrackSettings")}
          className={`flex-1 px-4 py-1 font-bold transition-colors ${
            leftPanelMode === "TrackSettings"
              ? "bg-purple-400 text-black"
              : "bg-white text-gray-600 hover:bg-gray-100"
          }`}
        >
          Settings
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {leftPanelMode === "Create" && (
          <CreatePanel
            onGenerationComplete={() => setLeftPanelMode("TrackSettings")}
          />
        )}
        {leftPanelMode === "Chat" && <ChatPanel />}
        {leftPanelMode === "TrackSettings" && <TrackSettingsPanel />}
      </div>
    </div>
  );
}
