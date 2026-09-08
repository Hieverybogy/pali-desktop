# Pali 專案架構

## 目錄與責任

```text
src/
  main/
    index.cjs                   Electron 啟動入口
    runtime.cjs                 應用生命週期、寵物運動、托盤與服務協調
    windows/factory.cjs         建立視窗、安全設定、開發與正式資源定位
    ipc/register.cjs            IPC 來源驗證、參數驗證、註冊及清理
    services/
      settings.cjs             本地設定載入、舊版迁移與保存
      companion.cjs            工作／閒置計時、循環對話
      geometry.cjs             螢幕邊界與角色命中區域
  preload/index.cjs             contextBridge 白名單入口
  shared/
    protocol.ts                前後程序共用命令與事件型別
    pets.json                  角色資料、配色與命中區域
  renderer/
    main.tsx                   React 掛載與樣式入口
    app/App.tsx                按視窗用途選擇頁面
    hooks/useCompanion.ts       IPC 訂閱、狀態與互動生命週期
    lib/                       橋接呼叫與預設狀態
    components/Sidebar.tsx     共用介面元件
    features/
      characters/              角色繪製、展示、選擇器
      settings/                設定頁面與設定項
      pet/                     桌寵拖曳及點擊
      speech/                  對話視窗
    styles/                    按用途分拆樣式，index.css 管理載入順序
assets/                        Dock 與托盤圖示
 tests/unit/                   純邏輯測試
 docs/                         架構文件
 electron-builder.json         打包配置
 dist/                         Vite 產物（不手改）
 outputs/                      安裝包（不提交）
```

## 邊界

- Renderer 不存取 Node、檔案系統或 Electron 原生模組。命令透過 preload 暴露的 bridge 發送。
- 主程序獨占視窗、全域座標、活動讀取與設定檔；IPC 驗證來源視窗與允許的參數。
- `CompanionEvent` 區分完整 frame、reaction、speech，不把單獨反應事件當作完整畫面狀態。
- 純邏輯放 services，避免測試依賴視窗或桌面環境；runtime 負責協調。
- 三種 renderer 頁面使用同一入口；小型透明視窗不需要引入路由框架。
- 保留主程序 CommonJS，兼容 sandboxed preload；React 與橋接契約使用 TypeScript。

## 擴充方式

新增角色先更新 shared/pets.json，再在 characters/PetAvatar.tsx 增加素材。
新增設定依序更新 protocol、主程序預設與載入驗證、IPC 驗證、設定元件。
新增原生功能放 main/services，再以明確 IPC 命令暴露。
修改視窗選項集中到 windows 或 runtime，不讓 React 決定任意原生視窗參數。

## 驗證

`npm run check` 執行型別檢查、單元測試與格式檢查。
`npm run build` 產生正式 renderer 資源。
`npm run dist:mac` / `npm run dist:win` 產生指定平台安裝包。
Windows 安裝與桌面行為需在 Windows 實機驗證；跨平台產物生成不等於實機測試。
