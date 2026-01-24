import { LLMBackingTrackGenerator } from "~/app/_components/llm-generator";
import { StrudelRepl } from "~/app/_components/strudel-repl";
import { StrudelValidator } from "~/app/_components/strudel-validator";

export default function LLMTestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Strudel{" "}
          <span className="text-[hsl(280,100%,70%)]">Backing Tracks</span>
        </h1>
        <p className="text-center text-lg text-gray-300">
          Generate Strudel programming language code for backing tracks using
          Gemini LLM
        </p>
        <LLMBackingTrackGenerator />
        <div className="w-full max-w-4xl">
          <StrudelRepl />
        </div>
        <div className="w-full max-w-3xl">
          <StrudelValidator />
        </div>
      </div>
    </main>
  );
}
