import { useState } from "react";
import type { Peer } from "../../../shared/protocol";

export function SpeechPage({
  speech,
  chatPeer,
}: {
  speech: string;
  chatPeer: Peer | null;
}) {
  const [text, setText] = useState("");
  if (chatPeer)
    return (
      <form
        className="speech-chat"
        onSubmit={(event) => {
          event.preventDefault();
          const value = text.trim();
          if (!value) return;
          window.pali?.command("social-action", {
            type: "chat.send",
            to: chatPeer.id,
            text: value,
          });
          setText("");
        }}
      >
        <div className="speech-chat-title">
          對 {chatPeer.label || "夥伴"} 說
        </div>
        <div className="speech-chat-row">
          <input
            autoFocus
            maxLength={1000}
            value={text}
            placeholder="輸入訊息…"
            onChange={(event) => setText(event.target.value)}
          />
          <button disabled={!text.trim()}>發送</button>
        </div>
        <button
          className="speech-chat-close"
          type="button"
          aria-label="關閉聊天"
          onClick={() => window.pali?.command("chat-close")}
        >
          ×
        </button>
      </form>
    );
  return (
    <div className="speech-window" role="status">
      {speech}
    </div>
  );
}
