"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioRecorderOptions {
  mimeType?: string;
  audioBitsPerSecond?: number;
}

export interface UseAudioRecorder {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
}

export function useAudioRecorder(
  options?: AudioRecorderOptions,
): UseAudioRecorder {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const mimeType = options?.mimeType ?? "audio/webm";

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const startRecording = useCallback(async () => {
    if (isRecording) {
      throw new Error("Recording already in progress.");
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      throw new Error("Audio recording is not supported in this browser.");
    }

    if (!MediaRecorder.isTypeSupported(mimeType)) {
      throw new Error(`MIME type ${mimeType} is not supported.`);
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: options?.audioBitsPerSecond,
    });

    mediaRecorderRef.current = mediaRecorder;
    streamRef.current = stream;
    chunksRef.current = [];

    mediaRecorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    });

    mediaRecorder.start();
    setIsRecording(true);
  }, [isRecording, mimeType, options?.audioBitsPerSecond]);

  const stopRecording = useCallback(() => {
    return new Promise<Blob>((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        reject(new Error("No recording in progress."));
        return;
      }

      if (!isRecording) {
        reject(new Error("Recording has already been stopped."));
        return;
      }

      const finalize = () => {
        recorder.removeEventListener("stop", finalize);
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        stopStream();
        setIsRecording(false);
        resolve(audioBlob);
      };

      recorder.addEventListener("stop", finalize);
      recorder.stop();
    });
  }, [isRecording, mimeType]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopStream();
    };
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
