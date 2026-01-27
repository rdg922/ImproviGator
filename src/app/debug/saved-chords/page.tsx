"use client";

import { useMemo, useState } from "react";
import SavedChords from "~/app/jam/_components/chords/saved-chords";
import {
  JamSessionProvider,
  useJamSession,
} from "~/app/jam/_components/context/jam-session-context";

const PRESET_CHORDS = [
  "Cmaj7",
  "Dm9",
  "G13",
  "A7b13",
  "F#dim7",
  "E7alt",
];

function SavedChordsDebugPanel() {
  const {
    savedChords,
    addSavedChord,
    removeSavedChord,
    updateSavedChordVoicing,
  } = useJamSession();
  const [chordName, setChordName] = useState("Dm9");
  const [voicingIndex, setVoicingIndex] = useState(0);
  const [bulkInput, setBulkInput] = useState("Dm9, G13, Cmaj7, A7b13");
  const [selectedChord, setSelectedChord] = useState("");
  const [selectedVoicing, setSelectedVoicing] = useState(0);

  const savedChordNames = useMemo(
    () => savedChords.map((chord) => chord.name),
    [savedChords],
  );

  const handleAddChord = () => {
    if (!chordName.trim()) return;
    addSavedChord(chordName.trim(), Number(voicingIndex) || 0);
  };

  const handleAddBulk = () => {
    const list = bulkInput
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    list.forEach((chord) => addSavedChord(chord));
  };

  const handleClearAll = () => {
    savedChordNames.forEach((name) => removeSavedChord(name));
  };

  const handleUpdateVoicing = () => {
    if (!selectedChord) return;
    updateSavedChordVoicing(selectedChord, Number(selectedVoicing) || 0);
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="rounded-xl border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-lg font-black">Debug Controls</h2>
        <p className="text-sm font-semibold text-gray-600">
          Add chords, tweak voicings, or clear the list to test rendering.
        </p>

        <div className="mt-4 grid gap-3">
          <label className="text-xs font-bold uppercase text-gray-600">
            Add single chord
          </label>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_auto]">
            <input
              value={chordName}
              onChange={(event) => setChordName(event.target.value)}
              className="w-full border-2 border-black bg-white px-3 py-2 font-mono text-sm"
              placeholder="e.g. Dm9"
            />
            <input
              type="number"
              min={0}
              value={voicingIndex}
              onChange={(event) => setVoicingIndex(Number(event.target.value))}
              className="w-full border-2 border-black bg-white px-3 py-2 text-sm"
              placeholder="Voicing"
            />
            <button
              onClick={handleAddChord}
              className="border-2 border-black bg-emerald-300 px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
            >
              Add
            </button>
          </div>

          <label className="text-xs font-bold uppercase text-gray-600">
            Quick presets
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_CHORDS.map((preset) => (
              <button
                key={preset}
                onClick={() => addSavedChord(preset)}
                className="border-2 border-black bg-yellow-200 px-3 py-1 text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
              >
                {preset}
              </button>
            ))}
          </div>

          <label className="text-xs font-bold uppercase text-gray-600">
            Add bulk chords (comma or newline separated)
          </label>
          <textarea
            value={bulkInput}
            onChange={(event) => setBulkInput(event.target.value)}
            rows={3}
            className="w-full border-2 border-black bg-white px-3 py-2 text-sm"
          />
          <button
            onClick={handleAddBulk}
            className="w-full border-2 border-black bg-blue-300 px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            Add Bulk Chords
          </button>
        </div>
      </div>

      <div className="rounded-xl border-4 border-black bg-white p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-base font-black">Saved Chord Utilities</h3>
        <div className="mt-3 grid gap-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_120px_auto]">
            <select
              value={selectedChord}
              onChange={(event) => setSelectedChord(event.target.value)}
              className="w-full border-2 border-black bg-white px-3 py-2 text-sm"
            >
              <option value="">Select chord</option>
              {savedChordNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0}
              value={selectedVoicing}
              onChange={(event) =>
                setSelectedVoicing(Number(event.target.value))
              }
              className="w-full border-2 border-black bg-white px-3 py-2 text-sm"
              placeholder="Voicing"
            />
            <button
              onClick={handleUpdateVoicing}
              className="border-2 border-black bg-purple-300 px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
            >
              Update
            </button>
          </div>

          <button
            onClick={handleClearAll}
            className="border-2 border-black bg-red-300 px-4 py-2 text-sm font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px]"
          >
            Clear All Saved Chords
          </button>

          <div className="rounded-lg border-2 border-black bg-amber-50 px-3 py-2 text-xs font-semibold text-gray-700">
            {savedChords.length} chord{savedChords.length === 1 ? "" : "s"} saved
          </div>
        </div>
      </div>
    </div>
  );
}

function SavedChordsDebugLayout() {
  return (
    <div className="min-h-screen bg-amber-100 p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-xl border-4 border-black bg-white px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-3xl font-black">Saved Chords Renderer</h1>
          <p className="text-sm font-semibold text-gray-600">
            Debug page for Saved Chords rendering and voicing changes.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-[640px]">
            <SavedChords />
          </div>
          <SavedChordsDebugPanel />
        </div>
      </div>
    </div>
  );
}

export default function DebugSavedChordsPage() {
  return (
    <JamSessionProvider>
      <SavedChordsDebugLayout />
    </JamSessionProvider>
  );
}
