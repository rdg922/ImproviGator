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
  id?: string;
  role: "user" | "assistant";
  content: string;
  suggestedChords?: Array<{ chord: string; voicingIndex?: number }>;
  isThinking?: boolean;
  suggestedResponses?: string[];
}

export interface ConversationEntry {
  role: "user" | "model";
  parts: Array<{ text?: string }>;
}

export type LeftPanelMode = "Create" | "Chat" | "TrackSettings" | null;

type AnalysisMutation = {
  mutateAsync: (input: AnalysisInput) => Promise<AnalysisOutput>;
};

type AnalysisApi = {
  chat: {
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
  instruments: string[];
  setInstruments: (instruments: string[]) => void;

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
  clearAnalysis: () => void;
}

const JamSessionContext = createContext<JamSessionContextType | undefined>(
  undefined,
);

const DEFAULT_STRUDEL_CODE = `setcps(120/60/4)

// 16 Bar Chill Jazz Progression in C Major
let chords = chord("<C^9 A-7 D-9 G13 C^9 A7b13 D-9 G7alt C^9 C7 F^7 F-7 C^9 A-7 D-9 G13>")

// Synth
$: chords.voicing().s("gm_epiano1").struct("x ~ x ~ ~ x ~ ~").room(0.6).velocity(0.6).swingBy(1/3, 4).gain(1)

// Bass
$: chords.rootNotes().s("gm_acoustic_bass").struct("x ~ ~ x x ~ ~ ~").octave(2).gain(0.8).lpf(400).gain(1)

// Drums
$: s("bd ~ bd ~").bank("RolandTR808").gain(0.7)
$: s("hh*8").bank("RolandTR808").velocity("<0.5 0.2>").swingBy(1/3, 4).gain(1)`;

export function JamSessionProvider({ children }: { children: ReactNode }) {
  const strudelRef = useRef<any>(null);
  const [leftPanelMode, setLeftPanelMode] = useState<LeftPanelMode>("Create");
  const [key, setKey] = useState("C");
  const [modality, setModality] = useState("Major");
  const [tempo, setTempo] = useState(120);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [instruments, setInstruments] = useState<string[]>([
    "drums",
    "piano",
    "bass",
    "guitar",
  ]);
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
  ).chat.analyzeRecording.useMutation();

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

  const clearAnalysis = () => {
    setAnalysisResult(null);
    setAnalysisError(null);
    setAnalysisStatus("idle");
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
        instruments,
        setInstruments,
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
        setAnalysisStatus,
        analysisError,
        runAnalysis,
        clearAnalysis,
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
