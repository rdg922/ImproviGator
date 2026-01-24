"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { StrudelRepl } from "./strudel-repl";

export function LLMBackingTrackGenerator() {
  const [genre, setGenre] = useState("Bossa Nova");
  const [key, setKey] = useState("Eb");
  const [bars, setBars] = useState(16);
  const [instrumentsInput, setInstrumentsInput] =
    useState("drums, piano, bass");
  const [bpm, setBpm] = useState(130);

  const utils = api.useUtils();
  const generateBackingTrack = api.llm.generateBackingTrack.useMutation({
    onSuccess: async () => {
      await utils.llm.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const instruments = instrumentsInput
      .split(",")
      .map((i) => i.trim())
      .filter((i) => i);

    generateBackingTrack.mutate({
      genre,
      key,
      bars,
      instruments,
      bpm,
    });
  };

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-lg bg-white/10 p-6"
      >
        <h2 className="text-2xl font-bold">Generate Backing Track</h2>

        <div className="flex flex-col gap-2">
          <label htmlFor="genre" className="text-sm font-semibold">
            Genre
          </label>
          <input
            id="genre"
            type="text"
            placeholder="e.g., Bossa Nova, Jazz, Blues"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="rounded bg-white/10 px-4 py-2 text-white placeholder-gray-400"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="key" className="text-sm font-semibold">
            Key
          </label>
          <input
            id="key"
            type="text"
            placeholder="e.g., Eb, C, G"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="rounded bg-white/10 px-4 py-2 text-white placeholder-gray-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="bars" className="text-sm font-semibold">
              Bars (1-64)
            </label>
            <input
              id="bars"
              type="number"
              min={1}
              max={64}
              value={bars}
              onChange={(e) => setBars(Number(e.target.value))}
              className="rounded bg-white/10 px-4 py-2 text-white"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="bpm" className="text-sm font-semibold">
              BPM (40-240)
            </label>
            <input
              id="bpm"
              type="number"
              min={40}
              max={240}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="rounded bg-white/10 px-4 py-2 text-white"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="instruments" className="text-sm font-semibold">
            Instruments (comma-separated)
          </label>
          <input
            id="instruments"
            type="text"
            placeholder="e.g., drums, piano, bass"
            value={instrumentsInput}
            onChange={(e) => setInstrumentsInput(e.target.value)}
            className="rounded bg-white/10 px-4 py-2 text-white placeholder-gray-400"
          />
        </div>

        <button
          type="submit"
          className="rounded-full bg-white/10 px-10 py-3 font-semibold transition hover:bg-white/20 disabled:opacity-50"
          disabled={generateBackingTrack.isPending}
        >
          {generateBackingTrack.isPending ? "Generating..." : "Generate"}
        </button>

        {generateBackingTrack.isError && (
          <div className="rounded bg-red-500/20 p-4 text-red-200">
            <p className="font-semibold">Error:</p>
            <p>{generateBackingTrack.error.message}</p>
          </div>
        )}

        {generateBackingTrack.data?.success && (
          <div className="rounded bg-white/10 p-4">
            <h3 className="mb-2 font-semibold">Strudel REPL</h3>
            <StrudelRepl
              code={generateBackingTrack.data.code ?? ""}
              className="mt-2"
            />
          </div>
        )}

        {generateBackingTrack.data?.success === false && (
          <div className="rounded bg-yellow-500/20 p-4 text-yellow-200">
            <p className="font-semibold">Error:</p>
            <p>{generateBackingTrack.data.error}</p>
          </div>
        )}
      </form>
    </div>
  );
}
