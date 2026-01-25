"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import Chord from "~/app/_components/react-chords/react-chords/src/Chord";
import { Chord as TonalChord } from "tonal";
import guitarDb from "~/app/_components/chords-db/lib/guitar.json";
import { useJamSession } from "../context/jam-session-context";
import { chordToFlat } from "~/lib/note-utils";
import { normalizeDbKey } from "~/lib/chord-utils";

const GUITAR_INSTRUMENT = {
  strings: 6,
  fretsOnChord: 4,
  name: "Guitar",
  keys: [],
  tunings: {
    standard: ["E", "A", "D", "G", "B", "E"],
  },
};

type ChordPosition = {
  frets: number[];
  fingers?: number[];
  barres?: number[];
  capo?: boolean;
  baseFret?: number;
  midi?: number[];
};

type GuitarDb = {
  chords: Record<
    string,
    Array<{ key: string; suffix: string; positions: ChordPosition[] }>
  >;
  suffixes: string[];
};

const CHORD_DB = guitarDb as GuitarDb;

const mapSuffixToDb = (suffix: string) => {
  const normalized = suffix.replace(/\s+/g, "").trim();
  const lower = normalized.toLowerCase();

  if (!lower) return "major";

  const mappings: Record<string, string> = {
    maj: "major",
    major: "major",
    m: "minor",
    min: "minor",
    minor: "minor",
    "-": "minor",
    maj7: "maj7",
    ma7: "maj7",
    m7: "m7",
    min7: "m7",
    "-7": "m7",
    dim: "dim",
    dim7: "dim7",
    o: "dim",
    o7: "dim7",
    m7b5: "m7b5",
    ø: "m7b5",
  };

  return mappings[lower] ?? normalized;
};

const parseChordParts = (chordName: string) => {
  const chordInfo = TonalChord.get(chordName);
  if (chordInfo.empty) return null;

  const symbol = chordInfo.symbol || chordName;
  const match = /^([A-G](?:#|b)?)([^/]*)(?:\/([A-G](?:#|b)?))?$/i.exec(
    symbol.trim(),
  );
  if (!match) return null;

  const root = match[1];
  if (!root) return null;

  return {
    root,
    suffix: match[2] ?? "",
    bass: match[3],
  };
};

const getChordVoicings = (chordName: string): ChordPosition[] => {
  const parts = parseChordParts(chordName);
  if (!parts) return [];

  const dbKey = normalizeDbKey(parts.root);
  const baseSuffix = mapSuffixToDb(parts.suffix);
  const suffixWithBass = parts.bass
    ? baseSuffix === "major"
      ? `/${parts.bass}`
      : baseSuffix === "minor"
        ? `m/${parts.bass}`
        : `${baseSuffix}/${parts.bass}`
    : baseSuffix;

  const chordEntries = CHORD_DB.chords[dbKey] ?? [];
  const entry = chordEntries.find((item) => item.suffix === suffixWithBass);
  return entry?.positions ?? [];
};

const getChordData = (chordName: string, voicingIndex: number) => {
  const voicings = getChordVoicings(chordName);
  if (voicings.length === 0) {
    return {
      frets: [-1, -1, -1, -1, -1, -1],
      fingers: [0, 0, 0, 0, 0, 0],
      barres: [],
      capo: false,
      baseFret: 1,
    };
  }

  const index = Math.min(Math.max(voicingIndex, 0), voicings.length - 1);
  return voicings[index];
};

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
