const { randomUUID } = require("node:crypto");
function endpoint(value) {
  const url = new URL(value);
  if (
    !["ws:", "wss:", "http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("請輸入有效的伺服器網址，不要包含帳密或查詢參數");
  url.protocol = ["https:", "wss:"].includes(url.protocol) ? "wss:" : "ws:";
  if (url.pathname === "/") url.pathname = "/pali/ws";
  return url.toString();
}
const errors = {
  INVALID_ACTION: "伺服器尚未支援此動作，請更新並重啟後端服務",
  PEER_OFFLINE: "對方已離線",
  PEER_BUSY: "你或對方已有打球邀請／球局",
  INVALID_INVITE: "邀請已失效",
  INVALID_ROOM: "球局已結束",
  NOT_YOUR_TURN: "還沒輪到你傳球",
  STALE_SEQUENCE: "球局已更新，請重試",
};
class SocialClient {
  constructor({
    config,
    character,
    notify,
    onInteraction = () => {},
    WebSocketImpl = globalThis.WebSocket,
  }) {
    this.config = config;
    this.character = character;
    this.notify = notify;
    this.onInteraction = onInteraction;
    this.seenInteractions = new Set();
    this.WebSocket = WebSocketImpl;
    this.pending = new Map();
    this.generation = 0;
    this.attempt = 0;
    this.unsupportedCharacter = null;
    this.state = {
      status: "offline",
      url: config.url || "",
      enabled: !!config.enabled,
      hasKey: !!config.accessKey,
      peers: [],
      self: null,
      invite: null,
      room: null,
      notice: "尚未連線",
      pending: false,
      effect: null,
      chat: [],
    };
  }
  clearSession() {
    for (const p of this.pending.values()) clearTimeout(p.timer);
    this.pending.clear();
    Object.assign(this.state, {
      peers: [],
      self: null,
      invite: null,
      room: null,
      pending: false,
      chat: [],
    });
  }
  stop() {
    this.generation++;
    clearTimeout(this.retry);
    clearTimeout(this.deadline);
    this.socket?.close();
    this.socket = null;
    this.clearSession();
    this.state.status = "offline";
  }
  configure(config) {
    const url = endpoint(config.url);
    this.stop();
    this.config = { ...config, url };
    Object.assign(this.state, {
      url,
      enabled: config.enabled,
      hasKey: !!config.accessKey,
      notice: config.enabled ? "正在連線…" : "已離線",
    });
    if (config.enabled) this.connect();
  }
  connect() {
    if (!this.config.enabled) return;
    const generation = ++this.generation;
    this.state.status = "connecting";
    let ws;
    try {
      ws = new this.WebSocket(endpoint(this.config.url));
    } catch {
      this.state.status = "error";
      this.state.notice = "伺服器網址無效";
      return;
    }
    this.socket = ws;
    this.deadline = setTimeout(() => ws.close(), 10000);
    this.fallbackHello = false;
    this.helloCharacter = this.character();
    ws.addEventListener("open", () => {
      if (generation === this.generation)
        ws.send(
          JSON.stringify({
            type: "hello",
            protocol: 1,
            character: this.helloCharacter,
            accessKey: this.config.accessKey || "",
          }),
        );
    });
    ws.addEventListener("message", (e) => {
      if (generation !== this.generation) return;
      try {
        this.receive(JSON.parse(e.data));
      } catch {
        this.state.notice = "收到無法辨識的伺服器訊息";
      }
    });
    ws.addEventListener("error", () => {});
    ws.addEventListener("close", (e) => {
      if (generation !== this.generation) return;
      clearTimeout(this.deadline);
      this.clearSession();
      if (e.code === 4003) {
        this.state.status = "error";
        this.state.notice = "加入密鑰不正確，請修改後重新連線";
        return;
      }
      this.state.status = "reconnecting";
      this.state.notice = "連線中斷，正在重新連線…";
      this.retry = setTimeout(
        () => this.connect(),
        Math.min(30000, 1000 * 2 ** Math.min(this.attempt++, 5)),
      );
    });
  }
  request(message, feedback = false) {
    if (this.state.status !== "online") {
      this.state.notice = "請先連線";
      return;
    }
    if (this.pending.size) {
      this.state.notice = "上一個操作仍在處理中";
      return;
    }
    const requestId = randomUUID();
    const timer = setTimeout(() => {
      this.pending.delete(requestId);
      this.state.pending = false;
      this.state.notice = "回覆逾時，結果未確認，請勿連續重送";
      if (feedback) this.notify(this.state.notice);
    }, 8000);
    this.pending.set(requestId, {
      message,
      timer,
      feedback,
      from: this.state.self && { ...this.state.self },
      to: this.state.peers.find((p) => p.id === message.to),
    });
    this.state.pending = true;
    try {
      this.socket.send(JSON.stringify({ ...message, requestId }));
    } catch {
      clearTimeout(timer);
      this.pending.delete(requestId);
      this.state.pending = false;
      this.state.notice = "傳送失敗";
      if (feedback) this.notify(this.state.notice);
    }
  }
  profile() {
    if (this.character() === this.unsupportedCharacter) return;
    if (this.state.status === "online" && !this.pending.size)
      this.request({ type: "profile.set", character: this.character() });
  }
  receive(m) {
    if (!m || typeof m.type !== "string") return;
    if (
      m.type === "error" &&
      this.state.status === "connecting" &&
      ["HELLO_REQUIRED", "INVALID_CHARACTER"].includes(m.code)
    ) {
      if (!this.fallbackHello && this.helloCharacter !== "penguin") {
        this.fallbackHello = true;
        this.unsupportedCharacter = this.helloCharacter;
        this.socket.send(
          JSON.stringify({
            type: "hello",
            protocol: 1,
            character: "penguin",
            accessKey: this.config.accessKey || "",
          }),
        );
      } else {
        this.state.notice = "伺服器拒絕加入，請確認後端版本與連線設定";
      }
      return;
    }
    if (m.type === "welcome") {
      clearTimeout(this.deadline);
      this.attempt = 0;
      Object.assign(this.state, {
        status: "online",
        self: m.self,
        peers: m.peers,
        notice: "已連線，找個夥伴打聲招呼吧",
      });
      if (this.fallbackHello)
        this.state.notice =
          "伺服器尚未支援目前角色，已暫用企鵝身分上線；本機外觀保留，更新後端即可完整同步";
      else this.unsupportedCharacter = null;
      if (m.self.character !== this.character()) this.profile();
    }
    if (m.type === "presence") this.state.peers = m.peers;
    if (m.type === "ack" || m.type === "error") {
      const p = this.pending.get(m.requestId);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(m.requestId);
        this.state.pending = false;
      }
      if (m.type === "error") {
        if (
          m.code === "INVALID_CHARACTER" &&
          p?.message.type === "profile.set"
        ) {
          this.unsupportedCharacter = p.message.character;
          this.state.notice =
            "伺服器尚未支援新角色，本機外觀已切換，在線身分暫時保持原角色，請更新後端";
        } else this.state.notice = errors[m.code] || `操作未完成：${m.code}`;
      } else if (p) {
        if (m.self) this.state.self = m.self;
        if (p.message.type === "interaction.send") {
          this.state.notice = "已轉送給對方";
          if (p.from && p.to)
            this.playInteraction({
              eventId: m.eventId,
              action: p.message.action,
              from: p.from,
              to: p.to,
            });
        }
        if (p.message.type === "chat.send" && p.from) {
          this.state.chat.push({
            id: m.messageId || m.requestId,
            from: p.from.id,
            to: p.message.to,
            text: p.message.text.trim(),
            sentAt: Date.now(),
          });
          this.state.chat = this.state.chat.slice(-200);
          this.state.notice = "訊息已送出";
        }
        if (p.message.type === "ball.invite") {
          this.state.invite = { ...m, outgoing: true };
          this.state.notice = "邀請已送出，等待對方接受";
          if (p.from && p.to)
            this.playInteraction({
              eventId: `invite-${m.inviteId}`,
              action: "ball-invite",
              from: p.from,
              to: p.to,
            });
        }
      }
      if (p?.feedback) this.notify(this.state.notice);
      if (
        this.state.self?.character !== this.character() &&
        p?.message.type !== "profile.set"
      )
        this.profile();
    }
    if (m.type === "interaction") {
      if (this.state.self) {
        this.playInteraction({ ...m, to: { ...this.state.self } });
        this.state.notice = "夥伴來找你互動了";
      }
    }
    if (
      m.type === "chat" &&
      m.messageId &&
      m.from?.id &&
      m.to &&
      typeof m.text === "string" &&
      m.text.length <= 1000
    ) {
      this.state.chat.push({
        id: m.messageId,
        from: m.from.id,
        to: m.to,
        text: m.text,
        sentAt: Number.isFinite(m.sentAt) ? m.sentAt : Date.now(),
      });
      this.state.chat = this.state.chat.slice(-200);
      this.state.notice = "收到夥伴訊息";
      this.notify(`${m.from.label || "夥伴"}對您說：${m.text}`);
    }
    if (m.type === "ball.invitation") {
      this.state.invite = { ...m, outgoing: false };
      this.pairScene(`invite-${m.inviteId}`, "ball-invite", m.from, m.to);
      this.effect("🏓", "有夥伴邀你打球，右鍵選單接受邀請吧");
    }
    if (m.type === "ball.invite-ended") {
      if (this.state.invite?.inviteId === m.inviteId) this.state.invite = null;
      this.state.notice =
        m.reason === "declined"
          ? "邀請已婉拒"
          : m.reason === "expired"
            ? "邀請已到期"
            : "對方已離線，邀請結束";
    }
    if (m.type === "ball.started" || m.type === "ball.passed") {
      this.state.invite = null;
      this.state.room = m;
      const sender = m.type === "ball.started" ? m.players[0] : m.from;
      this.pairScene(
        `${m.roomId}-${m.sequence}`,
        "ball",
        sender,
        m.players.find((id) => id !== sender),
      );
      this.effect(
        "🏓",
        m.turn === this.state.self?.id
          ? "球到你這邊了！右鍵選單傳回去吧"
          : "球已傳出，等夥伴回球",
      );
    }
    if (m.type === "ball.ended") {
      const room = this.state.room;
      if (room)
        this.pairScene(
          `${m.roomId}-ended`,
          "ball-end",
          room.players[0],
          room.players[1],
        );
      this.state.room = null;
      this.state.notice =
        m.reason === "offline"
          ? "對方離線，球局結束"
          : m.reason === "timeout"
            ? "太久沒有傳球，球局結束"
            : "球局已結束";
    }
  }
  pairScene(eventId, action, fromId, toId) {
    const peer = (id) =>
      id === this.state.self?.id
        ? this.state.self
        : this.state.peers.find((p) => p.id === id);
    const from = peer(fromId),
      to = peer(toId);
    if (from && to)
      this.playInteraction({
        eventId,
        action,
        from: { ...from },
        to: { ...to },
      });
  }
  playInteraction(event) {
    if (
      ![
        "kiss",
        "tea",
        "hug",
        "cheer",
        "ball-invite",
        "ball",
        "ball-end",
      ].includes(event.action) ||
      !event.eventId ||
      this.seenInteractions.has(event.eventId)
    )
      return;
    this.seenInteractions.add(event.eventId);
    if (this.seenInteractions.size > 128)
      this.seenInteractions.delete(this.seenInteractions.values().next().value);
    this.onInteraction(event);
  }
  effect(icon, text) {
    this.state.effect = { icon, until: Date.now() + 5000 };
    this.state.notice = text;
    this.notify(text);
  }
}
module.exports = { SocialClient, endpoint };
