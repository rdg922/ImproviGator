"use client";

import { useEffect, useMemo, useState } from "react";
import LeftPanel from "~/app/jam/_components/panels/left-panel";
import {
  JamSessionProvider,
  useJamSession,
  type ChatMessage,
  type ConversationEntry,
} from "~/app/jam/_components/context/jam-session-context";
import { api } from "~/trpc/react";
import { handleStrudel } from "~/services/handleStrudel";

const DEFAULT_CHAT_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "Hi! I can help you edit the backing track, show scales on the fretboard, or save chords. What would you like to do?",
};

const SAMPLE_ANALYSIS_MESSAGE: ChatMessage = {
  role: "assistant",
  content:
    "**Analysis Summary**\n\nYour phrasing locks nicely with the harmony. Try targeting chord tones on the strong beats, then resolve chromatic approach tones on beat 4 to set up the next chord.\n\nWant a practice drill or a scale map?",
  suggestedResponses: [
    "Give me a practice drill",
    "Show chord tones for this progression",
  ],
};

const parseChordTokens = (code: string) => {
  const assignmentMatch =
    /\b\w+\s*=\s*chord\(\s*([`"'])([\s\S]*?)\1\s*\)/s.exec(
      code,
    );
  const directMatch = /\bchord\(\s*([`"'])([\s\S]*?)\1\s*\)/s.exec(code);
  const templateMatch = /\bchord\s*`([\s\S]*?)`/s.exec(code);

  const chordLineMatch = assignmentMatch ?? directMatch;
  let rawContent = chordLineMatch?.[2] ?? templateMatch?.[1] ?? "";
  if (!rawContent) return [];

  const angleMatch = /<([^>]+)>/s.exec(rawContent);
  if (angleMatch?.[1]) {
    rawContent = angleMatch[1];
  }

  const chordContent = rawContent
    .split("\n")
    .map((line) => {
      const commentIndex = line.indexOf("//");
      return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
    })
    .join(" ")
    .trim();

  const tokens: Array<{ chord: string | string[]; index: number }> = [];
  let index = 0;
  let i = 0;

  while (i < chordContent.length) {
    while (i < chordContent.length && /\s/.test(chordContent[i] ?? "")) {
      i++;
    }
    if (i >= chordContent.length) break;

    if (chordContent[i] === "[") {
      i++;
      const groupChords: string[] = [];
      let buffer = "";

      while (i < chordContent.length && chordContent[i] !== "]") {
        if (/\s/.test(chordContent[i] ?? "")) {
          if (buffer) {
            groupChords.push(buffer);
            buffer = "";
          }
        } else {
          buffer += chordContent[i] ?? "";
        }
        i++;
      }
      if (buffer) groupChords.push(buffer);
      if (groupChords.length > 0) {
        tokens.push({ chord: groupChords, index });
        index++;
      }
      i++;
    } else {
      let buffer = "";
      while (i < chordContent.length && !/[\s\[\]]/.test(chordContent[i] ?? "")) {
        buffer += chordContent[i] ?? "";
        i++;
      }
      if (buffer) {
        tokens.push({ chord: buffer, index });
        index++;
      }
    }
  }

  return tokens;
};

const getStrudelDiagnostics = (code: string) => {
  const errors: string[] = [];

  const hasChordCall = /\bchord\s*\(/.test(code) || /\bchord\s*`/.test(code);
  if (!hasChordCall) {
    errors.push("No chord() pattern found. Add chord(\"<...>\") to parse chords.");
  }

  const bracketDiff =
    (code.match(/\[/g)?.length ?? 0) - (code.match(/\]/g)?.length ?? 0);
  if (bracketDiff !== 0) {
    errors.push("Unmatched [ ] bracket group in chord pattern.");
  }

  const angleDiff =
    (code.match(/</g)?.length ?? 0) - (code.match(/>/g)?.length ?? 0);
  if (angleDiff !== 0) {
    errors.push("Unmatched < > angle bracket in chord pattern.");
  }

  const parsedChords = parseChordTokens(code);
  if (hasChordCall && parsedChords.length === 0) {
    errors.push("Chord parser did not find any tokens.");
  }

  const tracks = handleStrudel.get_tracks(code);

  return { errors, parsedChords, tracks };
};

function LeftPanelDebugControls() {
  const {
    setLeftPanelMode,
    leftPanelMode,
    chatMessages,
    setChatMessages,
    setConversationHistory,
    key,
    modality,
    tempo,
    timeSignature,
    instruments,
    description,
    strudelCode,
    setStrudelCode,
  } = useJamSession();
  const [draftStrudel, setDraftStrudel] = useState(strudelCode);
  const [generatedCode, setGeneratedCode] = useState("");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [bars, setBars] = useState(16);

  const generateBackingTrack = api.llm.generateBackingTrack.useMutation();

  useEffect(() => {
    setDraftStrudel(strudelCode);
  }, [strudelCode]);

  const diagnostics = useMemo(
    () => getStrudelDiagnostics(draftStrudel),
    [draftStrudel],
  );

  const handleOpenChat = () => {
    setLeftPanelMode("Chat");
  };

  const handleClearChat = () => {
    setChatMessages([DEFAULT_CHAT_MESSAGE]);
    setConversationHistory([] as ConversationEntry[]);
  };

  const handleRenderChord = () => {
    setLeftPanelMode("Chat");
    const nextMessage: ChatMessage = {
      role: "assistant",
      content: "Here’s a chord render test:",
      suggestedChords: [{ chord: "G7", voicingIndex: 0 }],
    };
    setChatMessages((prev) => [...prev, nextMessage]);
    setConversationHistory((prev) => [
      ...prev,
      { role: "model", parts: [{ text: nextMessage.content }] },
    ]);
  };

  const handleRenderSampleAnalysis = () => {
    setLeftPanelMode("Chat");
    setChatMessages((prev) => [...prev, SAMPLE_ANALYSIS_MESSAGE]);
    setConversationHistory((prev) => [
      ...prev,
      { role: "model", parts: [{ text: SAMPLE_ANALYSIS_MESSAGE.content }] },
    ]);
  };

  const handleGeneratePreview = async () => {
    setGenerateError(null);
    try {
      const result = await generateBackingTrack.mutateAsync({
        genre: description.trim() || `${modality} improv groove`,
        key: `${key} ${modality}`,
        bars: Math.min(64, Math.max(1, bars)),
        instruments: instruments.length > 0 ? instruments : ["drums", "piano"],
        bpm: tempo,
      });

      if (result.success && result.code) {
        setGeneratedCode(result.code);
        return;
      }

      setGenerateError(result.error ?? "No Strudel code returned.");
    } catch (error) {
      setGenerateError(
        error instanceof Error ? error.message : "Generation failed.",
      );
    }
  };

  const handleApplyDraft = () => {
    setStrudelCode(draftStrudel);
    setLeftPanelMode("TrackSettings");
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden rounded-2xl border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <header>
        <p className="text-xs font-black tracking-[0.3em] text-gray-700 uppercase">
          debug panel
        </p>
        <h1 className="text-3xl font-black">Left Panel Lab</h1>
        <p className="text-sm font-bold text-gray-600">
          Trigger chat/create/settings behaviors without leaving the jam room.
        </p>
      </header>

      <div className="rounded-lg border-3 border-black bg-gray-50 px-3 py-2 text-xs font-black uppercase text-gray-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        Active tab: {leftPanelMode ?? "None"}
      </div>

      {leftPanelMode === "Chat" && (
        <section className="space-y-3">
          <h2 className="text-lg font-black">Chat Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleOpenChat}
              className="border-3 border-black bg-emerald-300 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Open Chat
            </button>
            <button
              onClick={handleClearChat}
              className="border-3 border-black bg-gray-200 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Clear Chat
            </button>
            <button
              onClick={handleRenderChord}
              className="border-3 border-black bg-yellow-200 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Render Chord
            </button>
            <button
              onClick={handleRenderSampleAnalysis}
              className="border-3 border-black bg-purple-200 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Render Sample Analysis
            </button>
          </div>
          <div className="text-xs font-bold text-gray-600">
            Messages in chat: {chatMessages.length}
          </div>
        </section>
      )}

      {leftPanelMode === "Create" && (
        <section className="space-y-3">
          <h2 className="text-lg font-black">Create Preview</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold text-gray-600">
              Bars
              <input
                type="number"
                min={1}
                max={64}
                value={bars}
                onChange={(event) => setBars(Number(event.target.value))}
                className="w-24 rounded-md border-3 border-black px-3 py-2 text-base font-black"
              />
            </label>
            <button
              onClick={handleGeneratePreview}
              disabled={generateBackingTrack.isLoading}
              className="border-3 border-black bg-blue-200 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              {generateBackingTrack.isLoading
                ? "Generating…"
                : "Generate Preview"}
            </button>
          </div>
          {generateError && (
            <div className="rounded-lg border-3 border-black bg-red-100 p-3 text-xs font-bold text-red-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              {generateError}
            </div>
          )}
          <textarea
            value={generatedCode}
            readOnly
            placeholder="Generated Strudel code will appear here..."
            className="h-40 w-full resize-none rounded-lg border-3 border-black bg-gray-50 p-3 font-mono text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </section>
      )}

      {leftPanelMode === "TrackSettings" && (
        <section className="space-y-3">
          <h2 className="text-lg font-black">Settings & Parsing</h2>
          <textarea
            value={draftStrudel}
            onChange={(event) => setDraftStrudel(event.target.value)}
            className="h-44 w-full resize-none rounded-lg border-3 border-black bg-white p-3 font-mono text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleApplyDraft}
              className="border-3 border-black bg-orange-300 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Apply Strudel
            </button>
            <button
              onClick={() => setDraftStrudel(strudelCode)}
              className="border-3 border-black bg-gray-200 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            >
              Reset Draft
            </button>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase text-gray-700">
              Parsing Console
            </h3>
            {diagnostics.errors.length > 0 ? (
              <ul className="space-y-2">
                {diagnostics.errors.map((error) => (
                  <li
                    key={error}
                    className="rounded-lg border-3 border-black bg-red-100 p-3 text-xs font-bold text-red-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    {error}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-lg border-3 border-black bg-emerald-100 p-3 text-xs font-bold text-emerald-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                No parsing errors detected.
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase text-gray-700">
              Parsing Debug Info
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border-3 border-black bg-gray-50 p-3 text-xs font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="mb-2 text-gray-600">Parsed Chords</p>
                <p className="text-base font-black">
                  {diagnostics.parsedChords.length}
                </p>
              </div>
              <div className="rounded-lg border-3 border-black bg-gray-50 p-3 text-xs font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="mb-2 text-gray-600">Tracks</p>
                <p className="text-base font-black">{diagnostics.tracks.length}</p>
              </div>
            </div>
            <div className="rounded-lg border-3 border-black bg-white p-3 text-xs font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="mb-2 text-gray-600">Chord Tokens</p>
              {diagnostics.parsedChords.length > 0 ? (
                <ul className="space-y-1">
                  {diagnostics.parsedChords.map((token) => (
                    <li key={token.index} className="text-gray-800">
                      {Array.isArray(token.chord)
                        ? `[${token.chord.join(" ")}]`
                        : token.chord}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No chord tokens found.</p>
              )}
            </div>
            <div className="space-y-2">
              {diagnostics.tracks.length > 0 ? (
                diagnostics.tracks.map((track) => (
                  <div
                    key={track.instrument}
                    className="flex items-center justify-between rounded-lg border-3 border-black bg-yellow-100 px-3 py-2 text-xs font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <span>{track.instrument}</span>
                    <span>{track.gain.toFixed(2)}x</span>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border-3 border-dashed border-black bg-gray-50 px-3 py-2 text-xs font-bold text-gray-500">
                  No instrument comments detected.
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default function LeftPanelDebugPage() {
  return (
    <JamSessionProvider>
      <div className="grid min-h-screen grid-cols-[minmax(320px,1.1fr)_minmax(360px,1fr)] gap-6 bg-gradient-to-br from-pink-100 via-amber-100 to-cyan-100 p-6">
        <div className="rotate-[-0.4deg] overflow-hidden border-4 border-black bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <LeftPanel />
        </div>
        <LeftPanelDebugControls />
      </div>
    </JamSessionProvider>
  );
}
