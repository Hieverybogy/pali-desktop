import { useRef } from "react";
import { command } from "../../lib/bridge";
import type { CompanionModel } from "../../hooks/useCompanion";
import { PetAvatar } from "../characters/PetAvatar";
export function PetPage({ frame, happy, update }: CompanionModel) {
  const start = useRef({ x: 0, y: 0 });
  return (
    <main
      className="pet-window"
      onContextMenu={(e) => {
        e.preventDefault();
        command("pet-menu");
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        start.current = { x: e.screenX, y: e.screenY };
        e.currentTarget.setPointerCapture(e.pointerId);
        command("drag-start");
      }}
      onPointerUp={(e) => {
        if (e.button !== 0) return;
        command("drag-end");
        if (
          Math.hypot(e.screenX - start.current.x, e.screenY - start.current.y) <
          5
        ) {
          command("pet");
          if (frame.sleeping) update("sleeping", false);
        }
      }}
      onPointerCancel={() => command("drag-end")}
    >
      {["falling", "dizzy", "recovering"].includes(frame.state) && (
        <div className="dizzy-stars" aria-label="暈眩中">
          ✦ · ★ · ✦
        </div>
      )}
      {frame.sleeping && <div className="zzz">z Z</div>}
      <PetAvatar frame={frame} happy={happy} />
      {frame.social?.effect && frame.social.effect.until > Date.now() && (
        <div className="social-effect" aria-hidden="true">
          {frame.social.effect.icon}
        </div>
      )}
    </main>
  );
}
