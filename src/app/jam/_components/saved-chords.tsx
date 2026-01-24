"use client";

import Chord from "~/app/_components/react-chords/react-chords/src/Chord";
import { useJamSession } from "./jam-session-context";
import {
  GUITAR_INSTRUMENT,
  getChordVoicings,
  getChordData,
} from "~/lib/chord-utils";

export default function SavedChords() {
  const { savedChords, removeSavedChord, updateSavedChordVoicing } =
    useJamSession();

  return (
    <div className="flex h-full flex-col border-4 border-black bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-black bg-pink-300 px-4 py-2">
        <span className="text-lg font-black">Saved Chords</span>
        <button className="border-2 border-black bg-green-400 px-3 py-1 text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none">
          + Add
        </button>
      </div>

      {/* Chord List */}
      <div className="flex-1 overflow-y-auto p-4">
        {savedChords.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="font-bold text-gray-400">
              No saved chords yet.
              <br />
              Heart suggestions from AI!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {savedChords.map((savedChord, index) => {
              const voicings = getChordVoicings(savedChord.name);
              const chordData = getChordData(
                savedChord.name,
                savedChord.voicingIndex,
              );
              return (
                <div
                  key={index}
                  className="group relative flex flex-col items-center justify-center border-4 border-black bg-yellow-200 p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="mb-0.5 text-xs font-black">
                    {savedChord.name}
                  </div>
                  <div className="scale-75">
                    <Chord
                      chord={chordData}
                      instrument={GUITAR_INSTRUMENT}
                      lite={true}
                    />
                  </div>
                  {voicings.length > 1 && (
                    <select
                      value={Math.min(
                        Math.max(savedChord.voicingIndex, 0),
                        voicings.length - 1,
                      )}
                      onChange={(event) =>
                        updateSavedChordVoicing(
                          savedChord.name,
                          Number(event.target.value),
                        )
                      }
                      className="mt-1 w-full border-2 border-black bg-white px-1 py-0.5 text-[0.6rem] font-bold"
                      aria-label={`Voicing for ${savedChord.name}`}
                    >
                      {voicings.map((_, voicingIndex) => (
                        <option key={voicingIndex} value={voicingIndex}>
                          Voicing {voicingIndex + 1}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => removeSavedChord(savedChord.name)}
                    className="absolute top-1 right-1 opacity-0 transition-opacity group-hover:opacity-100"
                    title="Remove chord"
                  >
                    ❌
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
