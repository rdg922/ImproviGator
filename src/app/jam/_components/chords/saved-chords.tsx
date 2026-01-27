"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import Chord from "~/app/_components/react-chords/react-chords/src/Chord";
import { useJamSession } from "../context/jam-session-context";
import { chordToFlat } from "~/lib/note-utils";
import {
  GUITAR_INSTRUMENT,
  getChordData,
  getChordVoicings,
} from "~/lib/chord-utils";

export default function SavedChords() {
  const { savedChords, removeSavedChord, updateSavedChordVoicing } =
    useJamSession();
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const previousKeys = useRef<string[]>([]);
  const savedChordKeys = useMemo(
    () => savedChords.map((chord) => chord.name),
    [savedChords],
  );

  useLayoutEffect(() => {
    const prev = previousKeys.current;
    const next = savedChordKeys;
    const added = next.filter((key) => !prev.includes(key));

    if (added.length > 0) {
      const elements = added
        .map((key) => cardRefs.current.get(key))
        .filter(Boolean) as HTMLDivElement[];

      if (elements.length > 0) {
        gsap.fromTo(
          elements,
          { opacity: 0, y: 10, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.25,
            ease: "power2.out",
            stagger: 0.05,
          },
        );
      }
    }

    previousKeys.current = next;
  }, [savedChordKeys]);

  const handleRemoveChord = (chordName: string) => {
    const element = cardRefs.current.get(chordName);
    if (!element) {
      removeSavedChord(chordName);
      return;
    }

    gsap.to(element, {
      opacity: 0,
      y: -8,
      scale: 0.95,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => removeSavedChord(chordName),
    });
  };

  return (
    <div className="flex h-full flex-col border-4 border-black bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b-4 border-black bg-pink-300 px-4 py-2">
        <span className="text-lg font-black">Saved Chords</span>
      </div>

      {/* Chord List */}
      <div className="flex-1 overflow-y-auto p-2">
        {savedChords.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="font-bold text-gray-400">
              No saved chords yet.
              <br />
              Save suggested chords from AI!
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
                  ref={(node) => {
                    if (node) {
                      cardRefs.current.set(savedChord.name, node);
                    } else {
                      cardRefs.current.delete(savedChord.name);
                    }
                  }}
                  className="group relative flex flex-col items-center justify-center border-4 border-black bg-yellow-200 p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                >
                  <div className="mb-0.5 text-xs font-black">
                    {chordToFlat(savedChord.name)}
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
                    onClick={() => handleRemoveChord(savedChord.name)}
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
