"use client";

import { useState } from "react";
import { useJamSession } from "./jam-session-context";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  suggestedChord?: string;
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    role: "assistant",
    content:
      "Great playing! Let's analyze your improvisation. Need any chord suggestions?",
  },
];

export default function ChatPanel() {
  const { addSavedChord } = useJamSession();
  const [chatMessages, setChatMessages] =
    useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputMessage, setInputMessage] = useState("");

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: inputMessage };
    const assistantReply: ChatMessage = {
      role: "assistant",
      content:
        "Based on your playing, I'd suggest trying a Dm7 chord. It fits the melodic patterns you used.",
      suggestedChord: "Dm7",
    };

    setChatMessages([...chatMessages, userMessage, assistantReply]);
    setInputMessage("");
  };

  const handleHeartChord = (chord: string) => {
    addSavedChord(chord);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {chatMessages.map((message, index) => (
          <div key={`${message.role}-${index}`}>
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
      <div className="border-t-4 border-black p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Ask for feedback..."
            className="flex-1 border-4 border-black bg-yellow-100 px-3 py-2 font-bold focus:ring-0 focus:outline-none"
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
  );
}
