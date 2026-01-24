"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  detectNotesFromAudio,
  loadAudioFromBlob,
  loadAudioFromFile,
  type Note,
} from "~/lib/audio/pitch-detection";
import {
  NOTE_NAMES,
  getMidiNoteName,
  getNotesOutsideScale,
  isNoteInScale,
  SCALES,
} from "~/lib/audio/scale-analysis";
import {
  analyzeMelodicContour,
  getIntervalDistribution,
} from "~/lib/audio/melodic-contour";
import { useAudioRecorder } from "~/hooks/useAudioRecorder";

export default function PitchDetector() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>("");
  const [selectedScale, setSelectedScale] = useState<string>("Major");
  const [rootNote, setRootNote] = useState<number>(0);

  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeAudio = async (audioBuffer: AudioBuffer) => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setError("");
      setNotes([]);

      const detectedNotes = await detectNotesFromAudio(
        audioBuffer,
        (p: number) => setProgress(Math.round(p * 100)),
      );

      setNotes(detectedNotes);
      setIsProcessing(false);
    } catch (err) {
      setError(
        `Error analyzing audio: ${err instanceof Error ? err.message : String(err)}`,
      );
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setError("");
      const audioBuffer = await loadAudioFromFile(file);
      await analyzeAudio(audioBuffer);
    } catch (err) {
      setError(
        `Error reading file: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleStartRecording = async () => {
    try {
      setError("");
      await startRecording();
    } catch (err) {
      setError(
        `Error accessing microphone: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const handleStopRecording = async () => {
    try {
      const audioBlob = await stopRecording();
      const audioBuffer = await loadAudioFromBlob(audioBlob);
      await analyzeAudio(audioBuffer);
    } catch (err) {
      setError(
        `Error processing recording: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  };

  const notesOutsideScale = useMemo(
    () => getNotesOutsideScale(notes, rootNote, selectedScale),
    [notes, rootNote, selectedScale],
  );
  const notesInScale = notes.length - notesOutsideScale.length;

  const contourAnalysis = useMemo(() => analyzeMelodicContour(notes), [notes]);
  const intervalDistribution = useMemo(
    () => getIntervalDistribution(notes),
    [notes],
  );

  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        color: "#e5e7eb",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          fontWeight: "bold",
          marginBottom: "1rem",
          color: "#f9fafb",
        }}
      >
        Pitch Detector
      </h1>
      <p style={{ marginBottom: "2rem", color: "#9ca3af" }}>
        Upload an audio file or record audio to detect the notes being played.
      </p>

      {error && (
        <div
          style={{
            padding: "1rem",
            marginBottom: "1rem",
            backgroundColor: "#450a0a",
            border: "1px solid #7f1d1d",
            borderRadius: "4px",
            color: "#fca5a5",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginBottom: "2rem",
          padding: "1rem",
          backgroundColor: "#1f2937",
          borderRadius: "4px",
          border: "1px solid #374151",
        }}
      >
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: "600",
            marginBottom: "1rem",
            color: "#f9fafb",
          }}
        >
          Scale Settings
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#d1d5db",
              }}
            >
              Root Note:
            </label>
            <select
              value={rootNote}
              onChange={(e) => setRootNote(Number(e.target.value))}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                backgroundColor: "#111827",
                color: "#e5e7eb",
              }}
            >
              {NOTE_NAMES.map((note, idx) => (
                <option key={note} value={idx}>
                  {note}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              style={{
                display: "block",
                marginBottom: "0.5rem",
                fontWeight: "500",
                color: "#d1d5db",
              }}
            >
              Scale Type:
            </label>
            <select
              value={selectedScale}
              onChange={(e) => setSelectedScale(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #4b5563",
                backgroundColor: "#111827",
                color: "#e5e7eb",
              }}
            >
              {Object.keys(SCALES).map((scale) => (
                <option key={scale} value={scale}>
                  {scale}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1rem" }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            disabled={isRecording || isProcessing}
            style={{ display: "block", marginBottom: "0.5rem" }}
          />
          <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
            Supported formats: MP3, WAV, OGG, etc.
          </p>
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: isRecording ? "#dc2626" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: isProcessing ? "not-allowed" : "pointer",
              fontWeight: "500",
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            {isRecording ? "⏹ Stop Recording" : "🎤 Start Recording"}
          </button>
          {isRecording && (
            <span style={{ color: "#ef4444" }}>● Recording...</span>
          )}
        </div>
      </div>

      {isProcessing && (
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              marginBottom: "0.5rem",
              fontWeight: "500",
              color: "#e5e7eb",
            }}
          >
            Processing audio... {progress}%
          </div>
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "#374151",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "#2563eb",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div>
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              backgroundColor: "#1e3a5f",
              border: "1px solid #1e40af",
              borderRadius: "4px",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                marginBottom: "0.5rem",
                color: "#f9fafb",
              }}
            >
              Scale Analysis
            </h3>
            <p
              style={{
                fontSize: "1rem",
                marginBottom: "0.25rem",
                color: "#e5e7eb",
              }}
            >
              <strong>Selected Scale:</strong> {NOTE_NAMES[rootNote]}{" "}
              {selectedScale}
            </p>
            <p
              style={{
                fontSize: "1rem",
                marginBottom: "0.25rem",
                color: "#e5e7eb",
              }}
            >
              <strong>Total Notes Detected:</strong> {notes.length}
            </p>
            <p
              style={{
                fontSize: "1rem",
                marginBottom: "0.25rem",
                color: "#e5e7eb",
              }}
            >
              <strong>Notes in Scale:</strong> {notesInScale}
            </p>
            <p
              style={{
                fontSize: "1rem",
                color: notesOutsideScale.length > 0 ? "#f87171" : "#4ade80",
                fontWeight: "600",
              }}
            >
              <strong>Notes Outside Scale:</strong> {notesOutsideScale.length}
            </p>
          </div>

          <div
            style={{
              marginBottom: "1.5rem",
              padding: "1rem",
              backgroundColor: "#1e293b",
              border: "1px solid #334155",
              borderRadius: "4px",
            }}
          >
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: "600",
                marginBottom: "0.75rem",
                color: "#f9fafb",
              }}
            >
              Melodic Contour Analysis
            </h3>

            <div
              style={{
                marginBottom: "0.75rem",
                padding: "0.75rem",
                backgroundColor: "#0f172a",
                borderRadius: "4px",
                borderLeft: "3px solid #3b82f6",
              }}
            >
              {contourAnalysis.feedback.split("\n").map((line, index, arr) => (
                <p
                  key={`${line}-${index}`}
                  style={{
                    fontSize: "0.875rem",
                    color: "#cbd5e1",
                    lineHeight: "1.5",
                    marginBottom: index < arr.length - 1 ? "0.5rem" : "0",
                  }}
                >
                  {line.split("**").map((part, i) =>
                    i % 2 === 1 ? (
                      <strong key={`${line}-${i}`} style={{ color: "#f9fafb" }}>
                        {part}
                      </strong>
                    ) : (
                      part
                    ),
                  )}
                </p>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <StatBlock
                label="Small Steps (1-2)"
                value={contourAnalysis.smallSteps}
                accent={`${(contourAnalysis.smallStepRatio * 100).toFixed(0)}%`}
                color="#4ade80"
              />
              <StatBlock
                label="Medium Steps (3-5)"
                value={contourAnalysis.mediumSteps}
                accent={`${((contourAnalysis.mediumSteps / contourAnalysis.totalIntervals) * 100).toFixed(0)}%`}
                color="#fbbf24"
              />
              <StatBlock
                label="Large Leaps (6+)"
                value={contourAnalysis.largeLeaps}
                accent={`${(contourAnalysis.largeLeapRatio * 100).toFixed(0)}%`}
                color="#f87171"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              <StatBlock
                label="Short Notes (<0.3s)"
                value={contourAnalysis.durationVariety.shortNotes}
                accent={`${((contourAnalysis.durationVariety.shortNotes / notes.length) * 100).toFixed(0)}%`}
                color="#60a5fa"
              />
              <StatBlock
                label="Medium Notes (0.3-0.8s)"
                value={contourAnalysis.durationVariety.mediumNotes}
                accent={`${((contourAnalysis.durationVariety.mediumNotes / notes.length) * 100).toFixed(0)}%`}
                color="#a78bfa"
              />
              <StatBlock
                label="Long Notes (>0.8s)"
                value={contourAnalysis.durationVariety.longNotes}
                accent={`${((contourAnalysis.durationVariety.longNotes / notes.length) * 100).toFixed(0)}%`}
                color="#fb923c"
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "0.75rem",
              }}
            >
              <StatBlock
                label="Average Interval"
                value={`${contourAnalysis.averageInterval.toFixed(2)} semitones`}
              />
              <StatBlock
                label="Interval Variance"
                value={contourAnalysis.intervalVariance.toFixed(2)}
              />
              <div>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "#9ca3af",
                    marginBottom: "0.25rem",
                  }}
                >
                  Pitch Entropy
                </p>
                <p
                  style={{
                    fontSize: "1rem",
                    fontWeight: "600",
                    color: "#e5e7eb",
                  }}
                >
                  {contourAnalysis.pitchEntropy.toFixed(2)}
                </p>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    marginTop: "0.125rem",
                  }}
                >
                  {contourAnalysis.pitchEntropy < 1.5
                    ? "Repetitive"
                    : contourAnalysis.pitchEntropy > 4.5
                      ? "Chaotic"
                      : "Balanced"}
                </p>
              </div>
            </div>

            {Object.keys(intervalDistribution).length > 0 && (
              <details style={{ marginTop: "0.75rem" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    color: "#94a3b8",
                    fontSize: "0.875rem",
                    fontWeight: "500",
                  }}
                >
                  View Interval Distribution
                </summary>
                <div
                  style={{
                    marginTop: "0.5rem",
                    padding: "0.5rem",
                    backgroundColor: "#0f172a",
                    borderRadius: "4px",
                  }}
                >
                  {Object.entries(intervalDistribution)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([interval, count]) => (
                      <div
                        key={interval}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.25rem 0",
                          fontSize: "0.875rem",
                          color: "#cbd5e1",
                        }}
                      >
                        <span>{interval}</span>
                        <span>{count} times</span>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>

          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "1rem",
              color: "#f9fafb",
            }}
          >
            Detected Notes ({notes.length})
          </h2>
          <div
            style={{
              maxHeight: "400px",
              overflowY: "auto",
              border: "1px solid #374151",
              borderRadius: "4px",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead
                style={{
                  backgroundColor: "#1f2937",
                  position: "sticky",
                  top: 0,
                }}
              >
                <tr>
                  <TableHeader>Note</TableHeader>
                  <TableHeader>MIDI</TableHeader>
                  <TableHeader>Start (s)</TableHeader>
                  <TableHeader>Duration (s)</TableHeader>
                  <TableHeader>Amplitude</TableHeader>
                  <TableHeader>In Scale</TableHeader>
                </tr>
              </thead>
              <tbody>
                {notes.map((note, index) => {
                  const inScale = isNoteInScale(
                    note.pitchMidi,
                    rootNote,
                    selectedScale,
                  );
                  return (
                    <tr
                      key={`${note.pitchMidi}-${index}`}
                      style={{
                        borderBottom: "1px solid #374151",
                        backgroundColor: inScale ? "transparent" : "#450a0a",
                      }}
                    >
                      <TableCell>{getMidiNoteName(note.pitchMidi)}</TableCell>
                      <TableCell>{note.pitchMidi}</TableCell>
                      <TableCell>{note.startTimeSeconds.toFixed(3)}</TableCell>
                      <TableCell>{note.durationSeconds.toFixed(3)}</TableCell>
                      <TableCell>{note.amplitude.toFixed(3)}</TableCell>
                      <td style={{ padding: "0.75rem" }}>
                        <span
                          style={{
                            color: inScale ? "#4ade80" : "#f87171",
                            fontWeight: "600",
                          }}
                        >
                          {inScale ? "✓" : "✗"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th
      style={{
        padding: "0.75rem",
        textAlign: "left",
        borderBottom: "1px solid #374151",
        color: "#f9fafb",
        fontWeight: 500,
        fontSize: "0.875rem",
      }}
    >
      {children}
    </th>
  );
}

function TableCell({ children }: { children: ReactNode }) {
  return (
    <td style={{ padding: "0.75rem", color: "#e5e7eb", fontSize: "0.875rem" }}>
      {children}
    </td>
  );
}

function StatBlock({
  label,
  value,
  accent,
  color,
}: {
  label: string;
  value: number | string;
  accent?: string;
  color?: string;
}) {
  return (
    <div>
      <p
        style={{
          fontSize: "0.875rem",
          color: "#9ca3af",
          marginBottom: "0.25rem",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: typeof value === "number" ? "1.25rem" : "1rem",
          fontWeight: 600,
          color: color ?? "#e5e7eb",
        }}
      >
        {value}
      </p>
      {accent && (
        <p
          style={{
            fontSize: "0.75rem",
            color: "#9ca3af",
            marginTop: "0.125rem",
          }}
        >
          {accent}
        </p>
      )}
    </div>
  );
}
