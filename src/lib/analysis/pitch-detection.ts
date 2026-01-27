import {
  BasicPitch,
  noteFramesToTime,
  addPitchBendsToNoteEvents,
  outputToNotesPoly,
} from "@spotify/basic-pitch";

export interface Note {
  startTimeSeconds: number;
  durationSeconds: number;
  pitchMidi: number;
  amplitude: number;
}

export interface PitchDetectionParams {
  noteSegmentation: number;
  modelConfidenceThreshold: number;
  minPitchHz: number;
  maxPitchHz: number;
  minNoteLengthMs: number;
}

/**
 * Resample audio buffer to target sample rate and convert to mono
 */
export async function resampleAudioBuffer(
  audioBuffer: AudioBuffer,
  targetSampleRate: number,
): Promise<AudioBuffer> {
  const offlineCtx = new OfflineAudioContext(
    1,
    Math.ceil(audioBuffer.duration * targetSampleRate),
    targetSampleRate,
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0);

  return await offlineCtx.startRendering();
}

/**
 * Analyze audio buffer and detect notes using BasicPitch
 */
export async function detectNotesFromAudio(
  audioBuffer: AudioBuffer,
  params: PitchDetectionParams,
  onProgress?: (progress: number) => void,
): Promise<Note[]> {
  const resampledBuffer = await resampleAudioBuffer(audioBuffer, 22050);

  const frames: number[][] = [];
  const onsets: number[][] = [];
  const contours: number[][] = [];

  const modelUrl =
    "https://cdn.jsdelivr.net/npm/@spotify/basic-pitch@1.0.1/model/model.json";
  const basicPitch = new BasicPitch(modelUrl);

  await basicPitch.evaluateModel(
    resampledBuffer,
    (f: number[][], o: number[][], c: number[][]) => {
      frames.push(...f);
      onsets.push(...o);
      contours.push(...c);
    },
    (p: number) => {
      onProgress?.(p);
    },
  );

  const detectedNotes = noteFramesToTime(
    addPitchBendsToNoteEvents(
      contours,
      outputToNotesPoly(
        frames,
        onsets,
        params.noteSegmentation,
        params.modelConfidenceThreshold,
        1,
      ),
    ),
  );

  return detectedNotes;
}

/**
 * Load and decode audio file
 */
export async function loadAudioFromFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const audioCtx = new AudioContext();

  return new Promise((resolve, reject) => {
    audioCtx.decodeAudioData(
      arrayBuffer,
      (audioBuffer: AudioBuffer) => {
        resolve(audioBuffer);
      },
      (err) => {
        reject(new Error(`Error decoding audio: ${err}`));
      },
    );
  });
}

/**
 * Load and decode audio from blob (e.g., recorded audio)
 */
export async function loadAudioFromBlob(blob: Blob): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new AudioContext();

  return new Promise((resolve, reject) => {
    audioCtx.decodeAudioData(
      arrayBuffer,
      (audioBuffer: AudioBuffer) => {
        resolve(audioBuffer);
      },
      (err) => {
        reject(new Error(`Error decoding audio: ${err}`));
      },
    );
  });
}
