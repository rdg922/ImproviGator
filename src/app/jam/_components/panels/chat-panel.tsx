"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useJamSession } from "../context/jam-session-context";
import type {
  ChatMessage,
  ConversationEntry,
} from "../context/jam-session-context";
import { api } from "~/trpc/react";
import Chord from "~/app/_components/react-chords/react-chords/src/Chord";
import { GUITAR_INSTRUMENT, getChordData } from "~/lib/chord-utils";
import {
  buildChordScaleRecommendation,
  buildChordTimeline,
  buildChordToneRecommendation,
} from "~/lib/audio/harmonic-analysis";

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
    analysisResult,
    analysisStatus,
    midiData,
    parsedChords,
    tempo,
    timeSignature,
    recording,
  } = useJamSession();
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const lastAutoAnalysisRef = useRef<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const chatMutation = api.chat.sendMessage.useMutation();

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isLoading]);

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

  const barSummaries = useMemo(() => {
    if (!analysisResult || midiData.length === 0) return [];

    const beatsPerBar = Number(timeSignature.split("/")[0]) || 4;
    const beatDurationSeconds = tempo > 0 ? 60 / tempo : 0.5;
    const barDurationSeconds = beatsPerBar * beatDurationSeconds;

    const totalDurationSeconds =
      midiData.reduce(
        (max, note) => Math.max(max, (note.startTime + note.duration) / 1000),
        0,
      ) || 0;

    if (totalDurationSeconds === 0 || barDurationSeconds === 0) return [];

    const totalBars = Math.max(
      1,
      Math.ceil(totalDurationSeconds / barDurationSeconds),
    );

    const chordTimeline = buildChordTimeline(
      parsedChords,
      totalDurationSeconds,
    );

    const contextsByBar = new Map<
      number,
      typeof analysisResult.analysis.noteContexts
    >();
    analysisResult.analysis.noteContexts.forEach((context) => {
      const barIndex = Math.floor(context.beatIndex / beatsPerBar);
      const existing = contextsByBar.get(barIndex) ?? [];
      existing.push(context);
      contextsByBar.set(barIndex, existing);
    });

    return Array.from({ length: totalBars }, (_, barIndex) => {
      const barStart = barIndex * barDurationSeconds;
      const barContexts = contextsByBar.get(barIndex) ?? [];
      const totalNotes = barContexts.length;
      const chordToneNotes = barContexts.filter((c) => c.isChordTone).length;
      const scaleToneNotes = barContexts.filter((c) => c.isScaleTone).length;
      const strongBeatNotes = barContexts.filter((c) => c.isStrongBeat).length;
      const strongBeatChordTones = barContexts.filter(
        (c) => c.isStrongBeat && c.isChordTone,
      ).length;

      const chordToneRatio = totalNotes > 0 ? chordToneNotes / totalNotes : 0;
      const scaleToneRatio = totalNotes > 0 ? scaleToneNotes / totalNotes : 0;
      const strongBeatRatio =
        strongBeatNotes > 0 ? strongBeatChordTones / strongBeatNotes : 0;

      const noteList = Array.from(
        new Set(barContexts.map((context) => context.pitchClass)),
      ).join(", ");

      const chordSlot = chordTimeline.length
        ? (chordTimeline.find(
            (slot) =>
              barStart >= slot.startTimeSeconds &&
              barStart < slot.endTimeSeconds,
          ) ?? chordTimeline[chordTimeline.length - 1])
        : undefined;

      const chordLabel = chordSlot?.chords.join(" / ") || "No chord";
      const primaryChord = chordSlot?.chords?.[0] ?? "";

      let positives = "Nice use of space.";
      if (totalNotes > 0) {
        if (chordToneRatio >= 0.6) {
          positives = "Good chord-tone targeting.";
        } else if (scaleToneRatio >= 0.7) {
          positives = "Strong scale-tone coherence.";
        } else if (strongBeatRatio >= 0.5) {
          positives = "Solid downbeat resolution.";
        } else {
          positives = "Adventurous colors—aim for clearer resolution.";
        }
      }

      let alternatives = "";
      if (primaryChord) {
        const chordToneSuggestion = buildChordToneRecommendation(primaryChord);
        const scaleSuggestion = buildChordScaleRecommendation(
          primaryChord,
          key,
          modality,
        );
        alternatives = ` Try targeting ${chordToneSuggestion.chordTones.join(
          ", ",
        )}; or explore ${scaleSuggestion.root} ${scaleSuggestion.scaleName} (${scaleSuggestion.scaleNotes.join(
          ", ",
        )}).`;
      }

      return {
        role: "assistant" as const,
        content: `Bar ${barIndex + 1} — Chords: ${chordLabel}. Notes: ${
          noteList || "rest"
        }. ${positives}${alternatives}`,
      };
    });
  }, [
    analysisResult,
    midiData,
    parsedChords,
    tempo,
    timeSignature,
    key,
    modality,
  ]);

  useEffect(() => {
    if (analysisStatus !== "success" || !analysisResult || !recording) return;
    if (barSummaries.length === 0) return;

    const analysisKey = `${recording.timestamp.toString()}-${analysisResult.analysis.metrics.totalNotes}`;
    if (lastAutoAnalysisRef.current === analysisKey) return;

    lastAutoAnalysisRef.current = analysisKey;
    setChatMessages((prev: ChatMessage[]) => [...prev, ...barSummaries]);
    setConversationHistory((prev) => [
      ...prev,
      ...barSummaries.map((message) => ({
        role: "model" as const,
        parts: [{ text: message.content }],
      })),
    ]);
  }, [
    analysisStatus,
    analysisResult,
    recording,
    barSummaries,
    setChatMessages,
    setConversationHistory,
  ]);

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

  const renderMessageContent = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-black">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollContainerRef}
        className="flex-1 space-y-3 overflow-y-auto p-4"
      >
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
                {renderMessageContent(message.content)}
              </div>
            </div>
            {message.suggestedChords && message.suggestedChords.length > 0 && (
              <div className="mt-2 flex flex-wrap justify-start gap-2">
                {message.suggestedChords.map((suggestion, idx) => {
                  const chordData = getChordData(
                    suggestion.chord,
                    suggestion.voicingIndex ?? 0,
                  );
                  return (
                    <div
                      key={`${suggestion.chord}-${idx}`}
                      className="flex w-48 flex-col items-center border-4 border-black bg-yellow-200 p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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
