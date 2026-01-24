"use client";

import { useState } from "react";
import { useJamSession } from "../context/jam-session-context";
import type {
  ChatMessage,
  ConversationEntry,
} from "../context/jam-session-context";
import { api } from "~/trpc/react";
import Chord from "~/app/_components/react-chords/react-chords/src/Chord";
import {
  GUITAR_INSTRUMENT,
  getChordData,
} from "~/lib/chord-utils";

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

  const normalizeHistory = (history: unknown): ConversationEntry[] => {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .filter(
        (entry): entry is ConversationEntry =>
          typeof entry === "object" &&
          entry !== null &&
          (entry as ConversationEntry).role !== undefined &&
          ((entry as ConversationEntry).role === "user" ||
            (entry as ConversationEntry).role === "model"),
      )
      .map((entry) => ({
        role: entry.role,
        parts: Array.isArray(entry.parts) ? entry.parts : [],
      }));
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const shouldAddAll = /\badd\s+all\s+(these|those|them)\b/i.test(
      inputMessage,
    );
    if (shouldAddAll) {
      const lastAssistantMessage = [...chatMessages]
        .reverse()
        .find((message) => message.role === "assistant")?.content;

      const chordMatches = lastAssistantMessage
        ? lastAssistantMessage.match(
            /\b[A-G](?:#|b)?(?:maj|min|m|dim|aug|sus|add)?\d*(?:b5|#5|b9|#9)?\b/g,
          )
        : [];

      const uniqueChords = Array.from(new Set(chordMatches ?? [])).filter(
        (chord) => chord.length > 1 || /[A-G]/.test(chord),
      );

      if (uniqueChords.length > 0) {
        uniqueChords.forEach((chord) => addSavedChord(chord));
        const assistantReply: ChatMessage = {
          role: "assistant",
          content: `Added ${uniqueChords.join(", ")} to your saved chords.`,
        };
        setChatMessages((prev: ChatMessage[]) => [
          ...prev,
          { role: "user", content: inputMessage },
          assistantReply,
        ]);
        setConversationHistory((prev) => [
          ...prev,
          { role: "user", parts: [{ text: inputMessage }] },
          { role: "model", parts: [{ text: assistantReply.content }] },
        ]);
        setInputMessage("");
        return;
      }
    }

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
        savedChords: savedChords.map((saved) => saved.name),
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
              case "show_chord":
                console.log("Showing chord:", toolResult.chord);
                // Chord will be displayed in the chat message with the response
                // User can add it manually with a + button
                break;
            }
          }
        }

        const assistantReply: ChatMessage = {
          role: "assistant",
          content: result.response,
          suggestedChords: result.toolResults
            ?.filter((tr) => tr.type === "show_chord")
            .map((tr) => ({
              chord: tr.chord,
              voicingIndex: tr.voicingIndex,
            })),
        };
        setChatMessages((prev: ChatMessage[]) => [...prev, assistantReply]);

        if (result.updatedHistory) {
          setConversationHistory(normalizeHistory(result.updatedHistory));
        } else {
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
        }
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

  const handleHeartChord = (chord: string, voicingIndex?: number) => {
    addSavedChord(chord, voicingIndex);
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
            {message.suggestedChords && message.suggestedChords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 justify-start">
                {message.suggestedChords.map((suggestion, idx) => {
                  const chordData = getChordData(
                    suggestion.chord,
                    suggestion.voicingIndex ?? 0,
                  );
                  return (
                    <div
                      key={`${suggestion.chord}-${idx}`}
                      className="flex flex-col items-center border-4 border-black bg-yellow-200 p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-48"
                    >
                      <div className="mb-1 text-xs font-black">
                        {suggestion.chord}
                      </div>
                      <div className="scale-75">
                        <Chord
                          chord={chordData}
                          instrument={GUITAR_INSTRUMENT}
                          lite={true}
                        />
                      </div>
                      <button
                        onClick={() =>
                          handleHeartChord(
                            suggestion.chord,
                            suggestion.voicingIndex,
                          )
                        }
                        className="mt-1 border-2 border-black bg-pink-400 px-3 py-1 text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        title="Add to saved chords"
                      >
                        + Add
                      </button>
                    </div>
                  );
                })}
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
            className="border-4 border-black bg-pink-400 px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
