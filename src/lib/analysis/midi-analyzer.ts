import { Note as TonalNote } from "tonal";
import type { Note } from "./pitch-detection";
import {
  NOTE_NAMES,
  SCALE_NAMES,
  SCALE_TONAL_LOOKUP,
} from "~/lib/music/theory";
import { getScalePitchClassSet } from "~/lib/music/scale-utils";

export interface ScaleAnalysis {
  totalNotes: number;
  notesInScale: number;
  notesOutsideScale: number;
  percentageInScale: number;
}

export interface MelodicInterval {
  startNote: number;
  endNote: number;
  semitones: number;
  startTime: number;
}

export interface MelodicContourAnalysis {
  totalIntervals: number;
  smallSteps: number;
  mediumSteps: number;
  largeLeaps: number;
  averageInterval: number;
  intervalVariance: number;
  smallStepRatio: number;
  largeLeapRatio: number;
  pitchEntropy: number;
  durationVariety: {
    shortNotes: number;
    mediumNotes: number;
    longNotes: number;
    averageDuration: number;
  };
  feedback: string;
}

export class MidiAnalyzer {
  constructor(private readonly notes: Note[]) {}

  static midiToName(midiNumber: number): string {
    return TonalNote.fromMidi(midiNumber) ?? `MIDI ${midiNumber}`;
  }

  private getScalePitchClasses(
    rootNote: string,
    scaleName: string,
  ): Set<string> {
    if (!SCALE_TONAL_LOOKUP[scaleName]) return new Set();
    return getScalePitchClassSet(rootNote, scaleName);
  }

  isNoteInScale(
    midiNumber: number,
    rootNote: string,
    scaleName: string,
  ): boolean {
    const scalePitchClasses = this.getScalePitchClasses(rootNote, scaleName);
    if (!scalePitchClasses.size) return false;

    const midiName = TonalNote.fromMidi(midiNumber);
    if (!midiName) return false;

    const pitchClass = TonalNote.pitchClass(midiName);
    return pitchClass ? scalePitchClasses.has(pitchClass) : false;
  }

  getNotesOutsideScale(rootNote: string, scaleName: string): Note[] {
    return this.notes.filter(
      (note) => !this.isNoteInScale(note.pitchMidi, rootNote, scaleName),
    );
  }

  analyzeScaleCompliance(rootNote: string, scaleName: string): ScaleAnalysis {
    const totalNotes = this.notes.length;
    const outside = this.getNotesOutsideScale(rootNote, scaleName);
    const notesOutsideScale = outside.length;
    const notesInScale = totalNotes - notesOutsideScale;
    const percentageInScale =
      totalNotes > 0 ? (notesInScale / totalNotes) * 100 : 0;

    return {
      totalNotes,
      notesInScale,
      notesOutsideScale,
      percentageInScale,
    };
  }

  getIntervalDistribution(): Record<string, number> {
    const intervals = this.calculateIntervals();
    const distribution: Record<string, number> = {};

    intervals.forEach((interval) => {
      const label = `${interval.semitones} semitone${interval.semitones === 1 ? "" : "s"}`;
      distribution[label] = (distribution[label] || 0) + 1;
    });

    return distribution;
  }

  analyzeMelodicContour(): MelodicContourAnalysis {
    const intervals = this.calculateIntervals();

    if (!intervals.length) {
      return {
        totalIntervals: 0,
        smallSteps: 0,
        mediumSteps: 0,
        largeLeaps: 0,
        averageInterval: 0,
        intervalVariance: 0,
        smallStepRatio: 0,
        largeLeapRatio: 0,
        pitchEntropy: 0,
        durationVariety: {
          shortNotes: 0,
          mediumNotes: 0,
          longNotes: 0,
          averageDuration: 0,
        },
        feedback: "Not enough notes to analyze melodic contour.",
      };
    }

    let smallSteps = 0;
    let mediumSteps = 0;
    let largeLeaps = 0;

    intervals.forEach((interval) => {
      if (interval.semitones <= 2) {
        smallSteps++;
      } else if (interval.semitones <= 5) {
        mediumSteps++;
      } else {
        largeLeaps++;
      }
    });

    const totalIntervals = intervals.length;
    const smallStepRatio = smallSteps / totalIntervals;
    const largeLeapRatio = largeLeaps / totalIntervals;
    const averageInterval =
      intervals.reduce((sum, item) => sum + item.semitones, 0) / totalIntervals;

    const variance =
      intervals.reduce((sum, item) => {
        const diff = item.semitones - averageInterval;
        return sum + diff * diff;
      }, 0) / totalIntervals;

    const entropy = this.calculatePitchEntropy();
    const durationVariety = this.analyzeDurationVariety();
    const feedback = this.generateMelodicFeedback(
      smallStepRatio,
      largeLeapRatio,
      averageInterval,
      variance,
      entropy,
      durationVariety,
    );

    return {
      totalIntervals,
      smallSteps,
      mediumSteps,
      largeLeaps,
      averageInterval,
      intervalVariance: variance,
      smallStepRatio,
      largeLeapRatio,
      pitchEntropy: entropy,
      durationVariety,
      feedback,
    };
  }

  private calculateIntervals(): MelodicInterval[] {
    if (this.notes.length < 2) return [];

    const sorted = [...this.notes].sort(
      (a, b) => a.startTimeSeconds - b.startTimeSeconds,
    );
    const intervals: MelodicInterval[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];
      intervals.push({
        startNote: current.pitchMidi,
        endNote: next.pitchMidi,
        semitones: Math.abs(next.pitchMidi - current.pitchMidi),
        startTime: current.startTimeSeconds,
      });
    }

    return intervals;
  }

  private calculatePitchEntropy(): number {
    if (!this.notes.length) return 0;

    const pitchCounts: Record<number, number> = {};
    this.notes.forEach((note) => {
      pitchCounts[note.pitchMidi] = (pitchCounts[note.pitchMidi] || 0) + 1;
    });

    const totalNotes = this.notes.length;
    const probabilities = Object.values(pitchCounts).map(
      (count) => count / totalNotes,
    );

    return -probabilities.reduce(
      (sum, probability) => sum + probability * Math.log2(probability),
      0,
    );
  }

  private analyzeDurationVariety() {
    if (!this.notes.length) {
      return {
        shortNotes: 0,
        mediumNotes: 0,
        longNotes: 0,
        averageDuration: 0,
      };
    }

    let shortNotes = 0;
    let mediumNotes = 0;
    let longNotes = 0;
    let totalDuration = 0;

    this.notes.forEach((note) => {
      totalDuration += note.durationSeconds;
      if (note.durationSeconds < 0.3) {
        shortNotes++;
      } else if (note.durationSeconds <= 0.8) {
        mediumNotes++;
      } else {
        longNotes++;
      }
    });

    return {
      shortNotes,
      mediumNotes,
      longNotes,
      averageDuration: totalDuration / this.notes.length,
    };
  }

  private generateMelodicFeedback(
    smallStepRatio: number,
    largeLeapRatio: number,
    averageInterval: number,
    variance: number,
    entropy: number,
    durationVariety: {
      shortNotes: number;
      mediumNotes: number;
      longNotes: number;
      averageDuration: number;
    },
  ): string {
    const feedback: string[] = [];
    const totalNotes =
      durationVariety.shortNotes +
      durationVariety.mediumNotes +
      durationVariety.longNotes;

    if (smallStepRatio > 0.8) {
      feedback.push(
        "**Stepwise Motion:** Your melody is mostly stepwise (small intervals). Try adding larger leaps (>5 semitones) for contrast.",
      );
    } else if (smallStepRatio < 0.3) {
      feedback.push(
        "**Stepwise Motion:** Your melody uses few stepwise movements. Incorporate more 1-2 semitone motions for smoother phrases.",
      );
    }

    if (largeLeapRatio > 0.4) {
      feedback.push(
        "**Jumps:** Numerous large leaps create drama but may feel disjointed or hard to sing.",
      );
    } else if (largeLeapRatio === 0) {
      feedback.push(
        "**Jumps:** No large leaps detected. Add a few 6+ semitone jumps to energize the melody.",
      );
    }

    if (variance < 2) {
      feedback.push(
        "**Consistency:** Intervals are highly consistent. Mix in varied interval sizes for interest.",
      );
    } else if (variance > 15) {
      feedback.push(
        "**Consistency:** Interval variance is high, which may feel chaotic. Consider repeating motifs.",
      );
    }

    if (averageInterval < 1.5) {
      feedback.push(
        "**Range:** Average movement is very small. Larger intervals can widen the melodic palette.",
      );
    } else if (averageInterval > 5) {
      feedback.push(
        "**Range:** Intervals are large on average, which can be difficult to perform. Blend in more stepwise motion.",
      );
    }

    if (entropy < 1.5) {
      feedback.push(
        "**Predictability:** Pitch choices are repetitive. Introduce new scale degrees or ornaments.",
      );
    } else if (entropy > 4.5) {
      feedback.push(
        "**Predictability:** Pitch choices are very random. Anchor the listener with recurring ideas.",
      );
    }

    if (totalNotes > 0) {
      const shortRatio = durationVariety.shortNotes / totalNotes;
      const mediumRatio = durationVariety.mediumNotes / totalNotes;
      const longRatio = durationVariety.longNotes / totalNotes;

      if (shortRatio > 0.85) {
        feedback.push(
          "**Note Duration:** Mostly short notes. Sustain a few tones to add contrast.",
        );
      } else if (longRatio > 0.7) {
        feedback.push(
          "**Note Duration:** Many long notes. Sprinkle in short rhythmic ideas for momentum.",
        );
      } else if (shortRatio < 0.1 && mediumRatio < 0.1) {
        feedback.push(
          "**Note Duration:** Durations are uniform. Mix short, medium, and long values for variety.",
        );
      }
    }

    return feedback.length
      ? feedback.join("\n")
      : "Your melody has good overall balance!";
  }
}
