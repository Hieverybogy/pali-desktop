import { useRef } from "react";
import { command } from "../../lib/bridge";
import type { CompanionModel } from "../../hooks/useCompanion";
import { PetAvatar } from "../characters/PetAvatar";
export function PetPage({ frame, happy, update }: CompanionModel) {
  const start = useRef({ x: 0, y: 0, moved: false });
  return (
    <main
      className={`pet-window ${frame.partReaction && frame.partReaction.until > Date.now() ? `touch-${frame.partReaction.part}` : ""}`}
      onContextMenu={(e) => {
        e.preventDefault();
        command("pet-menu");
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        start.current = { x: e.screenX, y: e.screenY, moved: false };
        e.currentTarget.setPointerCapture(e.pointerId);
        command("drag-start");
      }}
      onPointerMove={(e) => {
        if (
          e.buttons === 1 &&
          Math.hypot(e.screenX - start.current.x, e.screenY - start.current.y) >
            5
        )
          start.current.moved = true;
      }}
      onPointerUp={(e) => {
        if (e.button !== 0) return;
        command("drag-end");
        if (
          !start.current.moved &&
          Math.hypot(e.screenX - start.current.x, e.screenY - start.current.y) <
            5
        ) {
          const bounds = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - bounds.left) / bounds.width) * 280;
          const y = ((e.clientY - bounds.top) / bounds.height) * 280;
          const part =
            y >= 224
              ? "foot"
              : y < 100
                ? "ear"
                : y >= 140 && y <= 212 && (x < 94 || x > 186)
                  ? "hand"
                  : null;
          if (part) command("pet-part", part);
          else command("pet");
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
