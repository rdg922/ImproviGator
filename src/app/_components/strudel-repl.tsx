"use client";

import { useEffect, useRef, useState } from "react";
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

type StrudelReplProps = {
  code?: string;
  className?: string;
};

let prebakePromise: Promise<void> | null = null;

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
  // Preload a core collection of sample libraries so the REPL has instant access.
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

export function StrudelRepl({ code = "", className }: StrudelReplProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<any>(null);
  const initialCodeRef = useRef(code);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!editorRef.current) {
      initialCodeRef.current = code;
      return;
    }

    if (code !== editorRef.current.code) {
      editorRef.current.setCode?.(code);
      editorRef.current.code = code;
      setError(null);
    }
  }, [code]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root || editorRef.current) {
      return;
    }

    let mounted = true;

    const editor = new StrudelMirror({
      root,
      initialCode: initialCodeRef.current ?? "",
      defaultOutput: webaudioOutput,
      getTime: () => getAudioContext().currentTime,
      transpiler,
      prebake: ensureAudioReady,
      onToggle: (started: boolean) => {
        if (!mounted) {
          return;
        }
        setIsPlaying(started);
        if (!started) {
          setError(null);
        }
      },
    });

    editorRef.current = editor;
    setIsReady(true);

    return () => {
      mounted = false;
      editor.stop?.();
      editor.clear?.();
      root.innerHTML = "";
      editorRef.current = null;
    };
  }, []);

  const handlePlay = async () => {
    if (!editorRef.current) {
      return;
    }
    setError(null);
    try {
      await editorRef.current.evaluate();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to play Strudel code";
      setError(message);
    }
  };

  const handlePause = () => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.stop?.();
    setIsPlaying(false);
  };

  const classes = ["flex flex-col gap-3", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handlePlay}
          disabled={!isReady}
          className="rounded bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPlaying ? "Playing" : "Play"}
        </button>
        <button
          type="button"
          onClick={handlePause}
          disabled={!isReady || !isPlaying}
          className="rounded bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Pause
        </button>
      </div>

      <div
        ref={containerRef}
        className="min-h-[300px] w-full rounded border border-white/10 bg-black/30 p-2"
      />

      {!isReady && (
        <p className="text-sm text-gray-300">Loading Strudel editor…</p>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
