import { InteractionPage } from "../features/social/InteractionPage";
import { useCompanion } from "../hooks/useCompanion";
import { PetPage } from "../features/pet/PetPage";
import { SpeechPage } from "../features/speech/SpeechPage";
import { SettingsPage } from "../features/settings/SettingsPage";
export function App() {
  const model = useCompanion();
  const view = new URLSearchParams(location.search).get("view");
  if (view === "interaction") return <InteractionPage frame={model.frame} />;
  if (view === "pet") return <PetPage {...model} />;
  if (view === "bubble") return <SpeechPage speech={model.speech} />;
  return <SettingsPage {...model} />;
}
