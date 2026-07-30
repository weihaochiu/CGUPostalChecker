(() => {
  const messages = {
    "zh-TW": {
      appName: "長庚大學自動查詢郵件",
      status: "狀態",
      recipients: "收件人",
      lastCheck: "上次查詢",
      nextCheck: "下次自動允許",
      result: "結果",
      recipientResults: "各收件人查詢結果",
      total: "合計 {count} 件",
      checking: "查詢中",
      monitoring: "監控中",
      stopped: "已停止",
      queryError: "查詢有錯誤",
      neverChecked: "尚未查詢",
      notScheduled: "尚未排定",
      noRecipient: "尚未設定啟用中的收件人",
      noConditionResult: "尚未依此條件完成查詢",
      lastCheckedAt: "最後查詢：{time}",
      failedAt: "查詢失敗：{time}",
      pieces: "件",
      checkNow: "立即查詢一次",
      startMonitor: "開始監控",
      stopMonitor: "停止監控",
      openPostal: "開啟查詢頁",
      settings: "設定",
      history: "紀錄",
      userGuide: "使用教學",
      processing: "處理中…",
      completed: "完成",
      updateAvailable: "發現新版本 {version}",
      latestVersion: "目前已是最新版",
      installedVersion: "已安裝版本",
      checkUpdate: "檢查更新",
      downloadLatest: "下載最新版",
      downloadVersion: "下載最新版 v{version}",
      upgradeGuide: "升級教學",
      openExtensionsPage: "開啟 Chrome 擴充功能頁",
      openDownloadsFolder: "開啟下載資料夾",
      sourceFolderLabel: "原始程式資料夾備忘",
      sourceFolderHint: "例如：C:\\Program Files\\Google\\ChromeExtensions\\CGUPostalChecker",
      sourceFolderSecurityNote: "Chrome 基於安全限制，無法自動取得或直接開啟未封裝外掛的 Windows 原始路徑。可在此記錄路徑，之後一鍵複製。",
      copySourceFolder: "複製程式目錄",
      language: "介面語言",
      traditionalChinese: "繁體中文",
      english: "English",
      scheduleTitle: "查詢排程",
      recipientsTitle: "收件人清單",
      notificationsTitle: "通知設定",
      maintenanceTitle: "紀錄與維護",
      updateTitle: "版本與更新",
      saveSettings: "儲存設定",
      addRecipient: "新增收件人",
      enabled: "啟用",
      recipientName: "收件人姓名 / 單位名稱",
      recipientId: "收件人 ID，選填",
      mailStatus: "郵件狀態",
      dateRange: "日期區間",
      dateType: "日期類型",
      deleteRecipient: "刪除此收件人",
      unread: "未領取",
      all: "全部",
      received: "已領取",
      returned: "退件",
      oneMonth: "1 個月",
      threeMonths: "3 個月",
      sixMonths: "6 個月",
      receiveDate: "收件日期",
      returnDate: "退件日期",
      autoMonitor: "啟用自動監控",
      checkOnStartup: "開啟 Chrome 時自動檢查一次",
      intervalCheck: "固定間隔自動檢查",
      intervalMinutes: "查詢間隔，分鐘，最低 120",
      allowedStart: "允許查詢開始",
      allowedEnd: "允許查詢結束",
      onlyHours: "只在指定時段查詢",
      skipWeekends: "週末不查詢",
      openTab: "沒有查詢頁時，自動開啟背景分頁",
      notifyOnlyMail: "只有查到郵件才跳通知；沒有新郵件只寫入背景紀錄",
      notifyDaily: "同一天同一收件人只提醒一次",
      notifyLogin: "登入失效或找不到查詢頁時提醒",
      showBadge: "在外掛圖示顯示郵件件數；查詢失敗時顯示紅色驚嘆號",
      autoUpdate: "每天自動檢查 GitHub 最新版本並提示更新",
      resetNotify: "重置今日提醒紀錄",
      testNotify: "測試通知",
      viewHistory: "查看查詢紀錄",
      clearSeen: "清除已看過郵件紀錄",
      clearLogs: "清除查詢紀錄",
      refresh: "重新整理",
      exportJson: "匯出 JSON",
      time: "時間",
      type: "類型",
      count: "數量",
      message: "訊息",
      noLogs: "尚無紀錄",
      newCount: "新增 {count}",
      confirmClearLogs: "確定清除查詢紀錄？",
      operationFailed: "操作失敗：{message}"
      ,postalUrlNote: "查詢網址固定為：https://www4.is.cgu.edu.tw/postal/studentletter.aspx"
      ,credentialNotice: "本外掛不儲存學校帳號與密碼。請先在 Chrome 中登入長庚大學郵件收發管理系統，外掛會使用目前登入狀態查詢。"
      ,recipientIdHint: "收件人 ID 可留空。若自動選取收件人失敗，再填入網頁 autocomplete 對應的 ID。"
      ,serverLoadNotice: "為避免造成伺服器負擔，自動查詢最低間隔固定為 120 分鐘，建議 360 分鐘。Chrome 開啟時不會立刻查詢，會先確認是否已到「下次允許查詢時間」，再隨機延遲後才查詢。"
      ,startupDelayMin: "Chrome 啟動延遲下限，分鐘"
      ,startupDelayMax: "Chrome 啟動延遲上限，分鐘"
      ,scheduleJitter: "排程隨機延遲上限，分鐘"
      ,manualCooldown: "手動查詢冷卻，分鐘"
      ,recipientDelayMin: "多人查詢間隔下限，秒"
      ,recipientDelayMax: "多人查詢間隔上限，秒"
      ,scheduleExplanation: "排程說明"
      ,scheduleDetails: "預設：每 6 小時查詢一次；Chrome 啟動後隨機 5–30 分鐘；每次查詢後下一次自動查詢再加 0–30 分鐘隨機延遲；多人查詢每人間隔 5–15 秒。"
      ,historyNote: "最多保留最近 500 筆紀錄。沒有郵件、查詢錯誤與今日已提醒過的查詢都會記錄在這裡。"
      ,recipientExample: "例如：王小明"
      ,optional: "可留空"
    },
    en: {
      appName: "CGU Postal Mail Checker",
      status: "Status",
      recipients: "Recipients",
      lastCheck: "Last check",
      nextCheck: "Next allowed check",
      result: "Result",
      recipientResults: "Results by recipient",
      total: "Total: {count}",
      checking: "Checking",
      monitoring: "Monitoring",
      stopped: "Stopped",
      queryError: "Query error",
      neverChecked: "Never checked",
      notScheduled: "Not scheduled",
      noRecipient: "No enabled recipients",
      noConditionResult: "Not checked with these conditions",
      lastCheckedAt: "Last checked: {time}",
      failedAt: "Failed: {time}",
      pieces: "item(s)",
      checkNow: "Check now",
      startMonitor: "Start monitoring",
      stopMonitor: "Stop monitoring",
      openPostal: "Open postal page",
      settings: "Settings",
      history: "History",
      userGuide: "User guide",
      processing: "Processing…",
      completed: "Done",
      updateAvailable: "Version {version} is available",
      latestVersion: "You have the latest version",
      installedVersion: "Installed version",
      checkUpdate: "Check for updates",
      downloadLatest: "Download latest",
      downloadVersion: "Download latest v{version}",
      upgradeGuide: "Upgrade guide",
      openExtensionsPage: "Open Chrome extensions",
      openDownloadsFolder: "Open Downloads folder",
      sourceFolderLabel: "Source folder note",
      sourceFolderHint: "Example: C:\\Program Files\\Google\\ChromeExtensions\\CGUPostalChecker",
      sourceFolderSecurityNote: "For security, Chrome cannot detect or directly open the native Windows source path of an unpacked extension. Save the path here and copy it later.",
      copySourceFolder: "Copy source folder",
      language: "Interface language",
      traditionalChinese: "Traditional Chinese",
      english: "English",
      scheduleTitle: "Query schedule",
      recipientsTitle: "Recipients",
      notificationsTitle: "Notifications",
      maintenanceTitle: "Logs and maintenance",
      updateTitle: "Version and updates",
      saveSettings: "Save settings",
      addRecipient: "Add recipient",
      enabled: "Enabled",
      recipientName: "Recipient or unit name",
      recipientId: "Recipient ID (optional)",
      mailStatus: "Mail status",
      dateRange: "Date range",
      dateType: "Date type",
      deleteRecipient: "Delete recipient",
      unread: "Uncollected",
      all: "All",
      received: "Collected",
      returned: "Returned",
      oneMonth: "1 month",
      threeMonths: "3 months",
      sixMonths: "6 months",
      receiveDate: "Received date",
      returnDate: "Return date",
      autoMonitor: "Enable automatic monitoring",
      checkOnStartup: "Check when Chrome starts",
      intervalCheck: "Check at a fixed interval",
      intervalMinutes: "Interval in minutes (minimum 120)",
      allowedStart: "Allowed start time",
      allowedEnd: "Allowed end time",
      onlyHours: "Only check during this time range",
      skipWeekends: "Skip weekends",
      openTab: "Open a background query tab if missing",
      notifyOnlyMail: "Notify only when mail is found; otherwise log silently",
      notifyDaily: "Notify each recipient only once per day",
      notifyLogin: "Notify when login expires or the query page is unavailable",
      showBadge: "Show mail count on the icon; show a red exclamation mark on errors",
      autoUpdate: "Check GitHub daily and prompt when a newer version is available",
      resetNotify: "Reset today's notification limit",
      testNotify: "Test notification",
      viewHistory: "View query history",
      clearSeen: "Clear seen-mail records",
      clearLogs: "Clear history",
      refresh: "Refresh",
      exportJson: "Export JSON",
      time: "Time",
      type: "Type",
      count: "Count",
      message: "Message",
      noLogs: "No records",
      newCount: "{count} new",
      confirmClearLogs: "Clear all query history?",
      operationFailed: "Operation failed: {message}"
      ,postalUrlNote: "Query URL: https://www4.is.cgu.edu.tw/postal/studentletter.aspx"
      ,credentialNotice: "This extension never stores your university account or password. Sign in to the CGU postal system in Chrome first; the extension uses that existing session."
      ,recipientIdHint: "Recipient ID is optional. Enter the autocomplete ID only if automatic recipient selection fails."
      ,serverLoadNotice: "To reduce server load, the minimum automatic interval is 120 minutes; 360 minutes is recommended. Chrome startup checks respect the next allowed time and add a randomized delay."
      ,startupDelayMin: "Chrome startup delay minimum (minutes)"
      ,startupDelayMax: "Chrome startup delay maximum (minutes)"
      ,scheduleJitter: "Random schedule delay maximum (minutes)"
      ,manualCooldown: "Manual-check cooldown (minutes)"
      ,recipientDelayMin: "Recipient delay minimum (seconds)"
      ,recipientDelayMax: "Recipient delay maximum (seconds)"
      ,scheduleExplanation: "Schedule explanation"
      ,scheduleDetails: "Defaults: check every 6 hours; wait 5–30 minutes after Chrome starts; add 0–30 minutes of jitter after each query; wait 5–15 seconds between recipients."
      ,historyNote: "The latest 500 records are retained. No-mail results, query errors, and daily notification limits are recorded here."
      ,recipientExample: "Example: Wang Xiaoming"
      ,optional: "Optional"
    }
  };

  function normalizeLanguage(language) {
    return language === "en" ? "en" : "zh-TW";
  }

  function detect() {
    const browserLanguage = String(
      globalThis.chrome?.i18n?.getUILanguage?.()
      || globalThis.navigator?.language
      || ""
    ).toLowerCase().replace(/_/g, "-");

    const traditionalChinese = browserLanguage === "zh-tw"
      || browserLanguage === "zh-hk"
      || browserLanguage === "zh-mo"
      || browserLanguage === "zh-hant"
      || browserLanguage.startsWith("zh-hant-");

    return traditionalChinese ? "zh-TW" : "en";
  }

  function t(language, key, replacements = {}) {
    const lang = normalizeLanguage(language);
    const template = messages[lang][key] ?? messages["zh-TW"][key] ?? key;
    return String(template).replace(/\{(\w+)\}/g, (_, name) => replacements[name] ?? "");
  }

  function apply(language, root = document) {
    const lang = normalizeLanguage(language);
    document.documentElement.lang = lang === "en" ? "en" : "zh-Hant";
    root.querySelectorAll("[data-i18n]").forEach(element => {
      element.textContent = t(lang, element.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
      element.placeholder = t(lang, element.dataset.i18nPlaceholder);
    });
  }

  globalThis.CGUI18N = { apply, detect, normalizeLanguage, t };
})();
