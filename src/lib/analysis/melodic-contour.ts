import type { Note } from "./pitch-detection";

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

export function calculateIntervals(notes: Note[]): MelodicInterval[] {
  if (notes.length < 2) return [];

  const sortedNotes = [...notes].sort(
    (a, b) => a.startTimeSeconds - b.startTimeSeconds,
  );

  const intervals: MelodicInterval[] = [];

  for (let i = 0; i < sortedNotes.length - 1; i++) {
    const current = sortedNotes[i];
    const next = sortedNotes[i + 1];

    intervals.push({
      startNote: current.pitchMidi,
      endNote: next.pitchMidi,
      semitones: Math.abs(next.pitchMidi - current.pitchMidi),
      startTime: current.startTimeSeconds,
    });
  }

  return intervals;
}

export function calculatePitchEntropy(notes: Note[]): number {
  if (notes.length === 0) return 0;

  const pitchCounts: Record<number, number> = {};
  notes.forEach((note) => {
    pitchCounts[note.pitchMidi] = (pitchCounts[note.pitchMidi] || 0) + 1;
  });

  const totalNotes = notes.length;
  const probabilities = Object.values(pitchCounts).map(
    (count) => count / totalNotes,
  );

  const entropy = -probabilities.reduce((sum, p) => {
    return sum + p * Math.log2(p);
  }, 0);

  return entropy;
}

export function analyzeDurationVariety(notes: Note[]): {
  shortNotes: number;
  mediumNotes: number;
  longNotes: number;
  averageDuration: number;
} {
  if (notes.length === 0) {
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

  notes.forEach((note) => {
    const duration = note.durationSeconds;
    totalDuration += duration;

    if (duration < 0.3) {
      shortNotes++;
    } else if (duration <= 0.8) {
      mediumNotes++;
    } else {
      longNotes++;
    }
  });

  return {
    shortNotes,
    mediumNotes,
    longNotes,
    averageDuration: totalDuration / notes.length,
  };
}

export function analyzeMelodicContour(notes: Note[]): MelodicContourAnalysis {
  const intervals = calculateIntervals(notes);

  if (intervals.length === 0) {
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
    intervals.reduce((sum, i) => sum + i.semitones, 0) / totalIntervals;

  const variance =
    intervals.reduce((sum, i) => {
      const diff = i.semitones - averageInterval;
      return sum + diff * diff;
    }, 0) / totalIntervals;

  const entropy = calculatePitchEntropy(notes);
  const durationVariety = analyzeDurationVariety(notes);
  const feedback = generateMelodicFeedback(
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

function generateMelodicFeedback(
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
      "**Stepwise Motion:** Your melody is mostly stepwise (small intervals). Try adding larger interval leaps (>5 semitones) to create excitement and contrast.",
    );
  } else if (smallStepRatio < 0.3) {
    feedback.push(
      "**Stepwise Motion:** Your melody has very few stepwise movements. Consider adding more small steps (1-2 semitones) for smoother, more singable phrases.",
    );
  }

  if (largeLeapRatio > 0.4) {
    feedback.push(
      "**Jumps:** You have many large leaps in your melody, which creates drama and energy but may be difficult to sing.",
    );
  } else if (largeLeapRatio === 0) {
    feedback.push(
      "**Jumps:** No large leaps detected. Adding occasional jumps of 6+ semitones can make your melody more exciting.",
    );
  }

  if (variance < 2) {
    feedback.push(
      "**Consistency:** Your intervals are very consistent. Adding more variety in interval sizes can make the melody more interesting.",
    );
  } else if (variance > 15) {
    feedback.push(
      "**Consistency:** High interval variance detected - your melody is very unpredictable and may lack coherence.",
    );
  }

  if (averageInterval < 1.5) {
    feedback.push(
      "**Range:** Your melody moves in very small steps on average. Consider adding some larger intervals for more variety.",
    );
  } else if (averageInterval > 5) {
    feedback.push(
      "**Range:** Your melody has very large average intervals. This may be difficult to perform - consider adding more stepwise motion.",
    );
  }

  if (entropy < 1.5) {
    feedback.push(
      "**Predictability:** Your note choices are very repetitive (low entropy). Try introducing more pitch variety or melodic development.",
    );
  } else if (entropy > 4.5) {
    feedback.push(
      "**Predictability:** Your note choices are very random (high entropy). Try repeating a motif or establishing a clearer melodic pattern to ground the listener.",
    );
  }

  if (totalNotes > 0) {
    const shortRatio = durationVariety.shortNotes / totalNotes;
    const mediumRatio = durationVariety.mediumNotes / totalNotes;
    const longRatio = durationVariety.longNotes / totalNotes;

    if (shortRatio > 0.85) {
      feedback.push(
        "**Note Duration:** Most of your notes are short staccato. Try holding some longer notes to vary the texture and create more interest.",
      );
    } else if (longRatio > 0.7) {
      feedback.push(
        "**Note Duration:** Most of your notes are held for a long time. Try adding some shorter, rhythmic notes for contrast.",
      );
    } else if (shortRatio < 0.1 && mediumRatio < 0.1) {
      feedback.push(
        "**Note Duration:** Your durations are very uniform. Try mixing short, medium, and long notes for better rhythmic variety.",
      );
    }
  }

  return feedback.length > 0
    ? feedback.join("\n")
    : "Your melody has good overall balance!";
}

export function getIntervalDistribution(notes: Note[]): Record<string, number> {
  const intervals = calculateIntervals(notes);
  const distribution: Record<string, number> = {};

  intervals.forEach((interval) => {
    const key = `${interval.semitones} semitone${interval.semitones !== 1 ? "s" : ""}`;
    distribution[key] = (distribution[key] || 0) + 1;
  });

  return distribution;
}
