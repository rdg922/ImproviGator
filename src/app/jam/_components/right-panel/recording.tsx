"use client";

import { useMemo } from "react";
import { useJamSession } from "../jam-session-context";

const formatDuration = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

export default function RightPanelRecording() {
  const { recording, midiData } = useJamSession();

  const stats = useMemo(() => {
    if (!recording) {
      return null;
    }

    const totalNotes = recording.notes.length;
    const avgVelocity =
      totalNotes > 0
        ? Math.round(
            recording.notes.reduce((sum, note) => sum + note.velocity, 0) /
              totalNotes,
          )
        : 0;

    return {
      totalNotes,
      avgVelocity,
      durationLabel: formatDuration(recording.duration),
    };
  }, [recording]);

  if (!recording) {
    return (
      <div className="mb-6 flex flex-1 flex-col items-center justify-center rounded-xl border-4 border-black bg-white p-6 text-center shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <p className="text-lg font-semibold">No recording captured yet.</p>
        <p className="text-sm text-gray-600">
          Hit the record button to capture your improvisation.
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6 flex-1 overflow-y-auto rounded-xl border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase">Recording</p>
          <h2 className="text-2xl font-black tracking-wide">Take Overview</h2>
        </div>
        <span className="rounded-full border-4 border-black bg-green-200 px-4 py-1 text-xs font-black tracking-wide uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          {stats?.durationLabel}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border-4 border-black bg-yellow-100 p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-bold text-gray-600 uppercase">Notes</p>
          <p className="text-2xl font-black">{stats?.totalNotes ?? 0}</p>
        </div>
        <div className="rounded-lg border-4 border-black bg-blue-100 p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-bold text-gray-600 uppercase">
            Avg Velocity
          </p>
          <p className="text-2xl font-black">{stats?.avgVelocity ?? 0}</p>
        </div>
        <div className="rounded-lg border-4 border-black bg-pink-100 p-4 text-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <p className="text-xs font-bold text-gray-600 uppercase">Duration</p>
          <p className="text-2xl font-black">{stats?.durationLabel ?? "0s"}</p>
        </div>
      </div>

      <p className="mb-2 text-xs font-bold text-gray-500 uppercase">
        Captured Notes
      </p>
      <div className="max-h-48 overflow-y-auto rounded-lg border-4 border-black">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border-b border-black px-3 py-2 text-left font-semibold">
                Pitch
              </th>
              <th className="border-b border-black px-3 py-2 text-left font-semibold">
                Velocity
              </th>
              <th className="border-b border-black px-3 py-2 text-left font-semibold">
                Start (ms)
              </th>
              <th className="border-b border-black px-3 py-2 text-left font-semibold">
                Length
              </th>
            </tr>
          </thead>
          <tbody>
            {midiData.map((note, index) => (
              <tr
                key={`${note.pitch}-${index}`}
                className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
              >
                <td className="border-b border-black px-3 py-1 font-mono">
                  {note.pitch}
                </td>
                <td className="border-b border-black px-3 py-1 font-mono">
                  {note.velocity}
                </td>
                <td className="border-b border-black px-3 py-1 font-mono">
                  {note.startTime}
                </td>
                <td className="border-b border-black px-3 py-1 font-mono">
                  {note.duration}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
