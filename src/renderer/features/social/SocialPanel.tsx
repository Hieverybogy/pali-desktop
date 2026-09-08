import { useEffect, useState } from "react";
import type { SocialState, SocialAction } from "../../../shared/protocol";
import pets from "../../../shared/pets.json";
const names: Record<string, string> = {
  offline: "未連線",
  connecting: "連線中",
  online: "已連線",
  reconnecting: "重新連線中",
  error: "連線失敗",
};
export function SocialPanel({ social: s }: { social?: SocialState }) {
  const [url, setUrl] = useState("");
  const [key, setKey] = useState("");
  const [dirty, setDirty] = useState(false);
  const [changeKey, setChangeKey] = useState(false);
  useEffect(() => {
    if (s && !dirty) setUrl(s.url);
  }, [s?.url, dirty]);
  const act = (a: SocialAction) => window.pali?.command("social-action", a);
  const label = (id: string) => {
    const p = s?.peers.find((p) => p.id === id);
    return `${pets.find((v) => v.id === p?.character)?.name || "夥伴"} · ${id.slice(0, 8)}`;
  };
  const online = s?.status === "online";
  const busy = !!s?.pending;
  return (
    <section className="social-panel" aria-labelledby="social-title">
      <div className="section-title">
        <h3 id="social-title">一起陪伴</h3>
        <span>
          {names[s?.status || "offline"]} · {s?.peers.length || 0} 位夥伴在線
        </span>
      </div>
      <form
        className="social-connect"
        onSubmit={(e) => {
          e.preventDefault();
          window.pali?.command("social-config", {
            url,
            enabled: true,
            ...(changeKey ? { accessKey: key } : {}),
          });
          setKey("");
          setChangeKey(false);
          setDirty(false);
        }}
      >
        <label>
          互動伺服器
          <input
            required
            type="text"
            placeholder="https://你的伺服器域名"
            value={url}
            onChange={(e) => {
              setDirty(true);
              setUrl(e.target.value);
            }}
          />
        </label>
        <label>
          加入密鑰（選填）
          <input
            type="password"
            autoComplete="off"
            value={key}
            placeholder={
              s?.hasKey ? "已保存，留空保留原密鑰" : "管理者提供的密鑰"
            }
            onChange={(e) => {
              setChangeKey(true);
              setKey(e.target.value);
            }}
          />
        </label>
        {s?.hasKey && (
          <label className="social-clear">
            <input
              type="checkbox"
              checked={changeKey && !key}
              onChange={(e) => {
                setChangeKey(e.target.checked);
                setKey("");
              }}
            />
            清除已保存密鑰
          </label>
        )}
        <div className="social-actions">
          <button disabled={!window.pali || !url.trim()} type="submit">
            {online ? "儲存並重新連線" : "儲存並連線"}
          </button>
          <button
            type="button"
            disabled={!s?.enabled}
            onClick={() =>
              window.pali?.command("social-config", {
                url: s!.url,
                enabled: false,
              })
            }
          >
            離線
          </button>
        </div>
        <p>大家填入相同服務網址即可見到彼此，無需註冊。關閉控制台仍會在線。</p>
      </form>
      <p className="social-notice" role="status">
        {window.pali
          ? s?.notice || "填入服務網址，開始與夥伴互動"
          : "瀏覽器僅提供介面預覽，請在桌面應用中連線。"}
      </p>
      {s?.self && (
        <p className="social-self">
          我的臨時編號：{s.self.id.slice(0, 8)} · 重新連線會更換
        </p>
      )}
      {online && !s?.peers.length && (
        <div className="social-empty">
          還沒有其他夥伴在線，讓朋友打開 Pali 並連上相同服務吧。
        </div>
      )}
      <div className="social-peers">
        {s?.peers.map((p) => (
          <article className="social-peer" key={p.id}>
            <strong>{label(p.id)}</strong>
            <span>在線</span>
            <div className="social-actions">
              {(
                [
                  ["tea", "🍵 送茶"],
                  ["kiss", "😘 飛吻"],
                  ["hug", "🤗 抱抱"],
                  ["cheer", "🎉 加油"],
                ] as const
              ).map(([action, text]) => (
                <button
                  key={action}
                  disabled={busy || !online}
                  onClick={() =>
                    act({ type: "interaction.send", to: p.id, action })
                  }
                >
                  {text}
                </button>
              ))}
              <button
                disabled={busy || !online}
                onClick={() =>
                  act({ type: "interaction.send", to: p.id, action: "ball" })
                }
              >
                🏓 一起打球
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
