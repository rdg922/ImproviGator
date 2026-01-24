"use client";

import { useJamSession } from "./jam-session-context";

export default function ScaleDiagram() {
  const { key, modality } = useJamSession();

  return (
    <div className="flex h-full flex-col border-4 border-black bg-white p-6 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      <h2 className="mb-4 text-xl font-black">Scale Guide - {key} {modality}</h2>

      {/* Fretboard */}
      <div className="flex-1 border-4 border-black bg-amber-50 p-6">
        <div className="space-y-3">
          {/* Fretboard strings */}
          {["E", "B", "G", "D", "A", "E"].map((string, stringIndex) => (
            <div key={stringIndex} className="flex items-center gap-2">
              <span className="w-6 text-sm font-black">{string}</span>
              <div className="relative flex flex-1 items-center">
                <div className="h-1 w-full bg-black"></div>
                {/* Fret markers - example positions */}
                {stringIndex === 0 && (
                  <>
                    <div className="absolute left-[8%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[25%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[40%] h-5 w-5 rounded-full border-4 border-black bg-blue-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[55%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                  </>
                )}
                {stringIndex === 1 && (
                  <>
                    <div className="absolute left-[12%] h-5 w-5 rounded-full border-4 border-black bg-blue-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[28%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[45%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                  </>
                )}
                {stringIndex === 2 && (
                  <>
                    <div className="absolute left-[15%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[32%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[48%] h-5 w-5 rounded-full border-4 border-black bg-blue-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                  </>
                )}
                {stringIndex === 3 && (
                  <>
                    <div className="absolute left-[10%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[27%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[43%] h-5 w-5 rounded-full border-4 border-black bg-blue-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                  </>
                )}
                {stringIndex === 4 && (
                  <>
                    <div className="absolute left-[13%] h-5 w-5 rounded-full border-4 border-black bg-blue-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[30%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[47%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                  </>
                )}
                {stringIndex === 5 && (
                  <>
                    <div className="absolute left-[8%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[25%] h-5 w-5 rounded-full border-4 border-black bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                    <div className="absolute left-[40%] h-5 w-5 rounded-full border-4 border-black bg-blue-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"></div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Fret numbers */}
        <div className="mt-3 flex justify-around border-t-4 border-black pt-2">
          {[0, 3, 5, 7, 9, 12].map((fret) => (
            <span key={fret} className="text-xs font-bold">
              {fret}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-black bg-blue-300"></div>
            <span className="text-xs font-bold">Root Note</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full border-2 border-black bg-yellow-300"></div>
            <span className="text-xs font-bold">Scale Notes</span>
          </div>
        </div>
      </div>
    </div>
  );
}
