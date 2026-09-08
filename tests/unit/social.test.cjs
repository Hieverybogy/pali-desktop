const test = require("node:test");
const assert = require("node:assert/strict");
const {
  SocialClient,
  endpoint,
} = require("../../src/main/services/social/client.cjs");
class Socket extends EventTarget {
  static instances = [];
  constructor(url) {
    super();
    this.url = url;
    this.sent = [];
    Socket.instances.push(this);
  }
  send(raw) {
    this.sent.push(JSON.parse(raw));
  }
  emit(type, data = {}) {
    this.dispatchEvent(Object.assign(new Event(type), data));
  }
  close() {
    this.emit("close", { code: 1000 });
  }
  message(m) {
    this.emit("message", { data: JSON.stringify(m) });
  }
}
function setup(t) {
  const notices = [];
  const scenes = [];
  let character = "penguin";
  const c = new SocialClient({
    config: { url: "https://example.com", enabled: true, accessKey: "secret" },
    character: () => character,
    notify: (s) => notices.push(s),
    onInteraction: (event) => scenes.push(event),
    WebSocketImpl: Socket,
  });
  t.after(() => c.stop());
  c.connect();
  const ws = Socket.instances.at(-1);
  ws.emit("open");
  ws.message({
    type: "welcome",
    self: { id: "me", character: "penguin" },
    peers: [{ id: "you", character: "cat" }],
  });
  return { c, ws, notices, scenes, setCharacter: (v) => (character = v) };
}
test("normalizes endpoint and rejects credentials/query and invalid schemes", () => {
  assert.equal(endpoint("https://example.com"), "wss://example.com/pali/ws");
  assert.equal(
    endpoint("http://localhost:8060"),
    "ws://localhost:8060/pali/ws",
  );
  for (const url of ["file:///tmp/a", "ws://u:p@host", "ws://host?key=secret"])
    assert.throws(() => endpoint(url));
});
test("single handshake, directed action acknowledgment and remote gift", (t) => {
  const { c, ws, scenes } = setup(t);
  assert.equal(ws.sent[0].accessKey, "secret");
  assert.equal(JSON.stringify(c.state).includes("secret"), false);
  c.request({ type: "interaction.send", to: "you", action: "tea" });
  const request = ws.sent.at(-1);
  assert.equal(c.state.pending, true);
  ws.message({
    type: "ack",
    requestId: request.requestId,
    status: "forwarded",
  });
  assert.equal(c.state.pending, false);
  ws.message({
    type: "interaction",
    eventId: "hug-1",
    action: "hug",
    from: { id: "you", character: "cat" },
  });
  assert.equal(scenes.at(-1).action, "hug");
});
test("ball invite, turn update and disconnect cleanup", (t) => {
  const { c, ws } = setup(t);
  ws.message({
    type: "ball.invitation",
    inviteId: "i",
    from: "you",
    to: "me",
    expiresAt: Date.now() + 60000,
  });
  assert.equal(c.state.invite.outgoing, false);
  ws.message({
    type: "ball.started",
    roomId: "r",
    turn: "me",
    sequence: 0,
    players: ["me", "you"],
  });
  assert.equal(c.state.invite, null);
  assert.equal(c.state.room.turn, "me");
  ws.message({
    type: "ball.passed",
    roomId: "r",
    turn: "you",
    sequence: 1,
    players: ["me", "you"],
  });
  assert.equal(c.state.room.sequence, 1);
  ws.emit("close", { code: 1006 });
  assert.equal(c.state.status, "reconnecting");
  assert.equal(c.state.room, null);
  assert.deepEqual(c.state.peers, []);
});
test("bad key stops reconnect; old socket messages cannot restore online state", (t) => {
  const { c, ws } = setup(t);
  ws.emit("close", { code: 4003 });
  assert.equal(c.state.status, "error");
  assert.equal(c.retry, undefined);
  c.configure({
    url: "https://new.example.com",
    enabled: true,
    accessKey: "new",
  });
  ws.message({ type: "welcome", self: { id: "stale" }, peers: [] });
  assert.equal(c.state.self, null);
});
test("character changes during pending action sync after acknowledgment", (t) => {
  const { c, ws, setCharacter } = setup(t);
  c.request({ type: "interaction.send", to: "you", action: "tea" });
  const id = ws.sent.at(-1).requestId;
  setCharacter("fox");
  c.profile();
  ws.message({ type: "ack", requestId: id });
  assert.equal(ws.sent.at(-1).type, "profile.set");
  assert.equal(ws.sent.at(-1).character, "fox");
});

test("kiss plays on sender only after ack and receiver with consistent actor roles; duplicates ignored", (t) => {
  const a = setup(t),
    b = setup(t);
  a.c.request({ type: "interaction.send", to: "you", action: "kiss" });
  assert.equal(a.scenes.length, 0);
  const id = a.ws.sent.at(-1).requestId;
  const ack = {
    type: "ack",
    requestId: id,
    eventId: "kiss-1",
    status: "forwarded",
  };
  a.ws.message(ack);
  a.ws.message(ack);
  assert.equal(a.scenes.length, 1);
  assert.equal(a.scenes[0].from.character, "penguin");
  assert.equal(a.scenes[0].to.character, "cat");
  b.c.state.self = { id: "you", character: "cat" };
  const event = {
    type: "interaction",
    eventId: "kiss-1",
    action: "kiss",
    from: { id: "me", character: "penguin" },
    to: "you",
  };
  b.ws.message(event);
  b.ws.message(event);
  assert.equal(b.scenes.length, 1);
  assert.deepEqual(b.scenes[0].from, a.scenes[0].from);
  assert.deepEqual(b.scenes[0].to, a.scenes[0].to);
});
test("failed kiss does not play a local scene", (t) => {
  const a = setup(t);
  a.c.request({ type: "interaction.send", to: "you", action: "kiss" });
  a.ws.message({
    type: "error",
    requestId: a.ws.sent.at(-1).requestId,
    code: "PEER_OFFLINE",
  });
  assert.equal(a.scenes.length, 0);
});
test("chat messages stay in memory and clear with the session", (t) => {
  const c = setup(t);
  c.c.request({ type: "chat.send", to: "you", text: "你好" });
  const request = c.ws.sent.at(-1);
  assert.equal(request.type, "chat.send");
  assert.equal(request.text, "你好");
  c.ws.message({
    type: "ack",
    requestId: request.requestId,
    messageId: "message-1",
  });
  assert.deepEqual(c.c.state.chat[0], {
    id: "message-1",
    from: "me",
    to: "you",
    text: "你好",
    sentAt: c.c.state.chat[0].sentAt,
  });
  c.ws.message({
    type: "chat",
    messageId: "message-2",
    from: { id: "you", label: "夥伴" },
    to: "me",
    text: "你好呀",
  });
  assert.equal(c.c.state.chat.length, 2);
  c.ws.emit("close", { code: 1006 });
  assert.deepEqual(c.c.state.chat, []);
});

test("all gifts play on both sides with sender and receiver roles", (t) => {
  for (const action of ["tea", "kiss", "hug", "cheer", "ball"]) {
    const a = setup(t),
      b = setup(t);
    a.c.request({ type: "interaction.send", to: "you", action });
    a.ws.message({
      type: "ack",
      requestId: a.ws.sent.at(-1).requestId,
      eventId: action,
    });
    b.c.state.self = { id: "you", character: "cat" };
    b.ws.message({
      type: "interaction",
      eventId: action,
      action,
      from: { id: "me", character: "penguin" },
    });
    assert.equal(a.scenes.length, 1);
    assert.equal(b.scenes.length, 1);
    assert.equal(a.scenes[0].action, action);
    assert.equal(b.scenes[0].action, action);
  }
});
test("ball invitation, accepted game, passing and ending create paired scenes without duplicate playback", (t) => {
  const a = setup(t);
  a.c.request({ type: "ball.invite", to: "you" });
  a.ws.message({
    type: "ack",
    requestId: a.ws.sent.at(-1).requestId,
    inviteId: "i",
    from: "me",
    to: "you",
  });
  assert.equal(a.scenes.at(-1).action, "ball-invite");
  const room = { roomId: "r", players: ["me", "you"], turn: "me", sequence: 0 };
  a.ws.message({ type: "ball.started", ...room });
  a.ws.message({ type: "ball.started", ...room });
  assert.equal(a.scenes.filter((s) => s.action === "ball").length, 1);
  a.ws.message({
    type: "ball.passed",
    ...room,
    sequence: 1,
    from: "you",
    turn: "me",
  });
  assert.equal(a.scenes.at(-1).from.id, "you");
  a.ws.message({ type: "ball.ended", roomId: "r", reason: "left" });
  assert.equal(a.scenes.at(-1).action, "ball-end");
});

test("unsupported new character retries hello once without changing local appearance or looping profile", (t) => {
  const a = setup(t);
  a.setCharacter("shiro");
  a.c.configure({
    url: "https://example.com",
    enabled: true,
    accessKey: "secret",
  });
  const ws = Socket.instances.at(-1);
  ws.emit("open");
  assert.equal(ws.sent[0].character, "shiro");
  ws.message({ type: "error", code: "HELLO_REQUIRED" });
  assert.equal(ws.sent[1].type, "hello");
  assert.equal(ws.sent[1].character, "penguin");
  assert.equal(ws.sent[1].accessKey, "secret");
  ws.message({
    type: "welcome",
    self: { id: "second", character: "penguin" },
    peers: [],
  });
  assert.equal(a.c.state.status, "online");
  assert.equal(a.c.character(), "shiro");
  assert.equal(ws.sent.length, 2);
  a.c.profile();
  assert.equal(ws.sent.length, 2);
});
