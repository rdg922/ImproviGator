import type {
  ChordSummaryMetrics,
  HarmonicAnalysisMetrics,
  HarmonicAnalysisResult,
  MidiNoteEvent,
  NoteHarmonicContext,
  ParsedChordToken,
} from "~/lib/analysis/harmonic-analysis";

export type AnalysisSkillLevel = "beginner" | "intermediate" | "advanced";

export interface AnalysisInput {
  midiData: MidiNoteEvent[];
  parsedChords: ParsedChordToken[];
  tempo: number;
  timeSignature: string;
  key: string;
  modality: string;
  skillLevel?: AnalysisSkillLevel;
}

export type AnalysisToolResult =
  | {
      type: "chord_tone_recommendation";
      chord: string;
      chordTones: string[];
      quality?: string;
      symbol?: string;
      suggestion: string;
    }
  | {
      type: "chord_scale_recommendation";
      chord: string;
      scaleName: string;
      scaleNotes: string[];
      quality?: string;
      symbol?: string;
      suggestion: string;
    };

export interface AnalysisOutput {
  success: boolean;
  analysis: HarmonicAnalysisResult;
  recommendations: {
    summary: string;
    toolResults: AnalysisToolResult[];
  };
}
