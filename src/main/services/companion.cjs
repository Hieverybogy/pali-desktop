const SIZES = [120, 160, 200];
const MOODS = ["平靜", "開心", "專注", "疲累", "想摸魚"];
function migrateSize(size) {
  return SIZES.includes(size)
    ? size
    : ({ 220: 120, 280: 160, 340: 200 }[size] ?? 160);
}
function duration(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return s < 60
    ? `${s} 秒`
    : s < 3600
      ? `${Math.floor(s / 60)} 分鐘`
      : `${Math.floor(s / 3600)} 小時 ${Math.floor((s % 3600) / 60)} 分鐘`;
}
class Activity {
  constructor(now = Date.now()) {
    this.started = now;
    this.last = now;
    this.work = 0;
    this.total = 0;
    this.idle = 0;
    this.lastBreak = 0;
    this.returnedAt = 0;
    this.workMark = 0;
    this.idleMark = 0;
    this.paused = false;
  }
  pause(now) {
    this.paused = true;
    this.last = now;
    this.work = 0;
    this.idle = 0;
    this.workMark = 0;
    this.idleMark = 0;
  }
  resume(now) {
    this.paused = false;
    this.started = now;
    this.last = now;
  }
  sample(now, systemIdle) {
    const dt = Math.max(0, Math.min(2, (now - this.last) / 1000));
    this.last = now;
    if (this.paused) return null;
    const idle = Math.max(0, Math.min(systemIdle, (now - this.started) / 1000));
    if (idle >= 60) {
      this.idle = idle;
      this.work = 0;
      this.workMark = 0;
    } else {
      if (this.idle >= 60) {
        this.lastBreak = this.idle;
        this.returnedAt = now;
      }
      this.idle = 0;
      this.idleMark = 0;
      this.work += dt;
      this.total += dt;
    }
    if (this.idle >= 300 && Math.floor(this.idle / 300) > this.idleMark) {
      this.idleMark = Math.floor(this.idle / 300);
      return `摸魚雷達：已 ${duration(this.idle)} 沒有操作啦。看書或休息也很好喔。`;
    }
    if (this.work >= 1800 && Math.floor(this.work / 1800) > this.workMark) {
      this.workMark = Math.floor(this.work / 1800);
      return `估計已連續工作 ${duration(this.work)}，伸伸懶腰、喝口水吧！`;
    }
    return null;
  }
  snapshot(now) {
    return {
      workSeconds: Math.floor(this.work),
      totalSeconds: Math.floor(this.total),
      idleSeconds: Math.floor(this.idle),
      lastBreakSeconds:
        now - this.returnedAt < 60000 ? Math.floor(this.lastBreak) : 0,
      paused: this.paused,
    };
  }
}
function dialogue(index, { name, mood, activity, now = new Date() }) {
  const time = now.toLocaleTimeString("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const lines = [
    `嗨，我是${name}。今天也陪你一起！`,
    `現在是 ${time}，這一刻有我陪著你。`,
    `你現在設定的心情是「${mood}」。不管怎樣，我都在。`,
    activity.idleSeconds >= 60
      ? `你已 ${duration(activity.idleSeconds)} 沒有操作，正在摸魚嗎？也可能在認真思考吧。`
      : activity.lastBreakSeconds
        ? `歡迎回來！剛剛有 ${duration(activity.lastBreakSeconds)} 沒有操作，休息得如何？`
        : `估計已連續工作 ${duration(activity.workSeconds)}，辛苦啦！`,
    "伸個懶腰吧，肩膀也想放個小假。",
    `這次開啟後，估計累計工作 ${duration(activity.totalSeconds)}。慢慢來也很好。`,
    "今天喝水了嗎？我幫你看著桌面。",
    `${name}的心情：被你摸摸，開心 +1 ♥`,
    "靈感還沒來？讓眼睛看看遠方吧。",
    "工作可以一件件做，可愛要每一秒都有。",
    `再報一次時：${time}。記得把時間留一點給自己。`,
    "摸魚也要快樂，回來時我還在這裡。",
  ];
  return lines[index % lines.length];
}
module.exports = { SIZES, MOODS, migrateSize, duration, Activity, dialogue };
