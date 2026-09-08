import { SocialPanel } from "../social/SocialPanel";
import { useState } from "react";
import pets from "../../../shared/pets.json";
import type { CompanionModel } from "../../hooks/useCompanion";
import { Sidebar } from "../../components/Sidebar";
import { CharacterPicker } from "../characters/CharacterPicker";
import { CharacterHero } from "../characters/CharacterHero";
import { CompanionSettings } from "./CompanionSettings";
export function SettingsPage(model: CompanionModel) {
  const { frame, update, setHappy } = model;
  const selected = pets.find((p) => p.id === frame.character) ?? pets[0];
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="dashboard">
      <Sidebar />
      <CharacterPicker
        open={pickerOpen}
        selected={selected}
        onClose={() => setPickerOpen(false)}
        onSelect={(id) => {
          update("character", id);
          setHappy(false);
        }}
      />
      <main className="content">
        <header>
          <div>
            <div className="eyebrow">A LITTLE FRIEND, ALWAYS AROUND</div>
            <h1>今天，也有 Pali 陪你。</h1>
            <p>忙你的吧，{selected.name}會在桌面上等你。</p>
          </div>
          <span className="online">
            <i />{" "}
            {window.pali
              ? frame.visible
                ? "已在桌面陪伴"
                : "夥伴暫時隱藏"
              : "瀏覽器預覽"}
          </span>
        </header>
        <CharacterHero
          {...model}
          selected={selected}
          onChoose={() => setPickerOpen(true)}
        />
        <CompanionSettings frame={frame} update={update} name={selected.name} />{" "}
        <SocialPanel social={frame.social} />
        <footer>
          <span>✦ 拖住身體移動 · 點一下互動 · 右鍵選擇夥伴互動</span>
          <button onClick={() => update("visible", !frame.visible)}>
            {frame.visible ? "暫時隱藏" : "顯示夥伴"}
          </button>
        </footer>
      </main>
    </div>
  );
}
