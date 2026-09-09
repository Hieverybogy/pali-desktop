# Pali · 伴游

Electron + React + TypeScript 桌面寵物，內建 15 款角色、眼睛追蹤、拖曳、散步、對話、好友互動和工作／閒置提醒。

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
├── .vscode/
│   └── settings.json                 VS Code 儲存時格式化、ESLint 與各語言格式工具設定
├── assets/                           Electron 原生圖示資源
│   ├── dock.png                      macOS Dock／應用程式圖示來源
│   └── tray.png                      macOS 選單列與系統托盤圖示來源
├── docs/
│   └── architecture.md               程序分層、依賴方向、IPC 邊界與擴充約定
├── src/
│   ├── main/                         Electron 主程序：原生視窗、系統能力與業務協調
│   │   ├── index.cjs                 應用啟動入口；建立 Runtime、處理單實例與生命週期
│   │   ├── runtime.cjs               中央協調器；管理視窗、托盤、Dock、散步、計時、AI 與互動事件
│   │   ├── windows/
│   │   │   └── factory.cjs           建立各類 BrowserWindow，配置安全選項及開發／正式頁面載入
│   │   ├── ipc/
│   │   │   └── register.cjs          註冊 IPC 命令，驗證來源與參數，並在退出時解除監聽
│   │   └── services/
│   │       ├── companion.cjs         尺寸規則、循環台詞、工作／閒置計時與提醒內容
│   │       ├── geometry.cjs          視窗位置限制、螢幕可用區域及互動場景幾何計算
│   │       ├── settings.cjs          一般設定的預設值、載入、保存、合併與舊版資料遷移
│   │       ├── shake.cjs             分析快速左右拖曳軌跡，判斷是否觸發晃動與暈倒
│   │       └── social/               多人在線互動的主程序服務
│   │           ├── client.cjs         WebSocket 連線、握手、重連、在線列表與訊息收發
│   │           ├── menu.cjs           根據在線狀態建立寵物右鍵好友互動選單
│   │           └── settings.cjs       互動網址、自動連線及 safeStorage 密鑰的本機保存
│   ├── preload/
│   │   └── index.cjs                 在隔離環境中以 contextBridge 暴露受控的 window.pali API
│   ├── shared/                       主程序與 React 共用的靜態資料及通訊契約
│   │   ├── pets.json                 15 款角色的代號、名稱、介紹、配色及部位命中區域
│   │   └── protocol.ts               設定、Frame、事件、命令、互動資料及 Bridge 的 TypeScript 型別
│   └── renderer/                     React 渲染程序：各視窗畫面與使用者操作
│       ├── main.tsx                  React createRoot 掛載入口及全域 CSS 載入入口
│       ├── env.d.ts                  Vite 環境與 window.pali 全域 API 的型別宣告
│       ├── app/
│       │   └── App.tsx               讀取 view 參數，分派控制台、桌寵、氣泡、互動或對話頁面
│       ├── components/
│       │   └── Sidebar.tsx           控制台側邊導覽、頁籤切換與視窗拖曳區
│       ├── hooks/
│       │   └── useCompanion.ts       訂閱主程序 Frame／事件，維護角色狀態、反應動畫與清理
│       ├── lib/
│       │   ├── bridge.ts             封裝 window.pali，集中處理命令發送與降級行為
│       │   └── defaults.ts           React 首次渲染所需的預設 Frame、設定與預覽資料
│       ├── features/                 依畫面功能拆分的 React 元件
│       │   ├── characters/
│       │   │   ├── CartoonPet.tsx     哆啦A夢、羅小黑與小白等卡通角色的 SVG 繪製
│       │   │   ├── CharacterHero.tsx 目前角色的大圖預覽、介紹與狀態展示
│       │   │   ├── CharacterPicker.tsx 角色清單與切換彈窗
│       │   │   ├── Penguin.tsx       企鵝 SVG、眼睛追蹤及身體部位結構
│       │   │   └── PetAvatar.tsx     角色繪製總入口，按 petId 分派企鵝、動物或卡通外觀
│       │   ├── pet/
│       │   │   └── PetPage.tsx       桌寵本體；處理拖曳、點擊部位、眼睛方向及右鍵選單
│       │   ├── settings/
│       │   │   ├── CompanionSettings.tsx 角色大小、心情、散步、睡眠與提醒表單
│       │   │   └── SettingsPage.tsx  控制台頁面骨架、分頁內容與當前狀態組裝
│       │   ├── social/
│       │   │   ├── InteractionPage.tsx 雙角色互動動畫場景與發起方離場／返回動畫
│       │   │   └── SocialPanel.tsx   伺服器設定、連線狀態、在線夥伴與互動操作面板
│       │   └── speech/
│       │       └── SpeechPage.tsx    氣泡台詞、好友文字聊天及內建 AI 對話視窗
│       └── styles/
│           ├── base.css              CSS 變數、字型、重置、按鈕及通用基礎樣式
│           ├── characters.css        角色預覽、角色卡片、選擇彈窗與卡通 SVG 樣式
│           ├── companion.css         陪伴狀態、活動統計、對話與 AI 表單樣式
│           ├── index.css             樣式聚合入口，定義各 CSS 檔案載入順序
│           ├── interaction.css       雙角色入場、互動、離場、球類與特效動畫
│           ├── pet.css               透明桌寵視窗、身體反應、拖曳晃動與暈倒動畫
│           ├── responsive.css        控制台在窄視窗下的響應式布局
│           ├── settings.css          控制台框架、側邊欄、表單及設定卡片樣式
│           └── social.css            連線設定、在線好友、操作按鈕與聊天介面樣式
├── tests/
│   └── unit/
│       ├── companion.test.cjs        驗證尺寸、循環台詞及工作／閒置計時規則
│       ├── geometry.test.cjs         驗證視窗不越界、螢幕定位與互動幾何計算
│       ├── shake.test.cjs            驗證快速左右拖曳的晃動判定與誤觸排除
│       └── social.test.cjs           驗證 WebSocket 地址、協議訊息及互動設定處理
├── .gitignore                        排除依賴、建置產物、安裝包、日誌及暫存目錄
├── .prettierignore                   指定 Prettier 不處理的依賴與生成檔案
├── .prettierrc.json                  Prettier 的縮排、引號、分號及換行規則
├── README.md                         開發、使用、目錄、互動服務與打包說明
├── electron-builder.json             macOS／Windows 打包目標、圖示、簽署與輸出設定
├── index.html                        Vite HTML 入口
├── package-lock.json                 鎖定 npm 完整依賴樹，確保不同電腦安裝結果一致
├── package.json                      專案元資料、npm 指令、依賴與 Node.js 版本要求
├── tsconfig.json                     React／Vite TypeScript 編譯與型別檢查選項
└── vite.config.ts                    React 外掛、開發伺服器與 renderer 建置設定
```

以下目錄由安裝、開發、建置或打包過程生成，不屬於需要手動維護的原始碼：

| 目錄            | 作用                                                                        |
| --------------- | --------------------------------------------------------------------------- |
| `node_modules/` | `npm ci` 安裝的第三方依賴。                                                 |
| `dist/`         | `npm run build` 產生的 React renderer 靜態檔案，Electron 正式模式從此載入。 |
| `outputs/`      | `npm run dist:mac`／`dist:win` 產生的安裝包及解包檔案。                     |
| `work/`         | 開發過程的暫存資料，不作為產品原始碼提交。                                  |

### 程序之間如何協作

1. `src/main/index.cjs` 啟動應用，`runtime.cjs` 協調視窗、桌寵行為和系統服務。
2. `windows/factory.cjs` 載入同一個 React 入口，透過 `view` 參數區分控制台、桌寵、氣泡、互動與聊天視窗。
3. `App.tsx` 選擇對應頁面，`useCompanion.ts` 訂閱狀態並處理角色反應與事件。
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
| 修改快速拖曳、晃動與暈倒判定 | `src/main/services/shake.cjs`、`features/pet/PetPage.tsx`、`styles/pet.css`                        |
| 修改命中區域、螢幕邊界       | `src/main/services/geometry.cjs`、`src/shared/pets.json`                                           |
| 修改視窗、托盤與 Dock        | `src/main/windows/factory.cjs`、`src/main/runtime.cjs`                                             |
| 修改好友連線與協議處理       | `src/main/services/social/client.cjs`、`src/shared/protocol.ts`                                    |
| 修改好友面板或右鍵選單       | `features/social/SocialPanel.tsx`、`src/main/services/social/menu.cjs`                             |
| 修改雙角色互動動畫           | `features/social/InteractionPage.tsx`、`styles/interaction.css`                                    |
| 修改好友聊天或 AI 對話       | `features/speech/SpeechPage.tsx`、`src/main/runtime.cjs`、`styles/social.css`                      |
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
