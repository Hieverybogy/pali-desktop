import type { Command } from "../../shared/protocol";
export const command: Command = (action, ...args) => {
  window.pali?.command(action, ...args);
};
