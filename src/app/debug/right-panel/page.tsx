"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import RightPanel from "../../jam/_components/right-panel";
import {
  JamSessionProvider,
  useJamSession,
} from "../../jam/_components/context/jam-session-context";
import {
  detectNotesFromAudio,
  loadAudioFromBlob,
  type PitchDetectionParams,
} from "~/lib/analysis/pitch-detection";

const DEFAULT_PITCH_PARAMS: PitchDetectionParams = {
  noteSegmentation: 0.5,
  modelConfidenceThreshold: 0.3,
  minPitchHz: 0,
  maxPitchHz: 3000,
  minNoteLengthMs: 11,
};

function DebugPanel() {
  const {
    strudelCode,
    setStrudelCode,
    tempo,
    setTempo,
    timeSignature,
    setTimeSignature,
    parsedChords,
    recording,
    setRecording,
    setMidiData,
    runAnalysis,
    analysisStatus,
    analysisError,
    clearAnalysis,
  } = useJamSession();
  const [draftCode, setDraftCode] = useState(strudelCode);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    setDraftCode(strudelCode);
  }, [strudelCode]);

  const chordCount = parsedChords.length || 0;

  const sampleRecording = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, idx) => ({
        pitch: 60 + (idx % 7),
        velocity: 90,
        startTime: idx * 250,
        duration: 200,
      })),
    [],
  );

  const handleApplyStrudel = () => {
    setStrudelCode(draftCode);
  };

  const handleResetRecording = () => {
    setRecording(null);
    setMidiData([]);
    clearAnalysis();
  };

  const handleLoadSampleRecording = () => {
    const duration = sampleRecording.at(-1)?.startTime ?? 0;
    const newRecording = {
      notes: sampleRecording,
      duration: duration + 250,
      timestamp: new Date(),
    };
    setRecording(newRecording);
    setMidiData(sampleRecording);
    clearAnalysis();
  };

  const handleAudioUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const audioBuffer = await loadAudioFromBlob(file);
      let detectedNotes = await detectNotesFromAudio(
        audioBuffer,
        DEFAULT_PITCH_PARAMS,
      );
      if (detectedNotes.length === 0) {
        detectedNotes = await detectNotesFromAudio(
          audioBuffer,
          DEFAULT_PITCH_PARAMS,
        );
      }
      const midiNotes = detectedNotes.map((note) => ({
        pitch: Math.round(note.pitchMidi),
        velocity: Math.max(
          1,
          Math.min(127, Math.round((note.amplitude || 0.6) * 127)),
        ),
        startTime: Math.max(0, Math.round(note.startTimeSeconds * 1000)),
        duration: Math.max(1, Math.round(note.durationSeconds * 1000)),
      }));
      const duration = Math.round(audioBuffer.duration * 1000);
      const newRecording = {
        notes: midiNotes,
        duration,
        timestamp: new Date(),
      };
      setRecording(newRecording);
      setMidiData(midiNotes);
      clearAnalysis();
    } catch (error) {
      console.error("Upload analysis failed:", error);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-hidden rounded-2xl border-4 border-black bg-white p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div>
        <p className="text-xs font-black tracking-[0.3em] text-gray-700 uppercase">
          debug panel
        </p>
        <h1 className="text-3xl font-black">Right Panel Lab</h1>
        <p className="text-sm font-bold text-gray-600">
          Test Strudel edits, playback, and analysis without touching the main
          jam page.
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-black">Strudel Backing Track</h2>
        <textarea
          className="h-48 w-full resize-none rounded-lg border-3 border-black p-3 font-mono text-xs shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          value={draftCode}
          onChange={(event) => setDraftCode(event.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleApplyStrudel}
            className="border-3 border-black bg-emerald-300 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            Apply Strudel
          </button>
          <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
            <span>Parsed chords:</span>
            <span className="rounded-full border-2 border-black bg-yellow-200 px-2 py-0.5 text-xs font-black">
              {chordCount}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-black">Timing Controls</h2>
        <div className="flex flex-wrap gap-4">
          <label className="flex flex-col gap-2 text-sm font-bold text-gray-700">
            Tempo (BPM)
            <input
              type="number"
              min={40}
              max={220}
              value={tempo}
              onChange={(event) => setTempo(Number(event.target.value))}
              className="w-32 rounded-md border-3 border-black px-3 py-2 text-base font-black"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-bold text-gray-700">
            Time Signature
            <input
              type="text"
              value={timeSignature}
              onChange={(event) => setTimeSignature(event.target.value)}
              className="w-28 rounded-md border-3 border-black px-3 py-2 text-base font-black"
            />
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-black">Recording & Analysis</h2>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 border-3 border-black bg-blue-200 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
              className="hidden"
            />
            {isUploading ? "Processing…" : "Upload Audio"}
          </label>
          <button
            onClick={handleLoadSampleRecording}
            className="border-3 border-black bg-amber-200 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            Load Sample Notes
          </button>
          <button
            onClick={handleResetRecording}
            className="border-3 border-black bg-gray-200 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            Clear Recording
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void runAnalysis()}
            disabled={analysisStatus === "loading"}
            className="border-3 border-black bg-purple-300 px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
          >
            {analysisStatus === "loading" ? "Analyzing…" : "Run Analysis"}
          </button>
          <button
            onClick={clearAnalysis}
            className="border-3 border-black bg-white px-4 py-2 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            Clear Analysis
          </button>
          <div className="text-xs font-bold text-gray-600">
            {recording
              ? `Recorded notes: ${recording.notes.length}`
              : "No recording loaded"}
          </div>
        </div>
        {analysisError && (
          <p className="rounded-lg border-3 border-black bg-red-100 p-3 text-xs font-bold text-red-700 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {analysisError}
          </p>
        )}
      </div>
    </div>
  );
}

export default function RightPanelDebugPage() {
  return (
    <JamSessionProvider>
      <div className="grid min-h-screen grid-cols-[minmax(320px,1.1fr)_2fr] gap-6 bg-gradient-to-br from-pink-100 via-amber-100 to-cyan-100 p-6">
        <DebugPanel />
        <div className="rotate-[0.4deg] overflow-hidden border-4 border-black bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <RightPanel />
        </div>
      </div>
    </JamSessionProvider>
  );
}
