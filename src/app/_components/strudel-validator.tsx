"use client";

import { useState } from "react";
import { validateStrudelAction } from "~/app/_actions/validate-strudel";
import { type StrudelValidationResult } from "~/services/strudelValidation";

const STATUS_STYLES = {
  success: "border-green-400/60 bg-green-500/10 text-green-100",
  error: "border-red-400/60 bg-red-500/10 text-red-100",
} as const;

export function StrudelValidator() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<StrudelValidationResult | null>(null);
  const [hasValidated, setHasValidated] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleValidate = async (event: React.FormEvent) => {
    event.preventDefault();
    setHasValidated(false);
    setIsValidating(true);
    try {
      const validation = await validateStrudelAction(code);
      setResult(validation);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error
          ? error.message
          : "Unexpected error while validating Strudel code.";
      setResult({ isValid: false, error: { message: fallbackMessage } });
    } finally {
      setHasValidated(true);
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setCode("");
    setResult(null);
    setHasValidated(false);
  };

  const statusTone = result?.isValid ? "success" : "error";
  const statusMessage = result?.isValid
    ? "Looks good! The code transpiles and evaluates in the Strudel runtime."
    : (result?.error?.message ?? "Unknown validation error.");

  return (
    <section className="rounded-lg bg-white/10 p-6">
      <header className="mb-4">
        <p className="text-sm tracking-[0.2em] text-white/70 uppercase">
          Manual QA Tool
        </p>
        <h2 className="text-2xl font-bold text-white">Validate Strudel</h2>
        <p className="text-sm text-white/70">
          Paste Strudel code below and run the shared validator to catch syntax
          and runtime issues before pushing changes.
        </p>
      </header>

      <form onSubmit={handleValidate} className="flex flex-col gap-4">
        <label htmlFor="validator-code" className="text-sm font-semibold">
          Strudel Code Sample
        </label>
        <textarea
          id="validator-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={'d1 $ sound"bd sd"'}
          className="min-h-[160px] rounded border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder-gray-400 focus:border-white/50 focus:outline-none"
        />

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!code.trim() || isValidating}
            className="rounded bg-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isValidating ? "Validating..." : "Validate"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!code}
            className="rounded border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </form>

      {isValidating && (
        <p className="mt-4 text-sm text-white/70">
          Running syntax and runtime checks...
        </p>
      )}

      {hasValidated && (
        <div
          className={`mt-4 rounded border px-4 py-3 text-sm ${STATUS_STYLES[statusTone]}`}
        >
          <p className="font-semibold">{statusMessage}</p>
          {!result?.isValid && result?.error && (
            <ul className="mt-2 text-xs text-white/80">
              {result.error.line && <li>Line: {result.error.line}</li>}
              {result.error.column && <li>Column: {result.error.column}</li>}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
