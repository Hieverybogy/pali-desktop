import pets from "../../../shared/pets.json";
import type { CompanionModel } from "../../hooks/useCompanion";
import { command } from "../../lib/bridge";
import { PetAvatar } from "./PetAvatar";
export function CharacterHero({
  frame,
  happy,
  react,
  setFrame,
  selected,
  onChoose,
}: CompanionModel & { selected: (typeof pets)[number]; onChoose: () => void }) {
  return (
    <section className="hero" style={{ background: selected.background }}>
      <div className="hero-copy">
        <span className="pill">{selected.species} · 你的桌面夥伴</span>
        <h2>
          {selected.name} <span>{selected.english}</span>
        </h2>
        <p>
          {selected.description}
          <br />
          {selected.detail}
        </p>
        <div className="traits">
          {selected.traits.map((trait) => (
            <span key={trait}>{trait}</span>
          ))}
        </div>
        <button
          className="primary"
          onClick={() => {
            react();
            command("pet");
          }}
        >
          ♡ &nbsp; 摸摸{selected.name}
        </button>
        <button className="change-pet" onClick={() => onChoose()}>
          更換夥伴 <span>↗</span>
        </button>
        <div className="reaction-note">
          {happy
            ? `${selected.name}收到你的喜歡了！`
            : "一點小互動，換一整天好心情。"}
        </div>
      </div>
      <div
        className="habitat"
        onPointerMove={(e) => {
          const b = e.currentTarget.getBoundingClientRect();
          setFrame((f) => ({
            ...f,
            mouse: {
              x: ((e.clientX - b.left) / b.width) * 280,
              y: ((e.clientY - b.top) / b.height) * 280,
            },
          }));
        }}
      >
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <span className="spark spark-one">✧</span>
        <span className="spark spark-two">✦</span>
        <div className="ice" />
        <PetAvatar frame={frame} happy={happy} />
        <span className="mood">
          {happy
            ? "♥ 好喜歡你"
            : frame.sleeping
              ? "☾ 做個好夢"
              : frame.state === "walking"
                ? "↗ 出門散散步"
                : "• 正在好奇地看著你"}
        </span>
      </div>
    </section>
  );
}
