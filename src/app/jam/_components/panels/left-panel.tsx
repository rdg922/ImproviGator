"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { useJamSession } from "../context/jam-session-context";
import ChatPanel from "./chat-panel";
import CreatePanel from "./create-panel";
import TrackSettingsPanel from "./track-settings-panel";

export default function LeftPanel() {
  const { leftPanelMode, setLeftPanelMode } = useJamSession();
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const createTabRef = useRef<HTMLButtonElement | null>(null);
  const chatTabRef = useRef<HTMLButtonElement | null>(null);
  const settingsTabRef = useRef<HTMLButtonElement | null>(null);

  useLayoutEffect(() => {
    const highlight = highlightRef.current;
    const tabsContainer = tabsRef.current;
    if (!highlight || !tabsContainer) {
      return;
    }

    const tabMap: Record<string, HTMLButtonElement | null> = {
      Create: createTabRef.current,
      Chat: chatTabRef.current,
      TrackSettings: settingsTabRef.current,
    };
    const activeTab = tabMap[leftPanelMode];
    if (!activeTab) {
      return;
    }

    const { offsetLeft, offsetWidth } = activeTab;
    const colors: Record<string, string> = {
      Create: "#60a5fa",
      Chat: "#4ade80",
      TrackSettings: "#c084fc",
    };

    gsap.set(highlight, {
      x: offsetLeft,
      width: offsetWidth,
      backgroundColor: colors[leftPanelMode],
    });
  }, []);

  useLayoutEffect(() => {
    const highlight = highlightRef.current;
    const tabsContainer = tabsRef.current;
    if (!highlight || !tabsContainer) {
      return;
    }

    const tabMap: Record<string, HTMLButtonElement | null> = {
      Create: createTabRef.current,
      Chat: chatTabRef.current,
      TrackSettings: settingsTabRef.current,
    };
    const activeTab = tabMap[leftPanelMode];
    if (!activeTab) {
      return;
    }

    const { offsetLeft, offsetWidth } = activeTab;
    const colors: Record<string, string> = {
      Create: "#60a5fa",
      Chat: "#4ade80",
      TrackSettings: "#c084fc",
    };

    gsap
      .timeline({ defaults: { ease: "power2.out" } })
      .to(highlight, {
        x: offsetLeft,
        width: offsetWidth,
        duration: 0.35,
      })
      .to(
        highlight,
        {
          backgroundColor: colors[leftPanelMode],
          duration: 0.2,
        },
        "<0.05",
      );

    const buttons = [
      createTabRef.current,
      chatTabRef.current,
      settingsTabRef.current,
    ].filter(Boolean) as HTMLButtonElement[];
    gsap.to(buttons, { scale: 1, y: 0, duration: 0.15, ease: "power2.out" });
    gsap.fromTo(
      activeTab,
      { scale: 0.99, y: 1 },
      {
        scale: 1.02,
        y: -1,
        duration: 0.18,
        yoyo: true,
        repeat: 1,
        ease: "power1.out",
      },
    );
  }, [leftPanelMode]);

  useLayoutEffect(() => {
    if (!contentRef.current) {
      return;
    }

    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" },
    );
  }, [leftPanelMode]);

  return (
    <div className="flex h-full flex-col border-4 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
      {/* Mode Selector */}
      <div
        ref={tabsRef}
        className="relative flex border-b-4 border-black bg-white"
      >
        <div
          ref={highlightRef}
          className="pointer-events-none absolute inset-y-0 left-0 z-0"
        />
        <button
          ref={createTabRef}
          onClick={() => setLeftPanelMode("Create")}
          className={`relative z-10 flex-1 border-r-4 border-black px-4 py-1 text-xs font-black tracking-wide uppercase transition-colors ${
            leftPanelMode === "Create"
              ? "text-black"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Create
        </button>
        <button
          ref={chatTabRef}
          onClick={() => setLeftPanelMode("Chat")}
          className={`relative z-10 flex-1 border-r-4 border-black px-4 py-1 text-xs font-black tracking-wide uppercase transition-colors ${
            leftPanelMode === "Chat"
              ? "text-black"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Chat
        </button>
        <button
          ref={settingsTabRef}
          onClick={() => setLeftPanelMode("TrackSettings")}
          className={`relative z-10 flex-1 px-4 py-1 text-xs font-black tracking-wide uppercase transition-colors ${
            leftPanelMode === "TrackSettings"
              ? "text-black"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Settings
        </button>
      </div>

      {/* Content Area */}
      <div ref={contentRef} className="flex-1 overflow-hidden">
        {leftPanelMode === "Create" && (
          <CreatePanel
            onGenerationComplete={() => setLeftPanelMode("TrackSettings")}
          />
        )}
        {leftPanelMode === "Chat" && <ChatPanel />}
        {leftPanelMode === "TrackSettings" && <TrackSettingsPanel />}
      </div>
    </div>
  );
}
