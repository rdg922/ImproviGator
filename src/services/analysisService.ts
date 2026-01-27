import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { env } from "~/env";
import { analyzeHarmonicContext } from "~/lib/analysis/harmonic-analysis";
import { Chord, Note, Scale } from "tonal";
import type { AnalysisInput, AnalysisOutput } from "~/types/analysis";

const MAX_GEMINI_ATTEMPTS = 3;

const ANALYSIS_PROMPT_INSTRUCTION = `You are a friendly, human-sounding improvisation coach.

Output format (Markdown only):
- Start with **Overview** (1–2 sentences). Include concrete values from the provided metrics (e.g., note count, in-key/out-of-key ratio, small-step vs leap balance). If detected scales/arpeggios are present, mention them.
- Then a **Focus Areas** section with 2–3 bullet points.
- End with **Next Steps** and ask exactly ONE clarifying question. Offer an alternative scale or arpeggio if possible.

Rules:
- Use only the provided numbers/labels. Do not include placeholders or tool-call text.
- Do not mention tools or write call_tool(...) text.
- Keep it short and encouraging.`;

type ConversationEntry = Content;

type ConversationPart = Part;

const createUserPrompt = (prompt: string): ConversationEntry => ({
  role: "user",
  parts: [{ text: prompt }],
});

const extractTextFromParts = (parts?: ConversationPart[]) => {
  if (!parts?.length) {
    return "";
  }

  return parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .filter((text) => text.trim().length > 0)
    .join("\n")
    .trim();
};

const summarizeAnalysis = async (input: {
  summaryPayload: Record<string, unknown>;
  key: string;
  modality: string;
}): Promise<{ response: string }> => {
  if (!env.GEMINI_API_KEY) {
    return {
      response:
        "Analysis complete. Configure GEMINI_API_KEY to enable AI feedback.",
    };
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const prompt = `${ANALYSIS_PROMPT_INSTRUCTION}\n\nAnalyze this solo and suggest improvements.\n\n${JSON.stringify(
    input.summaryPayload,
    null,
    2,
  )}`;

  const conversation: ConversationEntry[] = [createUserPrompt(prompt)];

  for (let attempt = 1; attempt <= MAX_GEMINI_ATTEMPTS; attempt++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: conversation,
    });

    const candidateContent = response.candidates?.[0]?.content;
    if (candidateContent) {
      conversation.push(candidateContent);
    }

    const responseText = extractTextFromParts(candidateContent?.parts ?? []);
    return {
      response: responseText || "Analysis complete.",
    };
  }

  return {
    response: "Analysis complete.",
  };
};

export const analyzeRecording = async (
  input: AnalysisInput,
): Promise<AnalysisOutput> => {
  const harmonicAnalysis = analyzeHarmonicContext({
    midiData: input.midiData,
    parsedChords: input.parsedChords,
    tempo: input.tempo,
    timeSignature: input.timeSignature,
    key: input.key,
    modality: input.modality,
  });

  const usedPitchClasses = new Set(
    input.midiData
      .map((note) => Note.pitchClass(Note.fromMidi(note.pitch)))
      .filter((value): value is string => Boolean(value)),
  );

  const usedPitchClassList = Array.from(usedPitchClasses);

  const chordCoverageMap = new Map<
    string,
    { total: number; matches: number }
  >();
  harmonicAnalysis.noteContexts.forEach((context) => {
    const chordName = context.chordNames[0] ?? "";
    if (!chordName) return;
    const chord = Chord.get(chordName);
    if (!chord.notes.length) return;
    const chordPitchClasses = chord.notes
      .map((note) => Note.pitchClass(note))
      .filter((value): value is string => Boolean(value));

    const entry = chordCoverageMap.get(chordName) ?? { total: 0, matches: 0 };
    entry.total += 1;
    if (context.pitchClass && chordPitchClasses.includes(context.pitchClass)) {
      entry.matches += 1;
    }
    chordCoverageMap.set(chordName, entry);
  });

  const detectedArpeggios = Array.from(chordCoverageMap.entries())
    .map(([chord, stats]) => ({
      chord,
      coverage: stats.total > 0 ? stats.matches / stats.total : 0,
      totalNotes: stats.total,
    }))
    .filter((item) => item.totalNotes >= 3 && item.coverage >= 0.6)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 3);

  const scaleCandidates = Array.from(
    new Set([
      input.modality,
      "major",
      "minor",
      "dorian",
      "mixolydian",
      "aeolian",
    ]),
  );

  const detectedScales = scaleCandidates
    .map((scaleName) => {
      const scale = Scale.get(`${input.key} ${scaleName}`.trim());
      if (!scale.notes.length || usedPitchClassList.length === 0) return null;
      const scalePitchClasses = new Set(
        scale.notes
          .map((note) => Note.pitchClass(note))
          .filter((value): value is string => Boolean(value)),
      );
      const matches = usedPitchClassList.filter((pc) =>
        scalePitchClasses.has(pc),
      ).length;
      const coverage = matches / usedPitchClassList.length;
      return {
        scale: scale.name || `${input.key} ${scaleName}`,
        coverage,
      };
    })
    .filter((item): item is { scale: string; coverage: number } =>
      Boolean(item),
    )
    .filter((item) => item.coverage >= 0.7)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 3);

  const summaryPayload = {
    key: input.key,
    modality: input.modality,
    tempo: input.tempo,
    timeSignature: input.timeSignature,
    skillLevel: input.skillLevel ?? "beginner",
    metrics: harmonicAnalysis.metrics,
    perChord: harmonicAnalysis.perChord,
    melodicContour: harmonicAnalysis.melodicContour,
    intervalDistribution: harmonicAnalysis.intervalDistribution,
    overview: {
      totalNotes: harmonicAnalysis.metrics.totalNotes,
      chordToneRatio: harmonicAnalysis.metrics.chordToneRatio,
      scaleToneRatio: harmonicAnalysis.metrics.scaleToneRatio,
      outsideScaleRatio: harmonicAnalysis.metrics.outsideScaleRatio,
      strongBeatChordToneRatio:
        harmonicAnalysis.metrics.strongBeatChordToneRatio,
      averageInterval: harmonicAnalysis.melodicContour.averageInterval,
      smallStepRatio: harmonicAnalysis.melodicContour.smallStepRatio,
      largeLeapRatio: harmonicAnalysis.melodicContour.largeLeapRatio,
      averageDuration:
        harmonicAnalysis.melodicContour.durationVariety.averageDuration,
    },
    detectedScales,
    detectedArpeggios,
  };

  const aiSummary = await summarizeAnalysis({
    summaryPayload,
    key: input.key,
    modality: input.modality,
  });

  return {
    success: true,
    analysis: harmonicAnalysis,
    recommendations: {
      summary: aiSummary.response,
      toolResults: [],
    },
  };
};
