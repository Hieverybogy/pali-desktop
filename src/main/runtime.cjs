/**
 * Pali 主程序運行時協調器。
 *
 * 這個檔案是 Electron 主程序的業務入口，負責把原生視窗、系統事件、
 * 本機設定、桌寵運動、IPC、好友 WebSocket 與 AI 問答串在一起。
 * React Renderer 只負責畫面；凡是需要 Electron 或作業系統能力的操作，
 * 都由這裡接收命令後執行，再以 frame 事件把最新狀態送回各視窗。
 */
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

// 好友互動狀態：SocialClient 維護唯一 WebSocket；動畫事件依序進入佇列，
// Runtime 每次只播放一個 scene，避免多個透明互動視窗動畫重疊。
let social;
let interactionWindow,
  currentScene = null;
const interactionQueue = [];
let petMenuOpen = false;
let partReaction = null;

// 快速左右拖曳的辨識器，以及觸發後的落地、暈倒和恢復時間狀態。
const { Shake } = require("./services/shake.cjs");
const shake = new Shake();
let dizzyUntil = 0;
let fall = null;

// Activity 只在本次程序記憶體中統計工作／閒置時間，不寫入設定檔。
const activity = new Activity();

// bubble 視窗會在普通台詞、好友聊天和 AI 輸入三種模式之間共用。
let activityTimer,
  bubble,
  speech = "",
  speechUntil = 0,
  speechHovered = false,
  chatPeer = null,
  chatOpen = false,
  aiOpen = false,
  dialogueIndex = 0;
const { createWindow, send } = require("./windows/factory.cjs");
const { registerCommands } = require("./ipc/register.cjs");

// AI 由主程序直接呼叫 HTTP 服務，避免 Renderer 取得外部服務能力。
// const DEEPSEEK_ENDPOINT = "http://127.0.0.1:7001/api/deepseek";
const DEEPSEEK_ENDPOINT = "http://47.113.228.135:8060/api/deepseek";

// 桌寵視窗與移動狀態。target 是隨機散步目的地；drag 保存滑鼠在
// 寵物視窗內的按下偏移，讓拖曳時角色不會突然跳到游標中心。
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

/** 保存一般設定和桌寵最後的螢幕座標。 */
function save() {
  saveSettings(app.getPath("userData"), settings, pet.getPosition());
}

/**
 * 顯示寵物原生右鍵選單。
 * 選單打開期間停止拖曳和散步，關閉後延遲三秒再允許自動行走。
 */
function openPetMenu() {
  if (petMenuOpen || !pet || pet.isDestroyed()) return;
  petMenuOpen = true;
  drag = null;
  target = null;
  Menu.buildFromTemplate(
    socialMenu(social, openPanel, speak, openChat, openAi),
  ).popup({
    window: pet,
    callback: () => {
      petMenuOpen = false;
      nextWalk = Date.now() + 3000;
    },
  });
}

/** 把共用 bubble 視窗切換為指定好友的文字聊天輸入模式。 */
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

/** 把共用 bubble 視窗切換為 AI 問答輸入模式。 */
function openAi() {
  if (!bubble || bubble.isDestroyed()) return;
  closeChat();
  aiOpen = true;
  speech = "";
  bubble.setSize(360, 142);
  bubble.setIgnoreMouseEvents(false);
  send(bubble, { ai: true });
  positionBubble();
  bubble.show();
  bubble.focus();
}

/** 關閉 AI 模式，恢復 bubble 的穿透、預設尺寸和隱藏狀態。 */
function closeAi() {
  aiOpen = false;
  send(bubble, { ai: false });
  bubble?.setIgnoreMouseEvents(true);
  bubble?.setSize(260, 96);
  bubble?.hide();
}

/** 關閉好友聊天模式，並清除目前聊天對象。 */
function closeChat() {
  chatPeer = null;
  chatOpen = false;
  send(bubble, { chat: null });
  bubble?.setIgnoreMouseEvents(true);
  bubble?.setSize(260, 96);
  bubble?.hide();
}

/**
 * 記錄游標是否停留在氣泡上。
 * 台詞到期時若正在閱讀就暫不關閉，游標離開後才真正隱藏。
 */
function setSpeechHover(value) {
  speechHovered = value;
  if (!speechHovered && speech && Date.now() >= speechUntil) {
    speech = "";
    bubble?.hide();
  }
}

/** 集中提供 AI 端點，方便之後改為從設定或環境變數取得。 */
function deepSeekEndpoint() {
  return DEEPSEEK_ENDPOINT;
}

/** 依文字估算氣泡高度，同時限制在目前螢幕可用高度內。 */
function speechBubbleHeight(text) {
  const lines = text
    .split("\n")
    .reduce(
      (total, line) => total + Math.max(1, Math.ceil([...line].length / 34)),
      0,
    );
  const available = pet
    ? screen.getDisplayMatching(pet.getBounds()).workArea.height - 16
    : 360;
  return Math.min(available, Math.max(96, 42 + lines * 20));
}

/**
 * 將使用者問題送到 AI HTTP 服務。
 * 等待期間用不自動消失的台詞提示；請求最多等待 30 秒，任何網路、
 * HTTP 或資料格式錯誤都轉成適合直接顯示給使用者的統一提示。
 */
async function askDeepSeek(prompt) {
  const endpoint = deepSeekEndpoint();
  if (!endpoint) {
    speak("請先在控制台設定互動伺服器網址～");
    return;
  }
  speak("讓我想一下～", true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim() }),
      signal: controller.signal,
    });
    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error("response is not valid JSON");
    }
    const reply = data?.result?.reply || data?.reply;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (typeof reply !== "string" || !reply.trim())
      throw new Error("response does not contain reply");
    speak(reply.trim());
  } catch (error) {
    speak("嗯……現在暫時連不上問答服務，等一下再問我好嗎？");
  } finally {
    clearTimeout(timeout);
  }
}

/** macOS 使用 accessory 模式，讓控制台打開時仍不在 Dock 顯示。 */
function keepDockHidden() {
  if (process.platform !== "darwin") return;
  // Accessory apps can show interactive panels without appearing in the Dock.
  app.setActivationPolicy("accessory");
  app.dock.hide();
}

/** 延遲建立控制台；若已存在，就還原並聚焦原視窗。 */
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

/**
 * 顯示一段寵物台詞。
 * 普通台詞顯示 6.5 秒；waiting 用於 AI 等待狀態，會保持到下一次 speak。
 * 說話時停止散步，並同時通知桌寵和控制台播放短暫開心反應。
 */
function speak(text, waiting = false) {
  closeChat();
  closeAi();
  speechHovered = false;
  speech = text;
  speechUntil = waiting ? Number.POSITIVE_INFINITY : Date.now() + 6500;
  bubble?.setSize(360, speechBubbleHeight(text));
  target = null;
  nextWalk = speechUntil + 1500;
  positionBubble();
  send(bubble, { speech });
  if (bubble && !bubble.webContents.isLoading()) bubble.showInactive();
  send(pet, { reaction: true });
  send(panel, { reaction: true });
}

/**
 * 把 bubble 定位在寵物上方；上方空間不足時改放在下方。
 * 水平方向會限制在寵物目前所在顯示器的工作區內。
 */
function positionBubble() {
  if (!bubble || !pet || (!speech && !chatOpen && !aiOpen)) return;
  const b = pet.getBounds(),
    a = screen.getDisplayMatching(b).workArea,
    width = speech || chatOpen || aiOpen ? 360 : 260,
    height =
      chatOpen || aiOpen ? 142 : speech ? speechBubbleHeight(speech) : 96;
  const x = Math.round(
    Math.max(
      a.x,
      Math.min(b.x + b.width / 2 - width / 2, a.x + a.width - width),
    ),
  );
  const y = Math.round(
    b.y >= a.y + height
      ? b.y - height
      : Math.min(a.y + a.height - height, b.y + b.height - 12),
  );
  bubble.setPosition(x, y);
}

/** 顯示器變更後把桌寵限制回有效工作區，並取消舊散步目標。 */
function keepVisible() {
  if (!pet) return;
  const bounds = pet.getBounds();
  const area = screen.getDisplayMatching(bounds).workArea;
  const p = clampPosition(bounds, area, settings.size);
  pet.setPosition(p.x, p.y);
  target = null;
}

/**
 * 桌寵主更新迴圈，每 33ms 執行一次，集中完成：
 * 1. 氣泡到期與位置同步；
 * 2. 拖曳、快速晃動、落地及隨機散步；
 * 3. 透明區域的滑鼠穿透；
 * 4. 好友互動動畫佇列；
 * 5. 組裝最新 Frame 並推送到各 Renderer。
 */
function tick() {
  // 普通台詞超時後自動隱藏；游標仍停在氣泡上時暫緩關閉。
  if (speech && !speechHovered && Date.now() > speechUntil) {
    speech = "";
    bubble?.hide();
  }
  positionBubble();
  const now = Date.now(),
    // 限制單幀最大時間，避免程序卡頓後一次移動過遠。
    dt = Math.min((now - lastTick) / 1000, 0.1);
  lastTick = now;
  if (dizzyUntil && now >= dizzyUntil) {
    dizzyUntil = 0;
    speak("呼～站穩了！下次輕一點嘛。");
  }
  const mouse = screen.getCursorScreenPoint();
  let bounds = pet.getBounds();

  // Shake 收集拖曳中的水平軌跡；達到快速左右反向門檻後進入暈倒流程。
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

  // 使用二次曲線在 600ms 內下落到目前顯示器底部。
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

  // 拖曳優先級高於自動散步，座標始終經 clampPosition 限制。
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
    // 沒有目標且等待期結束後，在目前位置附近隨機選擇下一個目標。
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
        // 到達後停留 4–11 秒，避免角色一直不停移動。
        nextWalk = now + 4000 + Math.random() * 7000;
      } else {
        const x = Math.round(bounds.x + (dx / d) * Math.min(d, 65 * dt)),
          y = Math.round(bounds.y + (dy / d) * Math.min(d, 65 * dt));
        if (Number.isFinite(x) && Number.isFinite(y)) pet.setPosition(x, y);
        else target = null;
      }
    }
  }

  // 視窗是透明正方形；只有游標落在角色命中區域內才攔截滑鼠事件。
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

  // 每個好友互動場景最多播放 6.5 秒，結束後恢復原桌寵。
  if (
    currentScene &&
    (now - currentScene.startedAt >= 6500 || !pet.isVisible())
  ) {
    currentScene = null;
    interactionWindow.hide();
    pet.setOpacity(1);
    nextWalk = now + 3000;
  }

  // 空閒時從佇列取下一個互動。interactionWindow 覆蓋目前整個工作區，
  // 原桌寵暫時變透明，由 React 根據 sender／receiver 視角播放場景。
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

  // Frame 是各 Renderer 的狀態真相。mouse 轉換到 280×280 角色座標，
  // 供 SVG 眼睛追蹤；state 決定 React/CSS 應播放的身體動畫。
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

/**
 * 啟動 Electron 應用並註冊整個生命週期。
 * 此函式只由 main/index.cjs 呼叫一次。
 */
function startApplication() {
  // 正常使用只允許一個實例；測試雙開會先在 index.cjs 隔離 userData，
  // 因而取得另一組單實例鎖。再次啟動時改為打開現有控制台。
  if (!app.requestSingleInstanceLock()) app.quit();
  else {
    app.on("second-instance", () => openPanel());
    app.whenReady().then(() => {
      // 必須在 app ready 後讀取 screen、建立 BrowserWindow 和 Tray。
      settings = loadSettings(app.getPath("userData"));
      app.setName("Pali");
      keepDockHidden();
      const area = screen.getPrimaryDisplay().workArea;

      // 桌寵視窗：透明、無框、置頂，尺寸與上次位置來自本機設定。
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

      // 氣泡視窗：普通台詞時滑鼠穿透；聊天和 AI 模式才允許輸入與聚焦。
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

      // 好友互動視窗：播放時覆蓋整個工作區，但永遠不攔截滑鼠事件。
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

      // 優先載入專用托盤圖示，失敗時回退到應用圖示。
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

      // registerCommands 先驗證來源視窗和參數，再把合法命令交給此回呼。
      // fromPet 用來限制只有桌寵視窗能發起拖曳、部位點擊和右鍵選單。
      const disposeCommands = registerCommands(
        () => ({ pet, panel, bubble }),
        (action, value, fromPet) => {
          // 拖曳開始時保存游標在視窗內的相對位置，並開始收集晃動軌跡。
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
          // 拖曳結束後保存座標，並延遲下一次隨機散步。
          if (action === "drag-end" && fromPet) {
            drag = null;
            nextWalk = Math.max(Date.now() + 5000, dizzyUntil + 3000);
            save();
          }

          // 好友設定和操作只接受非桌寵 Renderer 發出，密鑰留空時保留舊值。
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
          if (action === "ai-open" && !fromPet) openAi();
          if (action === "ai-close" && !fromPet) closeAi();
          if (action === "ai-ask" && !fromPet) askDeepSeek(value);
          if (action === "speech-hover" && !fromPet) setSpeechHover(value);
          if (action === "pet-menu" && fromPet) openPetMenu();

          // 手、腳、耳朵反應持續 1.8 秒；好友動畫和暈倒期間不接受此操作。
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

          // 行為設定改變時同時取消現有散步目標，避免沿舊路徑繼續移動。
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

          // 尺寸變更需要同步調整原生 BrowserWindow，而不只是縮放 React SVG。
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

          // 普通身體點擊按 dialogueIndex 循環台詞，內容包含角色、心情與活動時間。
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

      // 顯示器拔除或解析度改變時，避免桌寵留在已不存在的座標。
      app.once("before-quit", disposeCommands);
      screen.on("display-removed", keepVisible);
      screen.on("display-metrics-changed", keepVisible);

      // 每秒讀取系統閒置秒數，Activity 根據門檻回傳需要顯示的提醒文字。
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

      // 鎖屏／休眠不計入工作或摸魚時間，恢復後從新時間點繼續統計。
      for (const event of ["suspend", "lock-screen"])
        powerMonitor.on(event, () => {
          activity.pause(Date.now());
          speech = "";
          bubble.hide();
        });
      for (const event of ["resume", "unlock-screen"])
        powerMonitor.on(event, () => activity.resume(Date.now()));

      // 約 30 FPS 更新桌寵；好友客戶端則在建立後按保存設定自動連線。
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

    // 退出時關閉 WebSocket、停止計時器，並最後保存一次位置與設定。
    app.on("before-quit", () => {
      social?.stop();
      clearInterval(timer);
      clearInterval(activityTimer);
      if (pet && !pet.isDestroyed()) save();
    });

    // Pali 是托盤常駐應用，所有 BrowserWindow 關閉時不自動退出程序。
    app.on("window-all-closed", () => {});
  }
}
module.exports = { startApplication };
