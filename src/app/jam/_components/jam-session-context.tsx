"use client";

import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

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

interface JamSessionContextType {
  // Musical parameters
  key: string;
  setKey: (key: string) => void;
  modality: string;
  setModality: (modality: string) => void;
  tempo: number;
  setTempo: (tempo: number) => void;
  
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
  
  // Description/prompt
  description: string;
  setDescription: (description: string) => void;
}

const JamSessionContext = createContext<JamSessionContextType | undefined>(undefined);

export function JamSessionProvider({ children }: { children: ReactNode }) {
  const [key, setKey] = useState("C");
  const [modality, setModality] = useState("Major");
  const [tempo, setTempo] = useState(120);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [midiData, setMidiData] = useState<MidiNote[]>([]);
  const [savedChords, setSavedChords] = useState<string[]>(["Cmaj7", "Am7", "Dm7"]);
  const [strudelCode, setStrudelCode] = useState("");
  const [description, setDescription] = useState("");

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
        recording,
        setRecording,
        midiData,
        setMidiData,
        savedChords,
        addSavedChord,
        removeSavedChord,
        strudelCode,
        setStrudelCode,
        description,
        setDescription,
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
