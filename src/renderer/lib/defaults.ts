import type { Frame } from "../../shared/protocol";
export const initialFrame: Frame = {
  character: "penguin",
  size: 160,
  mood: "平靜",
  reminders: true,
  activity: {
    workSeconds: 0,
    totalSeconds: 0,
    idleSeconds: 0,
    lastBreakSeconds: 0,
    paused: false,
  },
  roaming: true,
  sleeping: false,
  visible: true,
  mouse: { x: 140, y: 130 },
  state: "idle",
};
