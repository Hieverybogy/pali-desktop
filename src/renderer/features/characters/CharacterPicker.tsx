import { useEffect, useRef } from "react";
import pets from "../../../shared/pets.json";
import { initialFrame } from "../../lib/defaults";
import { PetAvatar } from "./PetAvatar";
export function CharacterPicker({
  open,
  selected,
  onClose,
  onSelect,
}: {
  open: boolean;
  selected: (typeof pets)[number];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const picker = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) picker.current?.showModal();
    else picker.current?.close();
  }, [open]);
  return (
    <dialog
      ref={picker}
      className="pet-picker"
      onCancel={() => onClose()}
      onClose={() => onClose()}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="picker-header">
        <div>
          <div className="eyebrow">MEET YOUR LITTLE FRIENDS</div>
          <h2>今天，想和誰一起？</h2>
          <p>10 位小夥伴，點選即可帶到桌面。</p>
        </div>
        <button
          className="picker-close"
          aria-label="關閉角色選擇"
          onClick={() => onClose()}
        >
          ×
        </button>
      </div>
      <div className="pet-grid">
        {pets.map((p) => (
          <button
            key={p.id}
            className={`pet-card ${p.id === selected.id ? "chosen" : ""}`}
            aria-pressed={p.id === selected.id}
            aria-label={`選擇${p.species}${p.name}`}
            onClick={() => {
              onSelect(p.id);
              onClose();
            }}
          >
            <div className="pet-thumbnail" style={{ background: p.background }}>
              <PetAvatar
                frame={{ ...initialFrame, character: p.id }}
                thumbnail
              />
            </div>
            <div className="pet-card-label">
              <strong>{p.name}</strong>
              <span>{p.species}</span>
            </div>
            <span className="selection-marker">
              {p.id === selected.id ? "✓ 正在陪伴" : p.english}
            </span>
          </button>
        ))}
      </div>
      <p className="picker-hint">
        每位夥伴都會看向滑鼠、散步和回應你的摸摸。選擇會自動保存。
      </p>
    </dialog>
  );
}
