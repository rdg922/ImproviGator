"use client";

import LeftPanel from "./_components/panels/left-panel";
import RightPanel from "./_components/right-panel/index";
import SavedChords from "./_components/chords/saved-chords";
import ScaleDiagram from "./_components/visuals/scale-diagram";
import { JamSessionProvider } from "./_components/context/jam-session-context";

export default function JamPage() {
  return (
    <JamSessionProvider>
      <div className="grid h-screen grid-cols-[2fr_5fr] grid-rows-[3fr_240px] gap-3 bg-amber-100 p-3">
        {/* Top Left - Mode-dependent panel with title */}
        <div className="flex flex-col gap-2 overflow-hidden mt-2">
          <h1 className="text-center text-4xl font-black">Improv Tool</h1>
          <div className="flex-1 overflow-hidden">
            <LeftPanel />
          </div>
        </div>

        {/* Top Right - Chord Grid or MIDI Playback */}
        <div className="overflow-hidden">
          <RightPanel />
        </div>

        {/* Bottom Left - Saved Chords */}
        <div className="overflow-hidden">
          <SavedChords />
        </div>

        {/* Bottom Right - Scale Diagram */}
        <div className="overflow-hidden">
          <ScaleDiagram />
        </div>
      </div>
    </JamSessionProvider>
  );
}
