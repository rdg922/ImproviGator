"use client";

import { useState } from "react";
import { useJamSession } from "./jam-session-context";
import type { ChatMessage } from "./jam-session-context";
import { api } from "~/trpc/react";

export default function ChatPanel() {
  const {
    addSavedChord,
    setStrudelCode,
    setKey,
    setModality,
    key,
    modality,
    strudelCode,
    savedChords,
    chatMessages,
    setChatMessages,
    conversationHistory,
    setConversationHistory,
  } = useJamSession();
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const chatMutation = api.chat.sendMessage.useMutation();

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: "user", content: inputMessage };
    setChatMessages((prev: ChatMessage[]) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const result = await chatMutation.mutateAsync({
        message: inputMessage,
        key,
        modality,
        strudelCode,
        savedChords,
        conversationHistory,
      });

      if (result.success) {
        // Handle tool results
        if (result.toolResults && result.toolResults.length > 0) {
          console.log("Chat tool results:", result.toolResults);
          for (const toolResult of result.toolResults) {
            switch (toolResult.type) {
              case "edit_backing_track":
                console.log(
                  "Updating strudel code to:",
                  toolResult.newStrudelCode,
                );
                setStrudelCode(toolResult.newStrudelCode);
                break;
              case "show_scale":
                console.log(
                  "Updating scale to:",
                  toolResult.key,
                  toolResult.modality,
                );
                setKey(toolResult.key);
                setModality(toolResult.modality);
                break;
              case "add_chord":
                console.log("Adding chord:", toolResult.chord);
                addSavedChord(toolResult.chord);
                break;
            }
          }
        }

        const assistantReply: ChatMessage = {
          role: "assistant",
          content: result.response,
        };
        setChatMessages((prev: ChatMessage[]) => [...prev, assistantReply]);

        // Update conversation history (simplified - you may want to store full Gemini format)
        setConversationHistory((prev) => [
          ...prev,
          {
            role: "user",
            parts: [{ text: inputMessage }],
          },
          {
            role: "model",
            parts: [{ text: result.response }],
          },
        ]);
      } else {
        const errorReply: ChatMessage = {
          role: "assistant",
          content: result.error ?? "Sorry, I encountered an error.",
        };
        setChatMessages((prev: ChatMessage[]) => [...prev, errorReply]);
      }
    } catch (error) {
      const errorReply: ChatMessage = {
        role: "assistant",
        content: "Sorry, I encountered an error processing your request.",
      };
      setChatMessages((prev: ChatMessage[]) => [...prev, errorReply]);
      console.error("Chat error:", error);
    } finally {
      setIsLoading(false);
    }
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
        {isLoading && (
          <div className="flex justify-start">
            <div className="border-4 border-black bg-green-300 p-3 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              Thinking...
            </div>
          </div>
        )}
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
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading}
            className="border-4 border-black bg-pink-400 px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
