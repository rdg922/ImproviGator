"use client";

import { useJamSession } from "./jam-session-context";

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
              No saved chords yet.<br />
              Heart suggestions from AI!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {savedChords.map((chord, index) => (
              <div
                key={index}
                className="group relative flex items-center justify-center border-4 border-black bg-yellow-200 p-4 text-lg font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                {chord}
                <button
                  onClick={() => removeSavedChord(chord)}
                  className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100"
                  title="Remove chord"
                >
                  ❌
                </button>
              </div>
            ))}
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
