const {
  app,
  screen,
  Tray,
  Menu,
  nativeImage,
  powerMonitor,
} = require("electron");
const path = require("node:path");
const {
  defaults,
  isCharacter,
  loadSettings,
  saveSettings,
} = require("./services/settings.cjs");
const { clampPosition, hitPet } = require("./services/geometry.cjs");
const pets = require("../shared/pets.json");
const {
  SIZES,
  MOODS,
  Activity,
  dialogue,
} = require("./services/companion.cjs");
const { SocialClient } = require("./services/social/client.cjs");
const { loadSocial, saveSocial } = require("./services/social/settings.cjs");
const { socialMenu } = require("./services/social/menu.cjs");
let social;
let interactionWindow,
  currentScene = null;
const interactionQueue = [];
let petMenuOpen = false;
let partReaction = null;
const { Shake } = require("./services/shake.cjs");
const shake = new Shake();
let dizzyUntil = 0;
let fall = null;
const activity = new Activity();
let activityTimer,
  bubble,
  speech = "",
  speechUntil = 0,
  chatPeer = null,
  chatOpen = false,
  dialogueIndex = 0;
const { createWindow, send } = require("./windows/factory.cjs");
const { registerCommands } = require("./ipc/register.cjs");
let pet,
  panel,
  tray,
  timer,
  drag,
  target,
  ignored = false,
  nextWalk = Date.now() + 7000,
  lastTick = Date.now();
let settings = { ...defaults };
function save() {
  saveSettings(app.getPath("userData"), settings, pet.getPosition());
}
function openPetMenu() {
  if (petMenuOpen || !pet || pet.isDestroyed()) return;
  petMenuOpen = true;
  drag = null;
  target = null;
  Menu.buildFromTemplate(socialMenu(social, openPanel, speak, openChat)).popup({
    window: pet,
    callback: () => {
      petMenuOpen = false;
      nextWalk = Date.now() + 3000;
    },
  });
}
function openChat(peer) {
  if (!bubble || bubble.isDestroyed()) return;
  chatPeer = peer;
  chatOpen = true;
  speech = "";
  bubble.setSize(360, 142);
  bubble.setIgnoreMouseEvents(false);
  send(bubble, { chat: { peer } });
  positionBubble();
  bubble.show();
  bubble.focus();
}
function closeChat() {
  chatPeer = null;
  chatOpen = false;
  send(bubble, { chat: null });
  bubble?.setIgnoreMouseEvents(true);
  bubble?.setSize(260, 96);
  bubble?.hide();
}
function keepDockHidden() {
  if (process.platform !== "darwin") return;
  // Accessory apps can show interactive panels without appearing in the Dock.
  app.setActivationPolicy("accessory");
  app.dock.hide();
}
function openPanel() {
  keepDockHidden();
  if (panel && !panel.isDestroyed()) {
    if (panel.isMinimized()) panel.restore();
    panel.show();
    panel.focus();
    return;
  }
  panel = createWindow(
    {
      width: 980,
      height: 740,
      minWidth: 800,
      minHeight: 650,
      title: "Pali · 伴游",
      backgroundColor: "#f7f8fa",
      autoHideMenuBar: true,
      skipTaskbar: process.platform === "darwin",
    },
    "panel",
  );
}
function speak(text) {
  closeChat();
  speech = text;
  speechUntil = Date.now() + 6500;
  target = null;
  nextWalk = speechUntil + 1500;
  positionBubble();
  send(bubble, { speech });
  if (bubble && !bubble.webContents.isLoading()) bubble.showInactive();
  send(pet, { reaction: true });
  send(panel, { reaction: true });
}
function positionBubble() {
  if (!bubble || !pet || (!speech && !chatOpen)) return;
  const b = pet.getBounds(),
    a = screen.getDisplayMatching(b).workArea,
    width = chatOpen ? 360 : 260;
  const x = Math.round(
    Math.max(
      a.x,
      Math.min(b.x + b.width / 2 - width / 2, a.x + a.width - width),
    ),
  );
  const y = Math.round(
    b.y >= a.y + (chatOpen ? 142 : 96)
      ? b.y - (chatOpen ? 142 : 88)
      : Math.min(a.y + a.height - (chatOpen ? 142 : 96), b.y + b.height - 12),
  );
  bubble.setPosition(x, y);
}
function keepVisible() {
  if (!pet) return;
  const bounds = pet.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const p = clampPosition(bounds, area, settings.size);
  pet.setPosition(p.x, p.y);
  target = null;
}
function tick() {
  if (speech && Date.now() > speechUntil) {
    speech = "";
    bubble?.hide();
  }
  positionBubble();
  const now = Date.now(),
    dt = Math.min((now - lastTick) / 1000, 0.1);
  lastTick = now;
  if (dizzyUntil && now >= dizzyUntil) {
    dizzyUntil = 0;
    speak("呼～站穩了！下次輕一點嘛。");
  }
  const mouse = screen.getCursorScreenPoint();
  let bounds = pet.getBounds();
  if (drag && shake.sample(mouse.x, now)) {
    drag = null;
    target = null;
    const area = screen.getDisplayMatching(bounds).workArea;
    const ground = clampPosition(
      { x: bounds.x, y: area.y + area.height - settings.size },
      area,
      settings.size,
    );
    fall = { start: now, from: bounds.y, to: ground.y };
    dizzyUntil = now + 3800;
    nextWalk = dizzyUntil + 3000;
    speak("嗚哇～轉暈了，讓我躺一下……");
  }
  if (fall) {
    const progress = Math.min(1, (now - fall.start) / 600);
    pet.setPosition(
      bounds.x,
      Math.round(fall.from + (fall.to - fall.from) * progress * progress),
    );
    if (progress === 1) {
      fall = null;
      save();
    }
  }
  if (drag) {
    const p = clampPosition(
      { x: mouse.x - drag.x, y: mouse.y - drag.y },
      screen.getDisplayNearestPoint(mouse).workArea,
      settings.size,
    );
    pet.setPosition(p.x, p.y);
  } else if (
    settings.roaming &&
    !settings.sleeping &&
    pet.isVisible() &&
    !petMenuOpen &&
    !currentScene &&
    now >= dizzyUntil
  ) {
    if (!target && now > nextWalk) {
      const area = screen.getDisplayMatching(bounds).workArea;
      target = clampPosition(
        {
          x: bounds.x + (Math.random() - 0.5) * 400,
          y: bounds.y + (Math.random() - 0.5) * 160,
        },
        area,
        settings.size,
      );
    }
    if (target) {
      const dx = target.x - bounds.x,
        dy = target.y - bounds.y,
        d = Math.hypot(dx, dy);
      if (
        !Number.isFinite(target.x) ||
        !Number.isFinite(target.y) ||
        !Number.isFinite(d)
      ) {
        target = null;
      } else if (d < 3) {
        target = null;
        nextWalk = now + 4000 + Math.random() * 7000;
      } else {
        const x = Math.round(bounds.x + (dx / d) * Math.min(d, 65 * dt)),
          y = Math.round(bounds.y + (dy / d) * Math.min(d, 65 * dt));
        if (Number.isFinite(x) && Number.isFinite(y)) pet.setPosition(x, y);
        else target = null;
      }
    }
  }
  bounds = pet.getBounds();
  const over = hitPet(
    mouse.x - bounds.x,
    mouse.y - bounds.y,
    settings.size,
    settings.character,
  );
  const shouldIgnore = !petMenuOpen && !drag && !over;
  if (ignored !== shouldIgnore) {
    ignored = shouldIgnore;
    pet.setIgnoreMouseEvents(ignored, { forward: true });
  }
  if (
    currentScene &&
    (now - currentScene.startedAt >= 6500 || !pet.isVisible())
  ) {
    currentScene = null;
    interactionWindow.hide();
    pet.setOpacity(1);
    nextWalk = now + 3000;
  }
  if (
    !currentScene &&
    !drag &&
    now >= dizzyUntil &&
    interactionQueue.length &&
    interactionWindow &&
    !interactionWindow.webContents.isLoading()
  ) {
    const event = interactionQueue.shift();
    if (pet.isVisible()) {
      const area = screen.getDisplayMatching(bounds).workArea;
      const size = Math.min(settings.size, area.width / 3);
      interactionWindow.setBounds(area);
      currentScene = {
        ...event,
        perspective:
          event.from.id === social.state.self?.id ? "sender" : "receiver",
        originX: bounds.x - area.x,
        startedAt: now,
        size,
        targetX: Math.max(size, Math.min(bounds.x - area.x, area.width - size)),
        top: Math.max(0, Math.min(bounds.y - area.y, area.height - size)),
      };
      target = null;
      pet.setOpacity(0);
      bubble.hide();
      speech = "";
      interactionWindow.showInactive();
    }
  }
  const data = {
    scene: currentScene,
    partReaction:
      partReaction && partReaction.until > now ? partReaction : null,
    ...settings,
    social: social?.state,
    activity: activity.snapshot(now),
    mouse: {
      x: ((mouse.x - bounds.x) / settings.size) * 280,
      y: ((mouse.y - bounds.y) / settings.size) * 280,
    },
    state:
      now < dizzyUntil
        ? now < dizzyUntil - 3200
          ? "falling"
          : now < dizzyUntil - 800
            ? "dizzy"
            : "recovering"
        : drag
          ? shake.shaking(now)
            ? "shaking"
            : "dragging"
          : settings.sleeping
            ? "sleeping"
            : target
              ? "walking"
              : "idle",
    visible: pet.isVisible(),
  };
  send(pet, data);
  send(panel, data);
  if (currentScene) send(interactionWindow, data);
}
function startApplication() {
  if (!app.requestSingleInstanceLock()) app.quit();
  else {
    app.on("second-instance", () => openPanel());
    app.whenReady().then(() => {
      settings = loadSettings(app.getPath("userData"));
      app.setName("Pali");
      keepDockHidden();
      const area = screen.getPrimaryDisplay().workArea;
      pet = createWindow(
        {
          width: settings.size,
          height: settings.size,
          x: settings.x ?? area.x + area.width - settings.size - 70,
          y: settings.y ?? area.y + area.height - settings.size - 40,
          transparent: true,
          frame: false,
          hasShadow: false,
          resizable: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          show: false,
        },
        "pet",
      );
      bubble = createWindow(
        {
          width: 260,
          height: 96,
          transparent: true,
          frame: false,
          hasShadow: false,
          resizable: false,
          focusable: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          show: false,
        },
        "bubble",
      );
      bubble.setIgnoreMouseEvents(true);
      bubble.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: process.platform === "darwin",
      });
      bubble.once("ready-to-show", () => {
        if (speech && Date.now() < speechUntil) {
          send(bubble, { speech });
          bubble.showInactive();
        }
      });
      interactionWindow = createWindow(
        {
          width: area.width,
          height: area.height,
          x: area.x,
          y: area.y,
          transparent: true,
          frame: false,
          hasShadow: false,
          resizable: false,
          focusable: false,
          alwaysOnTop: true,
          skipTaskbar: true,
          show: false,
        },
        "interaction",
      );
      interactionWindow.setIgnoreMouseEvents(true);
      interactionWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: process.platform === "darwin",
      });
      pet.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true,
        skipTransformProcessType: process.platform === "darwin",
      });
      keepDockHidden();
      pet.once("ready-to-show", () => {
        keepVisible();
        pet.showInactive();
      });
      pet.on("blur", () => {
        drag = null;
      });
      const iconPath = path.join(app.getAppPath(), "assets", "tray.png");
      let icon = nativeImage.createFromPath(iconPath);
      if (icon.isEmpty()) {
        console.error("Unable to load tray icon:", iconPath);
        icon = nativeImage.createFromPath(
          path.join(app.getAppPath(), "assets", "dock.png"),
        );
      }
      if (!icon.isEmpty()) icon = icon.resize({ width: 18, height: 18 });
      if (process.platform === "darwin") icon.setTemplateImage(true);
      tray = new Tray(icon);
      if (process.platform === "darwin") tray.setTitle("Pali");
      tray.setToolTip("Pali · 伴游");
      tray.setContextMenu(
        Menu.buildFromTemplate([
          { label: "打開 Pali 控制台", click: openPanel },
          {
            label: "顯示 / 隱藏夥伴",
            click: () => (pet.isVisible() ? pet.hide() : pet.showInactive()),
          },
          {
            label: "把夥伴帶回主螢幕",
            click: () => {
              const a = screen.getPrimaryDisplay().workArea;
              const p = clampPosition(
                {
                  x: a.x + a.width - settings.size - 40,
                  y: a.y + a.height - settings.size - 40,
                },
                a,
                settings.size,
              );
              pet.setPosition(p.x, p.y);
              target = null;
              pet.showInactive();
            },
          },
          { type: "separator" },
          { label: "退出 Pali", click: () => app.quit() },
        ]),
      );
      tray.on("click", openPanel);
      const disposeCommands = registerCommands(
        () => ({ pet, panel, bubble }),
        (action, value, fromPet) => {
          if (
            action === "drag-start" &&
            fromPet &&
            Date.now() >= dizzyUntil &&
            !currentScene
          ) {
            const m = screen.getCursorScreenPoint(),
              b = pet.getBounds();
            drag = { x: m.x - b.x, y: m.y - b.y };
            shake.start(m.x, Date.now(), settings.size);
            target = null;
          }
          if (action === "drag-end" && fromPet) {
            drag = null;
            nextWalk = Math.max(Date.now() + 5000, dizzyUntil + 3000);
            save();
          }
          if (action === "social-config" && !fromPet) {
            try {
              social.configure({
                ...value,
                accessKey:
                  value.accessKey === undefined
                    ? social.config.accessKey
                    : value.accessKey,
              });
              saveSocial(app.getPath("userData"), social.config);
            } catch (error) {
              social.state.notice = error.message;
            }
          }
          if (action === "social-action" && !fromPet) social.request(value);
          if (action === "chat-open" && !fromPet) {
            const peer = social?.state.peers.find((item) => item.id === value);
            if (peer) openChat(peer);
          }
          if (action === "chat-close" && !fromPet) closeChat();
          if (action === "pet-menu" && fromPet) openPetMenu();
          if (
            action === "pet-part" &&
            fromPet &&
            !currentScene &&
            Date.now() >= dizzyUntil + 300
          ) {
            partReaction = { part: value, until: Date.now() + 1800 };
            speak(
              value === "hand"
                ? "嗨～跟你揮揮手！"
                : value === "foot"
                  ? "嘿嘿，腳底癢癢的！"
                  : "嗯？你在叫我嗎？",
            );
          }
          if (action === "panel") openPanel();
          if (action === "roaming" && typeof value === "boolean") {
            settings.roaming = value;
            target = null;
            nextWalk = Date.now() + 3000;
          }
          if (action === "sleeping" && typeof value === "boolean") {
            settings.sleeping = value;
            target = null;
          }
          if (action === "character" && isCharacter(value)) {
            settings.character = value;
            social?.profile();
            target = null;
            nextWalk = Date.now() + 3000;
            save();
            tick();
          }
          if (action === "size" && SIZES.includes(value)) {
            settings.size = value;
            pet.setSize(value, value);
            keepVisible();
          }
          if (action === "visible") {
            if (value) pet.showInactive();
            else {
              pet.hide();
              bubble.hide();
              speech = "";
            }
          }
          if (action === "pet" && Date.now() >= dizzyUntil + 300) {
            const name = pets.find((p) => p.id === settings.character).name;
            speak(
              dialogue(dialogueIndex++, {
                name,
                mood: settings.mood,
                activity: activity.snapshot(Date.now()),
              }),
            );
          }
          if (action === "mood" && MOODS.includes(value)) settings.mood = value;
          if (action === "reminders" && typeof value === "boolean")
            settings.reminders = value;
          if (action === "quit") app.quit();
          if (
            ["roaming", "sleeping", "size", "mood", "reminders"].includes(
              action,
            )
          )
            save();
        },
      );
      app.once("before-quit", disposeCommands);
      screen.on("display-removed", keepVisible);
      screen.on("display-metrics-changed", keepVisible);
      activityTimer = setInterval(() => {
        const text = activity.sample(
          Date.now(),
          powerMonitor.getSystemIdleTime(),
        );
        if (
          text &&
          settings.reminders &&
          !settings.sleeping &&
          pet.isVisible() &&
          !speech
        )
          speak(text);
      }, 1000);
      for (const event of ["suspend", "lock-screen"])
        powerMonitor.on(event, () => {
          activity.pause(Date.now());
          speech = "";
          bubble.hide();
        });
      for (const event of ["resume", "unlock-screen"])
        powerMonitor.on(event, () => activity.resume(Date.now()));
      timer = setInterval(tick, 33);
      social = new SocialClient({
        config: loadSocial(app.getPath("userData")),
        character: () => settings.character,
        notify: speak,
        onInteraction: (event) => {
          if (interactionQueue.length < 10) interactionQueue.push(event);
        },
      });
      social.connect();
    });
    app.on("before-quit", () => {
      social?.stop();
      clearInterval(timer);
      clearInterval(activityTimer);
      if (pet && !pet.isDestroyed()) save();
    });
    app.on("window-all-closed", () => {});
  }
}
module.exports = { startApplication };
