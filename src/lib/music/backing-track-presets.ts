export type BackingTrackPreset = {
  name: string;
  key: string;
  modality: string;
  tempo: number;
  timeSignature: string;
  instruments: string[];
  bars: number;
  strudelCode: string;
};

export const BACKING_TRACK_PRESETS: BackingTrackPreset[] = [
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
