import { useEffect, useRef, useState } from "react";
import type { Frame, CommandValues, Peer } from "../../shared/protocol";
import { initialFrame } from "../lib/defaults";
export function useCompanion() {
  const [speech, setSpeech] = useState("");
  const [chatPeer, setChatPeer] = useState<Peer | null>(null);
  const [frame, setFrame] = useState(initialFrame),
    [happy, setHappy] = useState(false);
  const reactionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const react = () => {
    setHappy(true);
    clearTimeout(reactionTimer.current);
    reactionTimer.current = setTimeout(() => setHappy(false), 1800);
  };
  useEffect(() => {
    const off = window.pali?.subscribe((data) => {
      if ("speech" in data) setSpeech(data.speech);
      else if ("chat" in data) setChatPeer(data.chat?.peer || null);
      else if ("reaction" in data) react();
      else setFrame(data);
    });
    return () => {
      off?.();
      clearTimeout(reactionTimer.current);
    };
  }, []);
  const update = <K extends keyof Frame>(
    key: K & keyof CommandValues,
    value: Frame[K],
  ) => {
    window.pali?.command(key, value as never);
    if (!window.pali)
      setFrame((f) => ({
        ...f,
        [key]: value,
        state: key === "sleeping" ? (value ? "sleeping" : "idle") : f.state,
      }));
  };
  return {
    frame,
    setFrame,
    happy,
    setHappy,
    speech,
    chatPeer,
    react,
    update,
  };
}
export type CompanionModel = ReturnType<typeof useCompanion>;
