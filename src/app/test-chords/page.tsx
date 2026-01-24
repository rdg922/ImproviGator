"use client";

import { useState } from "react";

function parseChords(code: string) {
  // Match chord() with backticks, double quotes, or single quotes
  const chordLineMatch = code.match(
    /let\s+chords\s*=\s*chord\(([`"])([^`"']+)\1\)/s,
  );
  if (!chordLineMatch) return [];

  let rawContent = chordLineMatch[2];

  // Try to extract content within < > to ignore multipliers like *4
  // If no angle brackets, use the entire content
  const angleMatch = rawContent.match(/<([^>]+)>/s);
  if (angleMatch) {
    rawContent = angleMatch[1];
  }

  // Remove comments (// single-line comments)
  let chordContent = rawContent
    .split("\n")
    .map((line) => {
      const commentIndex = line.indexOf("//");
      return commentIndex >= 0 ? line.substring(0, commentIndex) : line;
    })
    .join(" ")
    .trim();

  const tokens: Array<{ chord: string | string[]; index: number }> = [];
  let index = 0;
  let i = 0;

  while (i < chordContent.length) {
    // Skip whitespace
    while (i < chordContent.length && /\s/.test(chordContent[i])) {
      i++;
    }
    if (i >= chordContent.length) break;

    // Check for bracketed group
    if (chordContent[i] === "[") {
      i++;
      const groupChords: string[] = [];
      let buffer = "";

      while (i < chordContent.length && chordContent[i] !== "]") {
        if (/\s/.test(chordContent[i])) {
          if (buffer) {
            groupChords.push(buffer);
            buffer = "";
          }
        } else {
          buffer += chordContent[i];
        }
        i++;
      }
      if (buffer) groupChords.push(buffer);
      if (groupChords.length > 0) {
        tokens.push({ chord: groupChords, index });
        index++;
      }
      i++; // skip ']'
    } else {
      // Single chord
      let buffer = "";
      while (i < chordContent.length && !/[\s\[\]]/.test(chordContent[i])) {
        buffer += chordContent[i];
        i++;
      }
      if (buffer) {
        tokens.push({ chord: buffer, index });
        index++;
      }
    }
  }

  return tokens;
}

const TEST_CASES = [
  {
    name: "Backticks with angle brackets and comments",
    code: `setcps(130/60/4)

let chords = chord(\`<
Fm9 Bb13 Eb^9 [Gm7 C7b9] // Jazz progression
>\`)

// Piano: Syncopated bossa clave pattern
$: chords.struct("x ~ x ~ ~ x ~ x").voicing().piano().room(.5).velocity(.7)`,
  },
  {
    name: "Double quotes with angle brackets and multiplier",
    code: `setcps(120/60/4)

let chords = chord("<C^7 G^7 Am7 F^7>*4")

// Drums
$: s("bd*4 [~ sd] bd [~ sd], hh*8").bank("RolandTR808").gain(1)`,
  },
  {
    name: "Backticks without angle brackets (multi-line)",
    code: `setcpm(120/4)

let chords = chord(\`
C^7 F^7 G7 C^7
Am7 Dm7 G7 C^7
C^7 F^7 G7 C^7
Am7 Dm7 G7 C^7
\`)

// Piano
$: chords.voicing().s("piano").room(.3).velocity(.7).gain(1)`,
  },
  {
    name: "Single quotes with angle brackets",
    code: `setcps(120/60/4)

let chords = chord('<Dm7 G7 C^7 A7>*2')

$: chords.voicing().s("piano")`,
  },
];

const EXAMPLE_CODE = TEST_CASES[0].code;

export default function TestChordsPage() {
  const [strudelCode, setStrudelCode] = useState(EXAMPLE_CODE);
  const [parsedChords, setParsedChords] = useState<
    Array<{ chord: string | string[]; index: number }>
  >([]);
  const [selectedTest, setSelectedTest] = useState(0);

  const handleParse = () => {
    const result = parseChords(strudelCode);
    setParsedChords(result);
  };

  const loadTestCase = (index: number) => {
    setSelectedTest(index);
    setStrudelCode(TEST_CASES[index].code);
    setParsedChords([]);
  };

  return (
    <div className="min-h-screen bg-amber-100 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-6 text-center text-4xl font-black">
          Chord Parser Tester
        </h1>

        <div className="mb-6">
          <label className="mb-2 block text-lg font-bold">Test Cases:</label>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {TEST_CASES.map((testCase, idx) => (
              <button
                key={idx}
                onClick={() => loadTestCase(idx)}
                className={`border-4 border-black px-4 py-2 text-left font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  selectedTest === idx ? "bg-green-400" : "bg-white"
                }`}
              >
                {idx + 1}. {testCase.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-lg font-bold">Strudel Code:</label>
          <textarea
            value={strudelCode}
            onChange={(e) => setStrudelCode(e.target.value)}
            rows={12}
            className="w-full border-4 border-black bg-white p-4 font-mono text-sm shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:outline-none"
            placeholder="Paste your Strudel code here..."
          />
        </div>

        <button
          onClick={handleParse}
          className="mb-6 w-full border-4 border-black bg-blue-400 px-6 py-3 text-xl font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none"
        >
          Parse Chords
        </button>

        <div className="border-4 border-black bg-white p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="mb-4 text-2xl font-black">Parsed Results:</h2>

          {parsedChords.length === 0 ? (
            <p className="text-gray-500 italic">
              No chords parsed yet. Click &quot;Parse Chords&quot; to see
              results.
            </p>
          ) : (
            <div className="space-y-4">
              <p className="font-bold">
                Found {parsedChords.length} chord
                {parsedChords.length !== 1 ? "s" : ""}
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                {parsedChords.map((item, idx) => (
                  <div
                    key={idx}
                    className="border-4 border-black bg-yellow-200 p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="mb-2 text-xs font-bold text-gray-600">
                      Index {item.index}
                    </div>
                    {Array.isArray(item.chord) ? (
                      <div>
                        <div className="mb-1 text-xs font-bold text-purple-600">
                          [Bracketed Group]
                        </div>
                        {item.chord.map((c, i) => (
                          <div key={i} className="text-lg font-black">
                            {c}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xl font-black">{item.chord}</div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t-4 border-black pt-4">
                <h3 className="mb-2 font-bold">Raw JSON Output:</h3>
                <pre className="overflow-x-auto rounded border-2 border-gray-300 bg-gray-50 p-3 text-xs">
                  {JSON.stringify(parsedChords, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
