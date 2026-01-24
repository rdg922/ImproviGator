"use client";

import { useJamSession } from "./jam-session-context";

export default function AdvancedPanel() {
  const { strudelCode, setStrudelCode } = useJamSession();

  return (
    <div className="flex h-full flex-col p-4">
      <label className="mb-2 text-sm font-bold tracking-wide uppercase">
        Generated Strudel Code
      </label>
      <textarea
        value={strudelCode}
        onChange={(e) => setStrudelCode(e.target.value)}
        placeholder="// Generated Strudel code will appear here..."
        className="flex-1 border-4 border-black bg-gray-50 px-4 py-3 font-mono text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:ring-0 focus:outline-none"
      ></textarea>
      <button className="mt-3 w-full border-4 border-black bg-orange-400 px-6 py-3 text-lg font-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-transform hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none">
        Apply Code
      </button>
    </div>
  );
}
