"use client";

import LeftPanel from "./_components/left-panel";
import RightPanel from "./_components/right-panel";
import SavedChords from "./_components/saved-chords";
import ScaleDiagram from "./_components/scale-diagram";
import { JamSessionProvider } from "./_components/jam-session-context";

export default function JamPage() {
  return (
    <JamSessionProvider>
      <div className="flex h-screen flex-col bg-amber-100 p-3">
        {/* Main Content Container */}
        <div className="flex flex-1 flex-col gap-3 overflow-hidden">
          {/* Upper Half */}
          <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
            {/* Left 1/3 - Mode-dependent panel with title */}
            <div className="flex w-1/3 flex-col gap-2">
              <h1 className="text-center text-4xl font-black">Improv Tool</h1>
              <div className="flex-1 overflow-hidden">
                <LeftPanel />
              </div>
            </div>

            {/* Right 2/3 - Chord Grid or MIDI Playback */}
            <div className="w-2/3">
              <RightPanel />
            </div>
          </div>

          {/* Bottom Half - Persistent elements */}
          <div className="flex h-[240px] min-h-[240px] gap-3">
            {/* Bottom Left 1/3 - Saved Chords */}
            <div className="w-1/3">
              <SavedChords />
            </div>

            {/* Bottom Right 2/3 - Scale Diagram */}
            <div className="w-2/3">
              <ScaleDiagram />
            </div>
          </div>
        </div>
      </div>
    </JamSessionProvider>
  );
}
