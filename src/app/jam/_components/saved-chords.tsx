"use client";

import Chord from "~/app/_components/react-chords/react-chords/src/Chord";
import { Chord as TonalChord } from "tonal";
import { useJamSession } from "./jam-session-context";

const GUITAR_INSTRUMENT = {
  strings: 6,
  fretsOnChord: 4,
  name: "Guitar",
  keys: [],
  tunings: {
    standard: ["E", "A", "D", "G", "B", "E"],
  },
};

// Helper to parse chord name and generate fingering
function getChordData(chordName: string) {
  const tonalChord = TonalChord.get(chordName);
  if (!tonalChord.notes.length) {
    // Fallback for unknown chords
    return {
      frets: [-1, -1, -1, -1, -1, -1],
      fingers: [0, 0, 0, 0, 0, 0],
      barres: [],
      capo: false,
    };
  }

  // Simple chord voicing lookup for common chords
  const voicings: Record<string, { frets: number[]; fingers: number[] }> = {
    C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
    Cmaj7: { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
    Dm7: { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
    Am7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
    G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
    D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
    A: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
    E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
    Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
    Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  };

  const voicing = voicings[chordName];
  if (voicing) {
    return {
      frets: voicing.frets,
      fingers: voicing.fingers,
      barres: [],
      capo: false,
    };
  }

  // Default voicing for unknown chords
  return {
    frets: [-1, 3, 2, 0, 1, 0],
    fingers: [0, 3, 2, 0, 1, 0],
    barres: [],
    capo: false,
  };
}

export default function SavedChords() {
  const { savedChords, removeSavedChord } = useJamSession();

  return (
    <div className="flex h-full flex-col border-4 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      {/* Header */}
      <div className="border-b-4 border-black bg-pink-300 px-6 py-3 text-xl font-black">
        Saved Chords
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
          <div className="grid grid-cols-2 gap-3">
            {savedChords.map((chord, index) => {
              const chordData = getChordData(chord);
              return (
                <div
                  key={index}
                  className="group relative flex flex-col items-center justify-center border-4 border-black bg-yellow-200 p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="mb-1 text-sm font-black">{chord}</div>
                  <Chord
                    chord={chordData}
                    instrument={GUITAR_INSTRUMENT}
                    lite={true}
                  />
                  <button
                    onClick={() => removeSavedChord(chord)}
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

      {/* Add Manual Chord Button */}
      <div className="border-t-4 border-black p-3">
        <button className="w-full border-4 border-black bg-green-400 px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none">
          + Add Chord
        </button>
      </div>
    </div>
  );
}
