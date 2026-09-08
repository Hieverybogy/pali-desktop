import { useState } from "react";
import type { Peer } from "../../../shared/protocol";

export function SpeechPage({
  speech,
  chatPeer,
  aiOpen,
}: {
  speech: string;
  chatPeer: Peer | null;
  aiOpen: boolean;
}) {
  const [text, setText] = useState("");
  if (aiOpen)
    return (
      <form
        className="speech-chat"
        onMouseEnter={() => window.pali?.command("speech-hover", true)}
        onMouseLeave={() => window.pali?.command("speech-hover", false)}
        onSubmit={(event) => {
          event.preventDefault();
          const value = text.trim();
          if (!value) return;
          window.pali?.command("ai-ask", value);
          setText("");
        }}
      >
        <div className="speech-chat-title">問問 Pali</div>
        <div className="speech-chat-row">
          <input
            autoFocus
            maxLength={2000}
            value={text}
            placeholder="想問我什麼？"
            onChange={(event) => setText(event.target.value)}
          />
          <button disabled={!text.trim()}>發送</button>
        </div>
        <button
          className="speech-chat-close"
          type="button"
          aria-label="關閉問答"
          onClick={() => window.pali?.command("ai-close")}
        >
          ×
        </button>
      </form>
    );
  if (chatPeer)
    return (
      <form
        className="speech-chat"
        onMouseEnter={() => window.pali?.command("speech-hover", true)}
        onMouseLeave={() => window.pali?.command("speech-hover", false)}
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
    <div
      className="speech-window"
      role="status"
      onMouseEnter={() => window.pali?.command("speech-hover", true)}
      onMouseLeave={() => window.pali?.command("speech-hover", false)}
    >
      {speech}
    </div>
  );
}
