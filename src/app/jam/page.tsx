"use client";

import LeftPanel from "./_components/panels/left-panel";
import RightPanel from "./_components/right-panel/index";
import SavedChords from "./_components/chords/saved-chords";
import ScaleDiagram from "./_components/visuals/scale-diagram";
import { JamSessionProvider } from "./_components/context/jam-session-context";

export default function JamPage() {
  return (
    <JamSessionProvider>
      <div className="grid h-screen grid-cols-[minmax(280px,2fr)_5fr] grid-rows-[3fr_260px] gap-4 bg-gradient-to-br from-pink-100 via-amber-100 to-cyan-100 p-4">
        {/* Top Left - Mode-dependent panel with title */}
        <div className="mt-1 flex flex-col gap-3 overflow-hidden">
          <div className="border-4 border-black bg-yellow-200 px-4 py-3 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-xs font-black tracking-[0.3em] text-gray-700 uppercase">
              jam lab
            </p>
            <h1 className="text-4xl font-black">ImproviGator</h1>
            <p className="text-xs font-bold text-gray-700">
              Make a groove, chat, and record your takes.
            </p>
          </div>
          <div className="flex-1 rotate-[-0.6deg] overflow-hidden border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <LeftPanel />
          </div>
        </div>

        {/* Top Right - Chord Grid or MIDI Playback */}
        <div className="rotate-[0.4deg] overflow-hidden border-4 border-black bg-white shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <RightPanel />
        </div>

        {/* Bottom Left - Saved Chords */}
        <div className="rotate-[0.2deg] overflow-hidden border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <SavedChords />
        </div>

        {/* Bottom Right - Scale Diagram */}
        <div className="rotate-[-0.3deg] overflow-hidden border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <ScaleDiagram />
        </div>
      </div>
    </JamSessionProvider>
  );
}
