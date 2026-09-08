import type { CSSProperties } from "react";
import type { Frame } from "../../../shared/protocol";
import { PetAvatar } from "../characters/PetAvatar";
export function InteractionPage({ frame }: { frame: Frame }) {
  const s = frame.scene;
  if (!s) return null;
  const elapsed = Math.max(0, Date.now() - s.startedAt);
  const scenes = {
    kiss: { title: "親親", text: "啾～送你一個親親 ♥", icon: "♡ ♥ ♡" },
    tea: { title: "送茶", text: "給你一杯熱茶，休息一下吧～", icon: "🍵" },
    hug: { title: "抱抱", text: "抱一下，有我陪著你！", icon: "♡ ♡" },
    cheer: { title: "加油", text: "加油加油！你一定可以！", icon: "🎉 ✦ 🎊" },
    "ball-invite": {
      title: "邀請打球",
      text: "一起打球嗎？右鍵選單回覆邀請",
      icon: "🏓",
    },
    ball: { title: "打球", text: "來回幾球，放鬆一下～", icon: "🏓" },
    "ball-end": {
      title: "結束球局",
      text: "今天玩得很開心，下次再來！",
      icon: "👋",
    },
  };
  const scene = scenes[s.action];
  const kissing = elapsed >= 2000 && elapsed < 4300;
  const style = {
    "--size": `${s.size}px`,
    "--target": `${s.targetX}px`,
    "--approach": `${s.targetX - s.size * 0.65}px`,
    "--top": `${s.top}px`,
  } as CSSProperties;
  return (
    <main
      className={`interaction-stage action-${s.action} ${kissing ? "performing" : ""}`}
      key={s.eventId}
      style={style}
      aria-label={`兩位夥伴${scene.title}`}
    >
      <div className="kiss-visitor">
        <div className="kiss-lean">
          <PetAvatar
            frame={{
              ...frame,
              character: s.from.character,
              state: kissing ? "idle" : "walking",
              mouse: { x: 280, y: 120 },
            }}
            happy={kissing}
          />
        </div>
      </div>
      <div className="kiss-host">
        <PetAvatar
          frame={{
            ...frame,
            character: s.to.character,
            state: "idle",
            mouse: { x: 0, y: 120 },
          }}
          happy={kissing}
        />
      </div>
      <div className="kiss-hearts">{scene.icon}</div>
      {s.action === "ball" && (
        <>
          <div className="racket racket-left">🏓</div>
          <div className="racket racket-right">🏓</div>
          <div className="rally-ball" />
        </>
      )}

      <div className="kiss-caption">
        {kissing
          ? scene.text
          : elapsed < 2000
            ? "你的夥伴來找你了"
            : "下次再來找你玩～"}
      </div>
    </main>
  );
}
