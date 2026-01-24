"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode, MutableRefObject } from "react";
import { handleStrudel } from "~/services/handleStrudel";
import { api } from "~/trpc/react";
import type { AnalysisInput, AnalysisOutput } from "~/types/analysis";

interface MidiNote {
  pitch: number;
  velocity: number;
  startTime: number;
  duration: number;
}

interface Recording {
  notes: MidiNote[];
  duration: number;
  timestamp: Date;
}

export interface SavedChord {
  name: string;
  voicingIndex: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestedChords?: Array<{ chord: string; voicingIndex?: number }>;
  suggestedResponses?: string[];
}

export interface ConversationEntry {
  role: "user" | "model";
  parts: Array<{ text?: string }>;
}

export type LeftPanelMode = "Create" | "Chat" | "TrackSettings";

type AnalysisMutation = {
  mutateAsync: (input: AnalysisInput) => Promise<AnalysisOutput>;
};

type AnalysisApi = {
  analysis: {
    analyzeRecording: {
      useMutation: () => AnalysisMutation;
    };
  };
};
interface TrackSetting {
  instrument: string;
  gain: number;
}
interface JamSessionContextType {
  leftPanelMode: LeftPanelMode;
  setLeftPanelMode: (mode: LeftPanelMode) => void;
  // Musical parameters
  key: string;
  setKey: (key: string) => void;
  modality: string;
  setModality: (modality: string) => void;
  tempo: number;
  setTempo: (tempo: number) => void;
  timeSignature: string;
  setTimeSignature: (timeSignature: string) => void;

  // Recording data
  recording: Recording | null;
  setRecording: (recording: Recording | null) => void;
  midiData: MidiNote[];
  setMidiData: (data: MidiNote[]) => void;

  // Saved chords
  savedChords: SavedChord[];
  addSavedChord: (chord: string, voicingIndex?: number) => void;
  updateSavedChordVoicing: (chord: string, voicingIndex: number) => void;
  removeSavedChord: (chord: string) => void;

  // Generated strudel code
  strudelCode: string;
  setStrudelCode: (code: string) => void;
  tracks: TrackSetting[];
  setTrackGain: (instrument: string, gain: number) => Promise<void>;
  parsedChords: Array<{ chord: string | string[]; index: number }>;

  // Shared Strudel player reference
  strudelRef: MutableRefObject<any>;

  // Description/prompt
  description: string;
  setDescription: (description: string) => void;

  // Chat state
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  conversationHistory: ConversationEntry[];
  setConversationHistory: React.Dispatch<
    React.SetStateAction<ConversationEntry[]>
  >;

  // Analysis state
  analysisResult: AnalysisOutput | null;
  analysisStatus: "idle" | "loading" | "success" | "error";
  analysisError: string | null;
  runAnalysis: (overrides?: Partial<AnalysisInput>) => Promise<void>;
}

const JamSessionContext = createContext<JamSessionContextType | undefined>(
  undefined,
);

const DEFAULT_STRUDEL_CODE = `let chords = chord(\`<
F7 Bb7 F7 [Cm7 F7]
>\`)
// Piano
$: n("7 8 [10 9] 8").set(chords).voicing().dec(.2).gain(1)
// Keys
$: chords.struct("- x - x").voicing().room(.5).gain(1)
// Bass
$: n("0 - 1 -").set(chords).mode("root:g2").voicing().gain(1)`;

export function JamSessionProvider({ children }: { children: ReactNode }) {
  const strudelRef = useRef<any>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>("Create");
  const [key, setKey] = useState("C");
  const [modality, setModality] = useState("Major");
  const [tempo, setTempo] = useState(120);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [midiData, setMidiData] = useState<MidiNote[]>([]);
  const [savedChords, setSavedChords] = useState<SavedChord[]>([]);
  const [strudelCode, setStrudelCodeState] = useState(DEFAULT_STRUDEL_CODE);
  const [tracks, setTracks] = useState<TrackSetting[]>([]);
  const [parsedChords, setParsedChords] = useState<
    Array<{ chord: string | string[]; index: number }>
  >([]);
  const [description, setDescription] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hi! I can help you edit the backing track, show scales on the fretboard, or save chords. What would you like to do?",
    },
  ]);
  const [conversationHistory, setConversationHistory] = useState<
    ConversationEntry[]
  >([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisOutput | null>(
    null,
  );
  const [analysisStatus, setAnalysisStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const analysisMutation = (
    api as unknown as AnalysisApi
  ).analysis.analyzeRecording.useMutation();

  // Parse chords from Strudel code
  const parseChords = (code: string) => {
    // Match chord() with backticks, double quotes, or single quotes (with or without assignment)
    const assignmentMatch =
      /\b\w+\s*=\s*chord\(\s*([`"'])([\s\S]*?)\1\s*\)/s.exec(code);
    const directMatch = /\bchord\(\s*([`"'])([\s\S]*?)\1\s*\)/s.exec(code);
    const templateMatch = /\bchord\s*`([\s\S]*?)`/s.exec(code);

    const chordLineMatch = assignmentMatch ?? directMatch;
    let rawContent = chordLineMatch?.[2] ?? templateMatch?.[1] ?? "";
    if (!rawContent) return [];
    if (!rawContent) return [];

    // Try to extract content within < > to ignore multipliers like *4
    // If no angle brackets, use the entire content
    const angleMatch = /<([^>]+)>/s.exec(rawContent);
    if (angleMatch?.[1]) {
      rawContent = angleMatch[1];
    }

    // Remove comments (// single-line comments)
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
      // Skip whitespace
      while (i < chordContent.length && /\s/.test(chordContent[i] ?? "")) {
        i++;
      }
      if (i >= chordContent.length) break;

      // Check for bracketed group
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
        i++; // skip ']'
      } else {
        // Single chord
        let buffer = "";
        while (
          i < chordContent.length &&
          !/[\s\[\]]/.test(chordContent[i] ?? "")
        ) {
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

  useEffect(() => {
    console.log("Strudel code changed, updating tracks and chords");
    setTracks(handleStrudel.get_tracks(strudelCode));
    const newChords = parseChords(strudelCode);
    console.log("Parsed chords:", newChords);
    setParsedChords(newChords);
  }, [strudelCode]);

  useEffect(() => {
    if (midiData.length > 0) return;
    if (recording?.notes?.length) {
      setMidiData(recording.notes);
    }
  }, [recording, midiData.length]);

  useEffect(() => {
    if (analysisStatus === "success") {
      setLeftPanelMode("Chat");
    }
  }, [analysisStatus]);

  const setStrudelCode = (code: string) => {
    setStrudelCodeState(code);
  };

  const setTrackGain = async (instrument: string, gain: number) => {
    const newCode = handleStrudel.set_gain(strudelCode, instrument, gain);
    setStrudelCodeState(newCode);

    // Update the live player if it exists and is playing
    if (strudelRef.current) {
      try {
        await strudelRef.current.setCode?.(newCode);
        // Only re-evaluate to apply the gain change
        await strudelRef.current.evaluate?.();
      } catch (err) {
        console.error("Error updating gain:", err);
      }
    }
  };

  const addSavedChord = (chord: string, voicingIndex = 0) => {
    setSavedChords((prev) =>
      prev.some((saved) => saved.name === chord)
        ? prev
        : [...prev, { name: chord, voicingIndex }],
    );
  };

  const updateSavedChordVoicing = (chord: string, voicingIndex: number) => {
    setSavedChords((prev) =>
      prev.map((saved) =>
        saved.name === chord ? { ...saved, voicingIndex } : saved,
      ),
    );
  };

  const removeSavedChord = (chord: string) => {
    setSavedChords((prev) => prev.filter((saved) => saved.name !== chord));
  };

  const runAnalysis = async (overrides?: Partial<AnalysisInput>) => {
    if (analysisStatus === "loading") return;

    const effectiveMidiData =
      overrides?.midiData ??
      (midiData.length > 0 ? midiData : (recording?.notes ?? []));
    const effectiveParsedChords = overrides?.parsedChords ?? parsedChords;
    const effectiveTempo = overrides?.tempo ?? tempo;
    const effectiveTimeSignature = overrides?.timeSignature ?? timeSignature;
    const effectiveKey = overrides?.key ?? key;
    const effectiveModality = overrides?.modality ?? modality;

    if (effectiveMidiData.length === 0) {
      setAnalysisResult(null);
      setAnalysisError("No recorded notes available to analyze.");
      setAnalysisStatus("error");
      return;
    }

    if (effectiveParsedChords.length === 0) {
      setAnalysisResult(null);
      setAnalysisError(
        "No chords parsed from the backing track. Make sure your Strudel code includes a chord() pattern.",
      );
      setAnalysisStatus("error");
      return;
    }

    setAnalysisError(null);
    setAnalysisStatus("loading");

    try {
      const result = await analysisMutation.mutateAsync({
        midiData: effectiveMidiData,
        parsedChords: effectiveParsedChords,
        tempo: effectiveTempo,
        timeSignature: effectiveTimeSignature,
        key: effectiveKey,
        modality: effectiveModality,
      });
      setAnalysisResult(result);
      setAnalysisStatus(result.success ? "success" : "error");
      if (!result.success) {
        setAnalysisError("Analysis failed on the server.");
      }
    } catch (error) {
      setAnalysisStatus("error");
      setAnalysisError("Analysis request failed.");
      console.error("Analysis error:", error);
    }
  };

  return (
    <JamSessionContext.Provider
      value={{
        leftPanelMode,
        setLeftPanelMode,
        key,
        setKey,
        modality,
        setModality,
        tempo,
        setTempo,
        timeSignature,
        setTimeSignature,
        recording,
        setRecording,
        midiData,
        setMidiData,
        savedChords,
        addSavedChord,
        updateSavedChordVoicing,
        removeSavedChord,
        strudelCode,
        setStrudelCode,
        tracks,
        setTrackGain,
        parsedChords,
        strudelRef,
        description,
        setDescription,
        chatMessages,
        setChatMessages,
        conversationHistory,
        setConversationHistory,
        analysisResult,
        analysisStatus,
        analysisError,
        runAnalysis,
      }}
    >
      {children}
    </JamSessionContext.Provider>
  );
}

export function useJamSession() {
  const context = useContext(JamSessionContext);
  if (context === undefined) {
    throw new Error("useJamSession must be used within a JamSessionProvider");
  }
  return context;
}
