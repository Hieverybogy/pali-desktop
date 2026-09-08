import type { CompanionBridge } from "../shared/protocol";
declare global {
  interface Window {
    pali?: CompanionBridge;
  }
}
