import type { Metadata } from "next";
import PitchDetector from "~/components/audio/pitch-detector";

export const metadata: Metadata = {
  title: "Audio Test",
  description:
    "Record or upload audio clips to inspect pitches and melodic contours.",
};

export default function AudioTestPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundColor: "#020617",
        padding: "2rem 1rem",
      }}
    >
      <PitchDetector />
    </main>
  );
}
