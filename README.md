# Pali · 伴游

Electron + React + TypeScript 桌面寵物，內建 10 款角色、眼睛追蹤、拖曳、散步、對話和工作／閒置提醒。

## 開發

需要 Node.js 22.12+。

```sh
npm ci
npm run dev
```

- `npm run build`：型別檢查與正式前端建置。
- `npm start`：執行已建置的桌面應用。
- `npm run check`：型別、單元測試及格式檢查。
- `npm run format`：統一程式格式。
- `npm run dist:mac`：Apple Silicon 與 Intel DMG。
- `npm run dist:win`：Windows x64 NSIS 安裝包。

打包設定在 `electron-builder.json`；安裝包位於 `outputs/`。
目前 Mac 使用 ad-hoc 簽署，尚未 Developer ID 簽署或公證；Windows 尚未憑證簽署。

## 使用

拖住寵物移動，點一下循環對話，右鍵打開設定；Mac Dock、頂部托盤也可進入管理。關閉設定後寵物仍留在桌面，退出使用托盤選單。

設定可切換角色、120／160／200 尺寸、散步、睡眠、心情與提醒。
工作／閒置是根據系統無操作時間的估算，不記錄輸入內容；60 秒未操作視為閒置，工作每 30 分鐘、閒置每 5 分鐘提醒。鎖屏和休眠暫停計時，計時歷史不保存。

角色與設定保存在 Electron userData 下的 pali-settings.json；舊版尺寸自動遷移。

## 程式碼目錄

```text
pali-desktop/
├── src/
│   ├── main/                         Electron 主程序：系統能力與應用協調
│   │   ├── index.cjs                 啟動入口
│   │   ├── runtime.cjs               視窗生命週期、散步、托盤、Dock 與計時協調
│   │   ├── windows/
│   │   │   └── factory.cjs           建立視窗、安全選項、開發／正式資源載入
│   │   ├── ipc/
│   │   │   └── register.cjs          IPC 來源與參數驗證、事件註冊及清理
│   │   └── services/
│   │       ├── settings.cjs          設定載入、保存及舊版資料遷移
│   │       ├── companion.cjs         工作／閒置計時、循環對話與尺寸規則
│   │       └── geometry.cjs          螢幕邊界限制、角色互動範圍判斷
│   ├── preload/
│   │   └── index.cjs                 透過 contextBridge 暴露受限的 window.pali
│   ├── shared/                       共用資料與通訊契約
│   │   ├── protocol.ts               Frame、事件、命令及 Bridge 型別
│   │   └── pets.json                 10 款角色的名稱、介紹、配色與命中區域
│   └── renderer/                     React 渲染程序：畫面與使用者互動
│       ├── main.tsx                  React 掛載與樣式載入入口
│       ├── env.d.ts                  window.pali 的全域型別宣告
│       ├── app/
│       │   └── App.tsx               按視窗用途選擇設定、桌寵或對話頁面
│       ├── hooks/
│       │   └── useCompanion.ts       IPC 訂閱、寵物狀態、反應動畫及清理
│       ├── lib/
│       │   ├── bridge.ts             封裝發送主程序命令
│       │   └── defaults.ts           渲染程序初始狀態與預覽資料
│       ├── components/
│       │   └── Sidebar.tsx           控制台側邊欄
│       ├── features/                 按業務功能組織元件
│       │   ├── characters/
│       │   │   ├── PetAvatar.tsx     共用角色繪製入口及其他動物 SVG
│       │   │   ├── Penguin.tsx       企鵝 SVG 與眼睛追蹤
│       │   │   ├── CharacterHero.tsx 目前角色的介紹、預覽及互動區
│       │   │   └── CharacterPicker.tsx 角色選擇彈窗
│       │   ├── settings/
│       │   │   ├── SettingsPage.tsx 控制台頁面組裝
│       │   │   └── CompanionSettings.tsx 大小、心情、行為與提醒設定
│       │   ├── pet/
│       │   │   └── PetPage.tsx       桌寵視窗的拖曳、點擊與右鍵互動
│       │   └── speech/
│       │       └── SpeechPage.tsx    獨立對話視窗
│       └── styles/
│           ├── index.css            樣式入口，管理各檔案的載入順序
│           ├── base.css             字型、基礎元素與通用規則
│           ├── settings.css         控制台布局與設定介面
│           ├── characters.css       角色選擇器與縮圖
│           ├── pet.css              桌寵與角色動畫
│           ├── companion.css        對話、活動摘要與新增設定樣式
│           └── responsive.css       控制台響應式調整
├── assets/                           Dock 與托盤圖示
├── tests/unit/                       計時、對話、尺寸與幾何邏輯測試
├── docs/architecture.md              架構邊界與維護說明
├── index.html                        Vite HTML 入口
├── vite.config.ts                    React 開發伺服器與前端建置設定
├── tsconfig.json                     TypeScript 檢查設定
├── electron-builder.json             Mac／Windows 安裝包設定
├── package.json                      專案資訊、依賴與執行指令
├── package-lock.json                 npm 依賴鎖定檔
├── .prettierrc.json                   程式碼格式規則
├── .prettierignore                    格式工具忽略清單
├── .gitignore                        Git 忽略清單
├── dist/                             前端建置產物，不直接修改
└── outputs/                          安裝包與打包產物，不提交版控
```

### 程序之間如何協作

1. `src/main/index.cjs` 啟動應用，`runtime.cjs` 協調視窗、桌寵行為和系統服務。
2. `windows/factory.cjs` 載入同一個 React 入口，透過 `view=panel`、`view=pet` 或 `view=bubble` 區分視窗。
3. `App.tsx` 選擇對應頁面，`useCompanion.ts` 訂閱狀態並處理反應與對話事件。
4. 使用者操作經 `window.pali.command()` → preload → 主程序 IPC 驗證，交由主程序執行。
5. 主程序透過 `frame` 通道送回完整狀態、反應或對話事件，React 更新畫面。

React 負責呈現與互動；檔案保存、全域滑鼠座標、系統閒置時間與原生視窗由主程序處理。`protocol.ts` 提供型別約束，實際執行時的 IPC 參數驗證位於 `register.cjs`。

### 常見修改位置

| 要修改的功能                 | 主要位置                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------- |
| 新增角色或調整介紹、配色     | `src/shared/pets.json`、`features/characters/PetAvatar.tsx`                                        |
| 修改企鵝外觀與眼睛追蹤       | `features/characters/Penguin.tsx`                                                                  |
| 修改角色選擇彈窗             | `features/characters/CharacterPicker.tsx`                                                          |
| 修改設定頁布局               | `features/settings/SettingsPage.tsx`、`styles/settings.css`                                        |
| 新增設定項                   | `CompanionSettings.tsx`、`protocol.ts`、主程序 `settings.cjs`、`ipc/register.cjs` 與 `runtime.cjs` |
| 修改對話內容或工作／閒置規則 | `src/main/services/companion.cjs`                                                                  |
| 修改桌面拖曳與點擊互動       | `features/pet/PetPage.tsx`、`src/main/runtime.cjs`                                                 |
| 修改命中區域、螢幕邊界       | `src/main/services/geometry.cjs`、`src/shared/pets.json`                                           |
| 修改視窗、托盤與 Dock        | `src/main/windows/factory.cjs`、`src/main/runtime.cjs`                                             |
| 修改安裝包名稱、架構或圖示   | `electron-builder.json`、`assets/`                                                                 |

表中的 `features/`、`styles/` 均相對於 `src/renderer/`。新增功能時依現有職責放置，避免把系統能力直接寫入 React 元件。

更多設計約定見 [架構說明](docs/architecture.md)。

## 平台限制

透明區域使用近似命中範圍；Linux Wayland 全域滑鼠追蹤尚不支援。Windows 桌面行為仍需實機驗證。

## 多人在線互動

應用預設連到 `ws://47.113.228.135:8060/pali/ws`，每次啟動自動連線。可以在控制台下方的「一起陪伴」修改 Egg 服務網址，例如 `https://你的域名` 或本機測試的 `http://localhost:8060`，應用會使用 `/pali/ws`。若後端配置 `PALI_ACCESS_KEY`，填入相同加入密鑰。不同電腦請使用大家均可連到的服務域名；`localhost` 只代表各自的電腦。

- 連線後顯示其他在線夥伴，以角色及臨時編號辨識，不需要註冊。
- 可以送茶、飛吻、抱抱、加油；收到互動時桌寵會顯示氣泡與浮動圖示。
- 打球點一下即在雙方桌面播放雙角色對打動畫，播完自動離場，無需接受、傳球或結束操作。
- 關閉控制台仍維持連線；按「離線」退出，或退出整個應用。重新啟動會自動連線至已保存的網址，沒有保存網址時使用預設地址。
- 斷線自動重連，每次重連會取得新臨時編號；不保存離線訊息。密鑰錯誤需修改後手動重新連線。
- 網址與連線開關存於 userData 的 `pali-social.json`，密鑰使用 Electron safeStorage 加密；系統加密不可用時不保存密鑰，下次需重新輸入。

程式分層：`src/main/services/social/` 維護唯一 WebSocket 連線與設定，`src/shared/protocol.ts` 定義 IPC 型別，`src/renderer/features/social/` 提供互動介面。密鑰不放入同步給各視窗的狀態資料。

`npm run check` 驗證型別、單元測試及格式。

寵物右鍵選單可直接選擇在線夥伴送茶、飛吻、抱抱、加油或邀請打球。收到邀請後也可從右鍵選單接受／婉拒，球局中可傳球或結束；選單底部保留控制台入口。選單開啟期間寵物會暫停散步。

快速左右拖曳寵物，約 1.4 秒內完成四次有幅度的反向動作，會觸發晃動與暈倒。寵物落到目前螢幕底部，側躺休息後約 4 秒自行恢復；一般單向拖動、慢速移動或小幅抖動不會觸發。

## 同一台電腦雙開測試

在專案目錄開兩個終端：第一個執行 `npm run dev`，第二個執行 `npm run dev:second`。第二個只啟動 Electron，共用第一個 Vite 開發服務。兩個 Pali 的設定與單實例鎖各自獨立，會取得不同在線編號；請讓兩邊連上相同互動伺服器，如有密鑰也要各自填入。

若使用已建置版本，先執行 `npm run build`，再分別執行 `npm start` 與 `npm run start:second`。可替第二隻選不同角色以便辨識，然後右鍵寵物，選擇另一個在線夥伴測試送茶或打球。第二實例設定保存於系統 appData 下的 `pali-test-second`。

macOS 以選單列應用模式執行：啟動及打開控制台皆不顯示 Dock 圖示，從頂部 Pali 圖示或寵物右鍵選單進入控制台。正式 macOS 安裝包設有 `LSUIElement`，從啟動時即隱藏 Dock；開發模式使用 Electron 啟動時可能短暫出現圖示，主程序初始化後隱藏。Windows 行為維持原樣。

親親會在發起者與接收者桌面各播放約 6.5 秒的雙角色場景：發起者從左側入場，靠近接收者親親並冒愛心，再向左離場。動畫期間暫時隱藏原桌寵，完成後恢復；多人連續親親會排隊播放。同一事件不重播，發起者收到成功轉送回覆才播放，雙方開始時間可能有網路延遲差異。双方需要更新桌面程式才能看到新動畫，無需更改後端。

所有好友互動都採雙角色場景：送茶會遞杯、親親冒愛心、抱抱靠近擁抱、加油跳躍和彩花。打球邀請也會到訪示意，接受後播放對打，每次傳球在雙方桌面播放球拍與球的動作，結束球局揮手道別。所有場景共用入場、動作、離場與佇列機制，需雙方更新客戶端。

啟動應用只顯示桌寵及選單列圖示，不自動開控制台；需要設定時從頂部圖示或寵物右鍵開啟。新版「一起打球」改走 `interaction.send` 的 `ball` 動作，須部署支援此動作的新版 Egg 後端。舊版邀請／球局操作已從介面移除。

發起互動時，自己的桌面只顯示自己的寵物走到左側離開，等待後再從左側走回原位置；對方桌面維持雙角色互動場景。點擊寵物手部會揮手、腳部會抬腳跳動、耳朵／頭頂會歪頭與抖耳；沒有外耳的角色使用歪頭回應。拖曳不觸發部位點擊。
