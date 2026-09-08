export type InteractionScene = {
  perspective: "sender" | "receiver";
  originX: number;
  action:
    "kiss" | "tea" | "hug" | "cheer" | "ball-invite" | "ball" | "ball-end";
  eventId: string;
  from: Peer;
  to: Peer;
  startedAt: number;
  size: number;
  targetX: number;
  top: number;
};
export type Frame = {
  partReaction?: { part: "hand" | "foot" | "ear"; until: number } | null;
  scene?: InteractionScene | null;
  social?: SocialState;
  character: string;
  size: number;
  mood: string;
  reminders: boolean;
  activity: {
    workSeconds: number;
    totalSeconds: number;
    idleSeconds: number;
    lastBreakSeconds: number;
    paused: boolean;
  };
  roaming: boolean;
  sleeping: boolean;
  visible: boolean;
  mouse: { x: number; y: number };
  state: string;
};

export type CompanionEvent =
  | Frame
  | { reaction: true }
  | { speech: string }
  | { chat: { peer: Peer } | null };
export type CommandValues = {
  "social-config": { url: string; enabled: boolean; accessKey?: string };
  "social-action": SocialAction;
  "chat-open": string;
  "chat-close": undefined;
  "drag-start": undefined;
  "drag-end": undefined;
  panel: undefined;
  "pet-menu": undefined;
  "pet-part": "hand" | "foot" | "ear";
  pet: undefined;
  quit: undefined;
  character: string;
  size: number;
  mood: string;
  roaming: boolean;
  sleeping: boolean;
  visible: boolean;
  reminders: boolean;
};
export type Command = <K extends keyof CommandValues>(
  action: K,
  ...args: CommandValues[K] extends undefined
    ? [value?: undefined]
    : [value: CommandValues[K]]
) => void;
export interface CompanionBridge {
  command: Command;
  subscribe: (callback: (event: CompanionEvent) => void) => () => void;
}

export type Peer = { id: string; character: string; label: string };
export type SocialAction =
  | { type: "chat.send"; to: string; text: string }
  | {
      type: "interaction.send";
      to: string;
      action: "tea" | "kiss" | "hug" | "cheer" | "ball";
    }
  | { type: "ball.invite"; to: string }
  | { type: "ball.reply"; inviteId: string; accept: boolean }
  | { type: "ball.pass"; roomId: string; sequence: number }
  | { type: "ball.leave"; roomId: string };
export type SocialState = {
  status: string;
  url: string;
  enabled: boolean;
  hasKey: boolean;
  peers: Peer[];
  self: Peer | null;
  notice: string;
  pending: boolean;
  invite: {
    inviteId: string;
    from: string;
    to: string;
    expiresAt: number;
    outgoing: boolean;
  } | null;
  room: {
    roomId: string;
    players: string[];
    turn: string;
    sequence: number;
    expiresAt: number;
  } | null;
  effect: { icon: string; until: number } | null;
  chat: ChatMessage[];
};
export type ChatMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  sentAt: number;
};
