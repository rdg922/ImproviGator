"use client";

import { useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useJamSession } from "../context/jam-session-context";
import { api } from "~/trpc/react";

const KEY_OPTIONS = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const MODALITY_OPTIONS = [
  "Major",
  "Minor",
  "Dorian",
  "Phrygian",
  "Lydian",
  "Mixolydian",
  "Aeolian",
  "Locrian",
];

const TIME_SIGNATURES = ["2/4", "3/4", "4/4", "5/4"];
const DEFAULT_INSTRUMENTS = ["drums", "piano", "bass", "guitar"];
const DEFAULT_BAR_COUNT = 16;

type BackingTrackPreset = {
  name: string;
  key: string;
  modality: string;
  tempo: number;
  timeSignature: string;
  instruments: string[];
  bars: number;
  strudelCode: string;
};

const BACKING_TRACK_PRESETS: BackingTrackPreset[] = [
  {
    name: "Standard Swing",
    key: "C",
    modality: "Major",
    tempo: 120,
    timeSignature: "4/4",
    instruments: ["piano", "bass", "drums"],
    bars: 16,
    strudelCode: `setcps(120/60/4)

// 16 Bar Chill Jazz Progression in C Major
let chords = chord("<C^9 A-7 D-9 G13 C^9 A7b13 D-9 G7alt C^9 C7 F^7 F-7 C^9 A-7 D-9 G13>")

// Synth
$: chords.voicing().s("gm_epiano1").struct("x ~ x ~ ~ x ~ ~").room(0.6).velocity(0.6).swingBy(1/3, 4).gain(1)

// Bass
$: chords.rootNotes().s("gm_acoustic_bass").struct("x ~ ~ x x ~ ~ ~").octave(2).gain(0.8).lpf(400).gain(1)

// Drums
$: s("bd ~ bd ~").bank("RolandTR808").gain(0.7)
$: s("hh*8").bank("RolandTR808").velocity("<0.5 0.2>").swingBy(1/3, 4).gain(1)`,
  },
  {
    name: "Guitar Jazz",
    key: "Eb",
    modality: "Major",
    tempo: 120,
    timeSignature: "4/4",
    instruments: ["guitar", "bass", "drums"],
    bars: 16,
    strudelCode: `setcps(120/60/4)

let chords = chord("<Eb-9 Ab-7 Db9 Gb^7 B^7 Fh7 Bb7alt Eb-9 Eb-9 Ab-7 Db9 Gb^7 B^7 Fh7 Bb7b13 Eb-9>")

// Synth
$: chords.voicing().s("gm_acoustic_guitar_nylon").struct("x ~ ~ x ~ x ~ ~").gain(0.7).room(0.6).lpf(1800).gain(1)

// Bass
s("gm_acoustic_bass").note(chords.rootNotes()).struct("x ~ ~ ~ x ~ ~ ~").octave(2).gain(1.1)

// Drums
$: s("bd ~ [~ sd] ~, hh*4").bank("RolandTR808").gain(0.7)`,
  },
  {
    name: "Synth Jazz",
    key: "C",
    modality: "Major",
    tempo: 120,
    timeSignature: "4/4",
    instruments: ["drums", "sawtooth", "bass"],
    bars: 16,
    strudelCode: `setcpm(120/4)

let chords = chord("<C^9 Eb^9 Ab^9 Db^9 C^9 A7#9 D9 G7alt C^9 Eb^9 Ab^9 Db^9 C^9 A7b13 D13 G7b9>")

// Sawtooth
$: chords.voicing().s("saw").struct("x ~ x ~ ~ x ~ x").gain(0.15).room(0.5).lpf(1500).gain(1)

// Bass
$: chords.rootNotes().s("gm_acoustic_bass").struct("x [~ x] x ~").octave(2).gain(0.9)

// Drums
$: s("bd sd, hh*16, [~ rim]*2").bank("RolandTR808").gain(0.8)`,
  },
  {
    name: "Kalimba Waltz",
    key: "C",
    modality: "Major",
    tempo: 115,
    timeSignature: "3/4",
    instruments: ["drums", "kalimba"],
    bars: 16,
    strudelCode: `setcpm(115/3)

let chords = chord("<C^7 Am7 Dm7 G7 C^7 Am7 Dm7 G7 F^7 G7 C^7 Am7 Dm7 G7 C^7 G7alt>")

// Kalimba
$: chords.voicing().s("gm_kalimba").struct("x x x").room(.6).velocity("0.8 0.6 0.6").gain(1)

// Drums
$: s("[bd ~ ~], [~ rim rim], hh*3").bank("RolandTR808").velocity("0.7 0.5 0.5").gain(1)`,
  },
];

type CreatePanelProps = {
  onGenerationComplete?: () => void;
};

export default function CreatePanel({
  onGenerationComplete,
}: CreatePanelProps = {}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const {
    key,
    setKey,
    modality,
    setModality,
    tempo,
    setTempo,
    timeSignature,
    setTimeSignature,
    instruments,
    setInstruments,
    description,
    setDescription,
    setStrudelCode,
  } = useJamSession();

  // Mirror context state locally so the player can tweak settings before committing
  const [localKey, setLocalKey] = useState(key);
  const [localModality, setLocalModality] = useState(modality);
  const [localTempo, setLocalTempo] = useState(tempo);
  const [localTimeSignature, setLocalTimeSignature] = useState(timeSignature);
  const [localDescription, setLocalDescription] = useState(description);
  const [localBars, setLocalBars] = useState(DEFAULT_BAR_COUNT);
  const [localInstrumentsInput, setLocalInstrumentsInput] = useState(
    instruments.join(", "),
  );
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string>("");

  useLayoutEffect(() => {
    if (!panelRef.current) {
      return;
    }

    const context = gsap.context(() => {
      gsap.set("[data-anim='card']", { opacity: 0, y: 10 });
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(panelRef.current, { opacity: 0, y: 12, duration: 0.35 })
        .to("[data-anim='card']", {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.05,
        });
    }, panelRef);

    return () => context.revert();
  }, []);

  const generateBackingTrack = api.llm.generateBackingTrack.useMutation({
    onSuccess: (data) => {
      if (data.success && data.code) {
        setStrudelCode(data.code);
        setFeedback({
          type: "success",
          message: "Strudel code generated! Opening the Advanced tab...",
        });
        onGenerationComplete?.();
        return;
      }

      const errorMessage =
        (data.success ? "No Strudel code was returned." : data.error) ??
        "Unable to generate Strudel code.";
      setFeedback({ type: "error", message: errorMessage });
    },
    onError: (error) => {
      setFeedback({
        type: "error",
        message: error.message ?? "Something went wrong while generating.",
      });
    },
  });

  const handleGenerate = () => {
    setKey(localKey);
    setModality(localModality);
    setTempo(localTempo);
    setTimeSignature(localTimeSignature);
    setDescription(localDescription);

    const promptGenre =
      localDescription.trim() || `${localModality} improvisation vibes`;
    const descriptiveKey = `${localKey} ${localModality}`;
    const sanitizedInstruments = localInstrumentsInput
      .split(",")
      .map((instrument) => instrument.trim())
      .filter(Boolean);
    const finalInstruments =
      sanitizedInstruments.length > 0
        ? sanitizedInstruments
        : DEFAULT_INSTRUMENTS;

    // Persist instruments to context
    setInstruments(finalInstruments);

    const safeBars = Number.isFinite(localBars) ? localBars : DEFAULT_BAR_COUNT;
    const finalBars = Math.min(64, Math.max(1, safeBars));

    setFeedback(null);
    generateBackingTrack.mutate({
      genre: `${promptGenre} (${localTimeSignature})`,
      key: descriptiveKey,
      bars: finalBars,
      instruments: finalInstruments,
      bpm: localTempo,
    });
  };

  const handleLoadPreset = () => {
    if (!selectedPreset) return;

    const preset = BACKING_TRACK_PRESETS.find((p) => p.name === selectedPreset);
    if (!preset) return;

    // Update local state
    setLocalKey(preset.key);
    setLocalModality(preset.modality);
    setLocalTempo(preset.tempo);
    setLocalTimeSignature(preset.timeSignature);
    setLocalBars(preset.bars);
    setLocalInstrumentsInput(preset.instruments.join(", "));
    setLocalDescription(preset.description);

    // Update context immediately
    setKey(preset.key);
    setModality(preset.modality);
    setTempo(preset.tempo);
    setTimeSignature(preset.timeSignature);
    setInstruments(preset.instruments);
    setDescription(preset.description);

    // Load the Strudel code
    setStrudelCode(preset.strudelCode);

    setFeedback({
      type: "success",
      message: `Loaded preset: ${preset.name}`,
    });
    onGenerationComplete?.();
  };

  return (
    <div ref={panelRef} className="flex h-full flex-col p-2">
      <div className="flex-1 space-y-1 overflow-y-auto">
        <div data-anim="card" className="flex flex-row justify-stretch gap-x-5">
          <div className="grow">
            <label className="mb-1 block text-sm font-bold tracking-wide uppercase">
              Key
            </label>
            <select
              value={localKey}
              onChange={(e) => setLocalKey(e.target.value)}
              className="w-full border-4 border-black bg-yellow-200 px-3 py-1 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {KEY_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="grow">
            <label className="mb-2 block text-sm font-bold tracking-wide uppercase">
              Modality
            </label>
            <select
              value={localModality}
              onChange={(e) => setLocalModality(e.target.value)}
              className="w-full border-4 border-black bg-pink-200 px-3 py-1 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              {MODALITY_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div data-anim="card" className="flex flex-row justify-stretch gap-x-5">
          <div className="grow">
            <label className="mb-1 block text-sm font-bold tracking-wide uppercase">
              Tempo (BPM)
            </label>
            <input
              type="number"
              value={localTempo}
              onChange={(e) => setLocalTempo(Number(e.target.value))}
              min={40}
              max={240}
              className="w-full border-4 border-black bg-blue-200 px-3 py-1 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>

          <div className="grow">
            <label className="mb-1 block text-sm font-bold tracking-wide uppercase">
              Bars (1-64)
            </label>
            <input
              type="number"
              min={1}
              max={64}
              value={localBars}
              onChange={(e) => setLocalBars(Number(e.target.value))}
              className="w-full border-4 border-black bg-purple-200 px-3 py-1 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            />
          </div>
        </div>

        <div data-anim="card">
          <label className="mb-1 block text-sm font-bold tracking-wide uppercase">
            Time Signature
          </label>
          <div className="flex gap-2">
            {TIME_SIGNATURES.map((sig) => (
              <button
                key={sig}
                onClick={() => setLocalTimeSignature(sig)}
                className={`flex-1 border-4 border-black px-3 py-1 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  localTimeSignature === sig
                    ? "bg-cyan-400 text-black"
                    : "bg-white text-gray-700"
                }`}
              >
                {sig}
              </button>
            ))}
          </div>
        </div>

        <div data-anim="card">
          <label className="mb-1 block text-sm font-bold tracking-wide uppercase">
            Instruments (comma separated)
          </label>
          <input
            type="text"
            value={localInstrumentsInput}
            onChange={(e) => setLocalInstrumentsInput(e.target.value)}
            placeholder="e.g., drums, piano, bass"
            className="w-full border-4 border-black bg-pink-100 px-3 py-1 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
          />
        </div>

        <div data-anim="card">
          <label className="mb-1 block text-sm font-bold tracking-wide uppercase">
            Description (genre, mood, etc.)
          </label>
          <textarea
            rows={1}
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            placeholder="e.g., Jazzy, upbeat, latin vibes..."
            className="w-full border-4 border-black bg-green-200 px-3 py-1 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:ring-0 focus:outline-none"
          ></textarea>
        </div>

        <button
          data-anim="card"
          onClick={handleGenerate}
          disabled={generateBackingTrack.isPending}
          className="w-full border-4 border-black bg-orange-400 px-4 py-2 text-lg font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-orange-300 disabled:shadow-none"
        >
          {generateBackingTrack.isPending ? "Generating..." : "Generate"}
        </button>

        <div data-anim="card" className="pt-2">
          <label className="mb-1 block text-sm font-bold tracking-wide uppercase">
            Or Load a Preset
          </label>
          <div className="flex gap-2">
            <select
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="flex-1 border-4 border-black bg-cyan-200 px-3 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <option value="">Select a preset...</option>
              {BACKING_TRACK_PRESETS.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleLoadPreset}
              disabled={!selectedPreset}
              className="border-4 border-black bg-cyan-400 px-4 py-2 font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-cyan-300 disabled:opacity-50 disabled:shadow-none"
            >
              Load
            </button>
          </div>
        </div>

        {feedback && (
          <div
            data-anim="card"
            className={`border-4 border-black px-3 py-1 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
              feedback.type === "success"
                ? "bg-green-200 text-black"
                : "bg-red-200 text-black"
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
}
