import type { CompanionModel } from "../../hooks/useCompanion";
export function CompanionSettings({
  frame,
  update,
  name,
}: {
  frame: CompanionModel["frame"];
  update: CompanionModel["update"];
  name: string;
}) {
  return (
    <>
      <div className="section-title">
        <h3>相處方式</h3>
        <span>照著你的節奏就好</span>
      </div>
      <section className="activity-summary" aria-live="off">
        <span>
          {frame.activity.paused
            ? "已暫停計時"
            : frame.activity.idleSeconds >= 60
              ? `摸魚中 · ${Math.floor(frame.activity.idleSeconds / 60)} 分鐘未操作`
              : `連續工作約 ${Math.floor(frame.activity.workSeconds / 60)} 分鐘`}
        </span>
        <span>
          本次累計約 {Math.floor(frame.activity.totalSeconds / 60)} 分鐘
        </span>
      </section>
      <section className="settings">
        <div className="setting-row">
          <div className="setting-icon mint">↗</div>
          <div className="setting-text">
            <strong>自由散步</strong>
            <p>讓{name}偶爾在桌面走走</p>
          </div>
          <button
            role="switch"
            aria-checked={frame.roaming}
            aria-label="自由散步"
            className={`toggle ${frame.roaming ? "on" : ""}`}
            onClick={() => update("roaming", !frame.roaming)}
          >
            <span />
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-icon lavender">☾</div>
          <div className="setting-text">
            <strong>休息一下</strong>
            <p>閉上眼睛，安靜地陪著你</p>
          </div>
          <button
            role="switch"
            aria-checked={frame.sleeping}
            aria-label="休息一下"
            className={`toggle ${frame.sleeping ? "on" : ""}`}
            onClick={() => update("sleeping", !frame.sleeping)}
          >
            <span />
          </button>
        </div>
        <div className="setting-row">
          <div className="setting-icon peach">↔</div>
          <div className="setting-text">
            <strong>夥伴大小</strong>
            <p>找到剛剛好的存在感</p>
          </div>
          <div className="segmented">
            {(
              [
                [120, "迷你"],
                [160, "小巧"],
                [200, "標準"],
              ] as const
            ).map(([v, label]) => (
              <button
                key={v}
                className={frame.size === v ? "active" : ""}
                onClick={() => update("size", v)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <div className="setting-icon peach">♡</div>
          <div className="setting-text">
            <strong>我現在的心情</strong>
            <p>告訴夥伴你今天的感受</p>
          </div>
          <select
            aria-label="我現在的心情"
            value={frame.mood}
            onChange={(e) => update("mood", e.target.value)}
          >
            {["平靜", "開心", "專注", "疲累", "想摸魚"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="setting-row">
          <div className="setting-icon mint">◷</div>
          <div className="setting-text">
            <strong>工作與摸魚提醒</strong>
            <p>工作每 30 分鐘、閒置每 5 分鐘提醒</p>
          </div>
          <button
            role="switch"
            aria-checked={frame.reminders}
            aria-label="工作與摸魚提醒"
            className={`toggle ${frame.reminders ? "on" : ""}`}
            onClick={() => update("reminders", !frame.reminders)}
          >
            <span />
          </button>
        </div>
      </section>
      <p className="activity-explanation">
        60
        秒未操作視為閒置。時長依系統鍵鼠活動估算；閱讀也可能被算作閒置，不記錄輸入內容。鎖屏或休眠暫停計時。
      </p>
    </>
  );
}
