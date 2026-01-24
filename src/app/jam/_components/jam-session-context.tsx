"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { ReactNode, MutableRefObject } from "react";
import { handleStrudel } from "~/services/handleStrudel";

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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  suggestedChord?: string;
}

export interface ConversationEntry {
  role: "user" | "model";
  parts: Array<{ text?: string }>;
}
interface TrackSetting {
  instrument: string;
  gain: number;
}
interface JamSessionContextType {
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
  savedChords: string[];
  addSavedChord: (chord: string) => void;
  removeSavedChord: (chord: string) => void;

  // Generated strudel code
  strudelCode: string;
  setStrudelCode: (code: string) => void;
  tracks: TrackSetting[];
  setTrackGain: (instrument: string, gain: number) => void;
  parsedChords: Array<{ chord: string | string[]; index: number }>;
  
  // Shared Strudel player reference
  strudelPlayerRef: MutableRefObject<any>;

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
}

const JamSessionContext = createContext<JamSessionContextType | undefined>(
  undefined,
);

const DEFAULT_STRUDEL_CODE = `let chords = chord(\`<
F7 Bb7 F7 [Cm7 F7]
Bb7 Bo F7 [Am7 D7]
Gm7 C7 [F7 D7] [Gm7 C7]
>\`)
$: n("7 8 [10 9] 8").set(chords).voicing().dec(.2)
$: chords.struct("- x - x").voicing().room(.5)
$: n("0 - 1 -").set(chords).mode("root:g2").voicing()`;

export function JamSessionProvider({ children }: { children: ReactNode }) {
  const strudelPlayerRef = useRef<any>(null);
  const [key, setKey] = useState("C");
  const [modality, setModality] = useState("Major");
  const [tempo, setTempo] = useState(120);
  const [timeSignature, setTimeSignature] = useState("4/4");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [midiData, setMidiData] = useState<MidiNote[]>([]);
  const [savedChords, setSavedChords] = useState<string[]>([
    "Cmaj7",
    "Am7",
    "Dm7",
  ]);
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

  // Parse chords from Strudel code
  const parseChords = (code: string) => {
    // Match chord() with backticks, double quotes, or single quotes
    const chordLineMatch = code.match(
      /let\s+chords\s*=\s*chord\(([`"])([^`"']+)\1\)/s,
    );
    if (!chordLineMatch) return [];

    let rawContent = chordLineMatch[2];

    // Try to extract content within < > to ignore multipliers like *4
    // If no angle brackets, use the entire content
    const angleMatch = rawContent.match(/<([^>]+)>/s);
    if (angleMatch) {
      rawContent = angleMatch[1];
    }

    // Remove comments (// single-line comments)
    let chordContent = rawContent
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
      while (i < chordContent.length && /\s/.test(chordContent[i])) {
        i++;
      }
      if (i >= chordContent.length) break;

      // Check for bracketed group
      if (chordContent[i] === "[") {
        i++;
        const groupChords: string[] = [];
        let buffer = "";

        while (i < chordContent.length && chordContent[i] !== "]") {
          if (/\s/.test(chordContent[i])) {
            if (buffer) {
              groupChords.push(buffer);
              buffer = "";
            }
          } else {
            buffer += chordContent[i];
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
        while (i < chordContent.length && !/[\s\[\]]/.test(chordContent[i])) {
          buffer += chordContent[i];
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

  const setStrudelCode = (code: string) => {
    setStrudelCodeState(code);
  };

  const setTrackGain = (instrument: string, gain: number) => {
    setStrudelCodeState((prev) =>
      handleStrudel.set_gain(prev, instrument, gain),
    );
  };

  const addSavedChord = (chord: string) => {
    if (!savedChords.includes(chord)) {
      setSavedChords([...savedChords, chord]);
    }
  };

  const removeSavedChord = (chord: string) => {
    setSavedChords(savedChords.filter((c) => c !== chord));
  };

  return (
    <JamSessionContext.Provider
      value={{
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
        removeSavedChord,
        strudelCode,
        setStrudelCode,
        tracks,
        setTrackGain,
        parsedChords,
        strudelPlayerRef,
        description,
        setDescription,
        chatMessages,
        setChatMessages,
        conversationHistory,
        setConversationHistory,
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
