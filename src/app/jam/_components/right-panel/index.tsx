"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import RightPanelGrid from "./grid";
import RightPanelRecording from "./recording";
import { useJamSession } from "../context/jam-session-context";
import { useAudioRecorder } from "~/hooks/useAudioRecorder";
import { detectNotesFromAudio, loadAudioFromBlob } from "~/lib/audio/pitch-detection";
import { StrudelMirror } from "@strudel/codemirror";
import { evalScope } from "@strudel/core";
import { transpiler } from "@strudel/transpiler";
import {
  getAudioContext,
  initAudioOnFirstClick,
  registerSynthSounds,
  samples,
  webaudioOutput,
} from "@strudel/webaudio";

type RightView = "Grid" | "Recording";

let prebakePromise: Promise<void> | null = null;

const sanitizeStrudelCode = (code: string) => {
  const trimmed = code.trim();
  const fenced = /^```(?:\w+)?\s*([\s\S]*?)\s*```$/m.exec(trimmed);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }
  return trimmed;
};

const loadSamples = () => {
  const ds = "https://raw.githubusercontent.com/felixroos/dough-samples/main/";
  const files = [
    "tidal-drum-machines.json",
    "piano.json",
    "Dirt-Samples.json",
    "EmuSP12.json",
    "vcsl.json",
    "mridangam.json",
  ];
  return Promise.all(files.map((file) => samples(`${ds}${file}`)));
};

const ensureAudioReady = () => {
  if (!prebakePromise) {
    prebakePromise = (async () => {
      initAudioOnFirstClick();
      const loadModules = evalScope(
        import("@strudel/core"),
        import("@strudel/draw"),
        import("@strudel/mini"),
        import("@strudel/tonal"),
        import("@strudel/webaudio"),
      );
      const loadSoundfonts = import("@strudel/soundfonts").then(
        (mod) => mod.registerSoundfonts?.() ?? Promise.resolve(),
      );
      await Promise.all([
        loadModules,
        registerSynthSounds(),
        loadSoundfonts,
        loadSamples(),
      ]);
    })();
  }

  return prebakePromise;
};

export default function RightPanel() {
  const {
    recording,
    setRecording,
    setMidiData,
    midiData,
    parsedChords,
    strudelCode,
    strudelRef,
    tempo,
    timeSignature,
    runAnalysis,
    analysisStatus,
  } = useJamSession();

  const [view, setView] = useState<RightView>("Grid");
  const [currentChordIndex, setCurrentChordIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTakePlaying, setIsTakePlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [countdownBeats, setCountdownBeats] = useState<number | null>(null);
  const [countdownMode, setCountdownMode] = useState<"play" | "record" | null>(
    null,
  );
  const [isReady, setIsReady] = useState(false);
  const { startRecording, stopRecording } = useAudioRecorder();
  const autoStopRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const recordingTimeoutRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [recordingAudioUrl, setRecordingAudioUrl] = useState<string | null>(
    null,
  );
  const [takePlaybackMs, setTakePlaybackMs] = useState(0);
  const [recordingResetToken, setRecordingResetToken] = useState(0);
  const hasRecordingAudio = Boolean(recordingAudioUrl && recording);

  // Initialize Strudel audio
  useEffect(() => {
    ensureAudioReady().then(() => {
      setIsReady(true);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        window.clearInterval(countdownTimerRef.current);
      }
      if (recordingTimeoutRef.current) {
        window.clearTimeout(recordingTimeoutRef.current);
      }
      if (recordingAudioUrl) {
        URL.revokeObjectURL(recordingAudioUrl);
      }
    };
  }, [recordingAudioUrl]);

  const stopPlayback = () => {
    if (strudelRef.current) {
      strudelRef.current.stop?.();
    }
    setIsPlaying(false);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsTakePlaying(false);
      stopPlayback();
    };

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [recordingAudioUrl, stopPlayback]);

  useEffect(() => {
    if (!isTakePlaying || !audioRef.current) {
      setTakePlaybackMs(0);
      return;
    }

    let animationFrame = 0;
    const update = () => {
      if (!audioRef.current) return;
      setTakePlaybackMs(audioRef.current.currentTime * 1000);
      animationFrame = window.requestAnimationFrame(update);
    };

    animationFrame = window.requestAnimationFrame(update);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [isTakePlaying, recordingAudioUrl]);

  // Initialize Strudel evaluator
  useEffect(() => {
    if (!containerRef.current || strudelRef.current) return;

    const editor = new StrudelMirror({
      root: containerRef.current,
      initialCode: "",
      defaultOutput: webaudioOutput,
      getTime: () => getAudioContext().currentTime,
      transpiler,
      prebake: ensureAudioReady,
      onToggle: (started: boolean) => {
        setIsPlaying(started);
      },
    });

    strudelRef.current = editor;

    return () => {
      editor.stop?.();
      editor.clear?.();
      strudelRef.current = null;
    };
  }, [strudelRef]);

  const highlightedChordIndex = useMemo(() => {
    const sliceCount = parsedChords.length;
    if (!sliceCount) {
      return 0;
    }
    return currentChordIndex % sliceCount;
  }, [parsedChords, currentChordIndex]);

  // Track chord progression based on playback time
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      const chordCount = parsedChords.length || 4;
      setCurrentChordIndex((prev) => (prev + 1) % chordCount);
    }, 2000); // Update every 2 seconds - adjust based on tempo

    return () => clearInterval(interval);
  }, [isPlaying, parsedChords.length]);

  const handleReset = () => {
    if (view === "Recording") {
      setRecordingResetToken((prev) => prev + 1);
      stopTakePlayback();
      stopPlayback();
      return;
    }
    setCurrentChordIndex(0);
    clearCountdown();
    clearRecordingTimeout();
    if (strudelRef.current) {
      strudelRef.current.stop?.();
    }
    setIsPlaying(false);
  };

  const getBeatsPerBar = () => {
    const numerator = Number(timeSignature.split("/")[0]);
    return Number.isFinite(numerator) && numerator > 0 ? numerator : 4;
  };

  const getBeatDurationMs = () => {
    if (!Number.isFinite(tempo) || tempo <= 0) return 500;
    return Math.max(200, Math.round((60 / tempo) * 1000));
  };

  const getPlaythroughDurationMs = () => {
    const beatMs = getBeatDurationMs();
    const beatsPerBar = getBeatsPerBar();
    const bars = parsedChords.length > 0 ? parsedChords.length : 4;
    return bars * beatsPerBar * beatMs;
  };

  const playClick = () => {
    try {
      const context = getAudioContext();
      const osc = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      osc.type = "square";
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain).connect(context.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // Ignore audio click errors
    }
  };

  const clearCountdown = () => {
    if (countdownTimerRef.current) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdownBeats(null);
    setCountdownMode(null);
  };

  const clearRecordingTimeout = () => {
    if (recordingTimeoutRef.current) {
      window.clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    autoStopRef.current = false;
  };

  const startPlayback = async () => {
    if (!isReady || !strudelCode || !strudelRef.current) return;
    try {
      const cleanedCode = sanitizeStrudelCode(strudelCode);
      await strudelRef.current.setCode?.(cleanedCode);
      await strudelRef.current.evaluate();
      // isPlaying will be set by onToggle callback
    } catch (err) {
      console.error("Error playing Strudel:", err);
      setIsPlaying(false);
    }
  };

  const stopTakePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsTakePlaying(false);
  };

  const startAudioCapture = async () => {
    try {
      setMidiData([]);
      setRecording(null);
      if (recordingAudioUrl) {
        URL.revokeObjectURL(recordingAudioUrl);
        setRecordingAudioUrl(null);
      }
      await startRecording();
      return true;
    } catch (err) {
      console.error(
        "Error starting audio recording:",
        err instanceof Error ? err.message : err,
      );
    }
    return false;
  };

  const stopAudioCapture = async (durationOverride?: number) => {
    try {
      const audioBlob = await stopRecording();
      const audioUrl = URL.createObjectURL(audioBlob);
      setRecordingAudioUrl(audioUrl);
      const audioBuffer = await loadAudioFromBlob(audioBlob);
      let detectedNotes = await detectNotesFromAudio(audioBuffer);
      if (detectedNotes.length === 0) {
        detectedNotes = await detectNotesFromAudio(audioBuffer);
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
      const duration =
        durationOverride ?? Math.round(audioBuffer.duration * 1000);
      const newRecording = {
        notes: midiNotes,
        duration,
        timestamp: new Date(),
      };
      setRecording(newRecording);
      setMidiData(midiNotes);
      return midiNotes;
    } catch (err) {
      console.error(
        "Error processing audio recording:",
        err instanceof Error ? err.message : err,
      );
    }
    return undefined;
  };

  const finalizeRecording = async (durationOverride?: number) => {
    autoStopRef.current = false;
    setIsRecording(false);
    stopPlayback();
    const midiNotes = await stopAudioCapture(durationOverride);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    const fallbackNotes = recording?.notes ?? midiData;
    const effectiveNotes =
      midiNotes && midiNotes.length > 0 ? midiNotes : fallbackNotes;
    await runAnalysis({ midiData: effectiveNotes });
  };

  const startCountdown = (mode: "play" | "record") => {
    if (countdownMode || isRecording) return;
    if (!isReady || !strudelCode || !strudelRef.current) return;
    const beats = getBeatsPerBar();
    const beatMs = getBeatDurationMs();
    setCountdownMode(mode);
    setCountdownBeats(beats);
    let remaining = beats;

    playClick();

    countdownTimerRef.current = window.setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearCountdown();
        if (mode === "play") {
          void startPlayback();
        } else {
          setIsRecording(true);
          void startPlayback();
          const playthroughMs = getPlaythroughDurationMs();
          clearRecordingTimeout();
          autoStopRef.current = true;
          void (async () => {
            const startAt = performance.now();
            const started = await startAudioCapture();
            if (!started) {
              autoStopRef.current = false;
              setIsRecording(false);
              return;
            }
            const elapsed = performance.now() - startAt;
            const remainingMs = Math.max(0, playthroughMs - elapsed);
            recordingTimeoutRef.current = window.setTimeout(() => {
              if (autoStopRef.current) {
                void finalizeRecording(playthroughMs);
              }
            }, remainingMs);
          })();
        }
      } else {
        setCountdownBeats(remaining);
        playClick();
      }
    }, beatMs);
  };

  const handlePlay = async () => {
    if (view === "Recording") {
      if (isTakePlaying) {
        stopTakePlayback();
        stopPlayback();
        return;
      }
      if (!recordingAudioUrl || !recording) return;
      // await startPlayback();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        try {
          await audioRef.current.play();
          setIsTakePlaying(true);
        } catch (err) {
          console.error("Error playing take audio:", err);
          stopPlayback();
        }
      }
      return;
    }
    if (!isReady || !strudelCode || !strudelRef.current) return;
    if (isPlaying) {
      stopPlayback();
      return;
    }
    startCountdown("play");
  };

  const handleRecord = () => {
    if (isRecording) {
      clearRecordingTimeout();
      void finalizeRecording();
      return;
    }
    setCurrentChordIndex(0);
    if (isPlaying) {
      stopPlayback();
    } else if (strudelRef.current) {
      strudelRef.current.stop?.();
    }
    startCountdown("record");
  };

  const handleToggleView = () => {
    setView(view === "Grid" ? "Recording" : "Grid");
  };

  useEffect(() => {
    if (view === "Grid" && isTakePlaying) {
      stopTakePlayback();
    }
  }, [view, isTakePlaying, stopTakePlayback]);

  return (
    <div className="relative mb-4 flex h-full flex-col border-4 border-black bg-amber-200 p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] gap-2">
      <div
        ref={containerRef}
        className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
        aria-hidden="true"
      />
      {countdownMode && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40">
          <div className="flex flex-col items-center rounded-2xl border-4 border-black bg-yellow-200 px-10 py-8 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black tracking-wide text-gray-700 uppercase">
              {countdownMode === "record"
                ? "Recording starts in"
                : "Playback starts in"}
            </p>
            <div className="relative mt-2">
              <span className="animate-bounce text-7xl font-black text-red-600">
                {countdownBeats}
              </span>
              <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-red-300 opacity-50" />
            </div>
            <p className="mt-2 text-sm font-bold text-gray-600">
              {timeSignature} • {tempo} BPM
            </p>
          </div>
        </div>
      )}
      {view === "Grid" ? (
        <RightPanelGrid highlightedIndex={highlightedChordIndex} />
      ) : (
        <RightPanelRecording
          resetToken={recordingResetToken}
          currentTimeMs={takePlaybackMs}
          isPlaying={isTakePlaying}
        />
      )}
      <audio ref={audioRef} src={recordingAudioUrl ?? undefined} />

      {/* Unified Controls - Always visible */}
      <div className="flex justify-center gap-4">
        {view !== "Recording" && (
          <button
            onClick={handleReset}
            className="border-4 border-black bg-orange-300 px-10 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.75 hover:translate-y-0.75 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none"
          >
            ⏮ Reset
          </button>
        )}

        <button
          onClick={handlePlay}
          disabled={
            view === "Recording"
              ? !hasRecordingAudio
              : !isReady || !strudelCode || countdownMode !== null
          }
          className={`border-4 border-black px-10 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.75 hover:translate-y-0.75 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${
            view === "Recording"
              ? isTakePlaying
                ? "bg-red-400"
                : "bg-green-400"
              : isPlaying
                ? "bg-red-400"
                : "bg-green-400"
          }`}
        >
          {view === "Recording"
            ? isTakePlaying
              ? "⏸ Pause"
              : "▶ Play Take"
            : isPlaying
              ? "⏸ Pause"
              : "▶ Play"}
        </button>

        <button
          onClick={handleRecord}
          disabled={countdownMode !== null}
          className={`border-4 border-black px-10 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.75 hover:translate-y-0.75 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none ${
            isRecording ? "bg-red-500" : "bg-blue-400"
          }`}
        >
          {isRecording ? "⏹ Stop Recording" : "⏺ Record"}
        </button>

        <button
          onClick={handleToggleView}
          disabled={!recording || analysisStatus === "loading"}
          className={`border-4 border-black px-10 py-4 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.75 hover:translate-y-0.75 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-1.5 active:translate-y-1.5 active:shadow-none ${
            recording && analysisStatus !== "loading"
              ? "bg-purple-400"
              : "bg-gray-300 text-gray-500"
          }`}
        >
          {analysisStatus === "loading" ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
              Analyzing...
            </span>
          ) : view === "Grid" ? (
            "View Recording"
          ) : (
            "← Backing Track"
          )}
        </button>
      </div>
    </div>
  );
}
