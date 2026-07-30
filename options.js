const DEFAULT_SETTINGS = {
  enabled: false,
  language: CGUI18N.detect(),
  languageUserSelected: false,
  checkOnStartup: true,
  intervalEnabled: true,
  intervalMinutes: 360,
  minAutoIntervalMinutes: 120,
  startupDelayMinMinutes: 5,
  startupDelayMaxMinutes: 30,
  scheduleJitterMaxMinutes: 30,
  manualCooldownMinutes: 5,
  recipientDelayMinSeconds: 5,
  recipientDelayMaxSeconds: 15,
  onlyWithinHours: false,
  activeStartTime: "08:00",
  activeEndTime: "18:00",
  skipWeekends: false,
  notifyOnlyWhenMailExists: true,
  notifyOncePerDay: true,
  notifyLoginIssue: true,
  showBadge: true,
  updateCheckEnabled: true,
  latestVersion: "",
  updateAvailable: false,
  updateCheckStatus: "尚未檢查",
  sourceFolderNote: "",
  captureScreenshotOnError: false,
  openTabIfMissing: true,
  recipients: []
};

const recipientsEl = document.getElementById("recipients");
const template = document.getElementById("recipientTemplate");
const msgEl = document.getElementById("message");
let currentLanguage = "zh-TW";

function tr(zh, en) {
  return currentLanguage === "en" ? en : zh;
}

function compareVersions(a, b) {
  const left = String(a || "").replace(/^v/i, "").split(".").map(Number);
  const right = String(b || "").replace(/^v/i, "").split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function showMessage(text) {
  msgEl.textContent = text;
  setTimeout(() => {
    if (msgEl.textContent === text) msgEl.textContent = "";
  }, 4000);
}

function showDiagnosticStatus(text, isError = false) {
  const element = document.getElementById("diagnosticStatus");
  element.textContent = text;
  element.className = isError ? "small error-text" : "small";
}

function runtimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

async function updateScreenshotPermissionStatus() {
  const granted = await chrome.permissions.contains({ permissions: ["debugger"] });
  document.getElementById("screenshotPermissionStatus").textContent = granted
    ? tr("錯誤截圖權限已授予", "Error screenshot permission granted")
    : tr("錯誤截圖權限未授予", "Error screenshot permission not granted");
  return granted;
}

function addRecipientCard(recipient = {}) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector(".r-enabled").checked = recipient.enabled ?? true;
  node.querySelector(".r-name").value = recipient.name || "";
  node.querySelector(".r-id").value = recipient.receiverId || "";
  node.querySelector(".r-status").value = recipient.status ?? "0";
  node.querySelector(".r-dateType").value = recipient.dateType ?? "0";
  node.querySelector(".r-dateInterval").value = recipient.dateInterval ?? "1";
  node.querySelector(".remove").addEventListener("click", () => node.remove());
  recipientsEl.appendChild(node);
  CGUI18N.apply(currentLanguage, node);
}

function collectRecipients() {
  return Array.from(recipientsEl.querySelectorAll(".recipient-card")).map(card => ({
    enabled: card.querySelector(".r-enabled").checked,
    name: card.querySelector(".r-name").value.trim(),
    receiverId: card.querySelector(".r-id").value.trim(),
    status: card.querySelector(".r-status").value,
    dateType: card.querySelector(".r-dateType").value,
    dateInterval: card.querySelector(".r-dateInterval").value
  })).filter(r => r.name);
}

async function loadSettings() {
  const data = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const settings = { ...DEFAULT_SETTINGS, ...data };
  currentLanguage = CGUI18N.normalizeLanguage(settings.language || CGUI18N.detect());
  document.getElementById("language").value = currentLanguage;

  for (const key of [
    "enabled",
    "checkOnStartup",
    "intervalEnabled",
    "onlyWithinHours",
    "skipWeekends",
    "notifyOnlyWhenMailExists",
    "notifyOncePerDay",
    "notifyLoginIssue",
    "showBadge",
    "updateCheckEnabled",
    "openTabIfMissing",
    "captureScreenshotOnError"
  ]) {
    document.getElementById(key).checked = Boolean(settings[key]);
  }

  const debuggerGranted = await chrome.permissions.contains({ permissions: ["debugger"] });
  if (settings.captureScreenshotOnError && !debuggerGranted) {
    settings.captureScreenshotOnError = false;
    document.getElementById("captureScreenshotOnError").checked = false;
    await chrome.storage.local.set({ captureScreenshotOnError: false });
  }
  await updateScreenshotPermissionStatus();

  document.getElementById("intervalMinutes").value = Math.max(settings.intervalMinutes || 360, 120);
  document.getElementById("startupDelayMinMinutes").value = settings.startupDelayMinMinutes || 5;
  document.getElementById("startupDelayMaxMinutes").value = settings.startupDelayMaxMinutes || 30;
  document.getElementById("scheduleJitterMaxMinutes").value = settings.scheduleJitterMaxMinutes ?? 30;
  document.getElementById("manualCooldownMinutes").value = settings.manualCooldownMinutes || 5;
  document.getElementById("recipientDelayMinSeconds").value = settings.recipientDelayMinSeconds || 5;
  document.getElementById("recipientDelayMaxSeconds").value = settings.recipientDelayMaxSeconds || 15;
  document.getElementById("activeStartTime").value = settings.activeStartTime || "08:00";
  document.getElementById("activeEndTime").value = settings.activeEndTime || "18:00";

  recipientsEl.innerHTML = "";
  if (settings.recipients && settings.recipients.length) {
    settings.recipients.forEach(addRecipientCard);
  } else {
    addRecipientCard({ enabled: true, name: "", status: "0", dateType: "0", dateInterval: "1" });
  }

  const installedVersion = chrome.runtime.getManifest().version;
  document.getElementById("currentVersion").textContent = installedVersion;
  document.getElementById("updateCheckStatus").textContent = settings.updateCheckStatus || tr("尚未檢查", "Not checked yet");
  document.getElementById("sourceFolderNote").value = settings.sourceFolderNote || "";
  const displayedVersion = settings.updateAvailable && settings.latestVersion
    ? settings.latestVersion
    : installedVersion;
  const downloadable = Boolean(settings.latestVersion)
    && compareVersions(settings.latestVersion, installedVersion) >= 0;
  document.getElementById("downloadUpdate").hidden = !downloadable;
  document.getElementById("downloadUpdate").textContent = CGUI18N.t(currentLanguage, "downloadVersion", { version: displayedVersion });
  CGUI18N.apply(currentLanguage);
  document.getElementById("downloadUpdate").textContent = CGUI18N.t(currentLanguage, "downloadVersion", { version: displayedVersion });
}

async function saveSettings() {
  const interval = Math.max(Number(document.getElementById("intervalMinutes").value || 360), 120);
  const startupDelayMin = Math.max(Number(document.getElementById("startupDelayMinMinutes").value || 5), 1);
  const startupDelayMax = Math.max(Number(document.getElementById("startupDelayMaxMinutes").value || 30), startupDelayMin);
  const scheduleJitterMax = Math.max(Number(document.getElementById("scheduleJitterMaxMinutes").value || 0), 0);
  const manualCooldown = Math.max(Number(document.getElementById("manualCooldownMinutes").value || 5), 1);
  const recipientDelayMin = Math.max(Number(document.getElementById("recipientDelayMinSeconds").value || 5), 1);
  const recipientDelayMax = Math.max(Number(document.getElementById("recipientDelayMaxSeconds").value || 15), recipientDelayMin);
  const settings = {
    enabled: document.getElementById("enabled").checked,
    language: document.getElementById("language").value,
    languageUserSelected: true,
    checkOnStartup: document.getElementById("checkOnStartup").checked,
    intervalEnabled: document.getElementById("intervalEnabled").checked,
    intervalMinutes: interval,
    minAutoIntervalMinutes: 120,
    startupDelayMinMinutes: startupDelayMin,
    startupDelayMaxMinutes: startupDelayMax,
    scheduleJitterMaxMinutes: scheduleJitterMax,
    manualCooldownMinutes: manualCooldown,
    recipientDelayMinSeconds: recipientDelayMin,
    recipientDelayMaxSeconds: recipientDelayMax,
    onlyWithinHours: document.getElementById("onlyWithinHours").checked,
    activeStartTime: document.getElementById("activeStartTime").value || "08:00",
    activeEndTime: document.getElementById("activeEndTime").value || "18:00",
    skipWeekends: document.getElementById("skipWeekends").checked,
    notifyOnlyWhenMailExists: document.getElementById("notifyOnlyWhenMailExists").checked,
    notifyOncePerDay: document.getElementById("notifyOncePerDay").checked,
    notifyLoginIssue: document.getElementById("notifyLoginIssue").checked,
    showBadge: document.getElementById("showBadge").checked,
    updateCheckEnabled: document.getElementById("updateCheckEnabled").checked,
    sourceFolderNote: document.getElementById("sourceFolderNote").value.trim(),
    captureScreenshotOnError: document.getElementById("captureScreenshotOnError").checked,
    openTabIfMissing: document.getElementById("openTabIfMissing").checked,
    recipients: collectRecipients()
  };

  await chrome.storage.local.set(settings);
  chrome.runtime.sendMessage({ type: "CGU_SETTINGS_UPDATED" });
  currentLanguage = CGUI18N.normalizeLanguage(settings.language);
  CGUI18N.apply(currentLanguage);
  showMessage(tr("設定已儲存", "Settings saved"));
}

document.getElementById("addRecipient").addEventListener("click", () => addRecipientCard());
document.getElementById("save").addEventListener("click", saveSettings);

document.getElementById("checkNow").addEventListener("click", async () => {
  await saveSettings();
  chrome.runtime.sendMessage({ type: "CGU_CHECK_NOW" }, res => showMessage(res?.message || "已送出查詢"));
});

document.getElementById("openPostal").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CGU_OPEN_POSTAL" });
});

document.getElementById("openHistory").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("history.html") });
});

document.getElementById("openTutorial").addEventListener("click", () => {
  const filename = currentLanguage === "en" ? "User_Guide.html" : "使用教學.html";
  chrome.tabs.create({ url: chrome.runtime.getURL(filename) });
});

document.getElementById("language").addEventListener("change", async event => {
  currentLanguage = CGUI18N.normalizeLanguage(event.target.value);
  await chrome.storage.local.set({ language: currentLanguage, languageUserSelected: true });
  CGUI18N.apply(currentLanguage);
  await updateScreenshotPermissionStatus();
  chrome.runtime.sendMessage({ type: "CGU_SETTINGS_UPDATED" });
});

document.getElementById("checkUpdate").addEventListener("click", () => {
  showMessage(tr("正在檢查更新…", "Checking for updates…"));
  chrome.runtime.sendMessage({ type: "CGU_CHECK_UPDATE" }, res => {
    showMessage(res?.message || tr("檢查完成", "Update check completed"));
    loadSettings();
  });
});

document.getElementById("downloadUpdate").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CGU_OPEN_UPDATE_DOWNLOAD" });
});

document.getElementById("openUpgradeGuide").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CGU_OPEN_UPGRADE_GUIDE" });
});

document.getElementById("openExtensionsPage").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CGU_OPEN_EXTENSIONS_PAGE" }, res => {
    if (!res?.ok) showMessage(res?.message || tr("請手動開啟 chrome://extensions/", "Open chrome://extensions/ manually."));
  });
});

document.getElementById("openDownloadsFolder").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "CGU_OPEN_DOWNLOADS_FOLDER" });
});

document.getElementById("copySourceFolder").addEventListener("click", async () => {
  const value = document.getElementById("sourceFolderNote").value.trim();
  if (!value) {
    showMessage(tr("尚未記錄程式目錄", "No source folder has been saved."));
    return;
  }
  try {
    await navigator.clipboard.writeText(value);
    showMessage(tr("程式目錄已複製", "Source folder copied."));
  } catch {
    showMessage(tr("無法自動複製，請手動選取路徑", "Unable to copy automatically. Select the path manually."));
  }
});

document.getElementById("captureScreenshotOnError").addEventListener("change", async event => {
  const checkbox = event.target;
  if (checkbox.checked) {
    const granted = await chrome.permissions.request({ permissions: ["debugger"] });
    if (!granted) {
      checkbox.checked = false;
      await chrome.storage.local.set({ captureScreenshotOnError: false });
      document.getElementById("screenshotPermissionStatus").textContent = tr(
        "未授予權限，錯誤截圖維持關閉",
        "Permission was not granted; error screenshots remain disabled"
      );
      return;
    }
    await chrome.storage.local.set({ captureScreenshotOnError: true });
    document.getElementById("screenshotPermissionStatus").textContent = tr(
      "錯誤截圖已啟用；僅在查詢錯誤時擷取長庚查詢頁",
      "Error screenshots enabled for the CGU query page only"
    );
    return;
  }

  await chrome.storage.local.set({
    captureScreenshotOnError: false,
    lastErrorScreenshot: null,
    lastErrorScreenshotStatus: null
  });
  await chrome.permissions.remove({ permissions: ["debugger"] });
  document.getElementById("screenshotPermissionStatus").textContent = tr(
    "錯誤截圖已關閉，既有暫存截圖已清除",
    "Error screenshots disabled and the cached screenshot was cleared"
  );
});

document.getElementById("backupSettings").addEventListener("click", async () => {
  try {
    await saveSettings();
    const data = await chrome.storage.local.get(CGUBackupDiagnostics.SETTING_KEYS);
    const version = chrome.runtime.getManifest().version;
    const backup = CGUBackupDiagnostics.createBackup(data, version);
    const filename = `CGUPostalChecker-settings-v${version}-${CGUBackupDiagnostics.timestampForFilename()}.json`;
    await CGUBackupDiagnostics.downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }),
      filename
    );
    showDiagnosticStatus(tr(`設定備份已下載：${filename}`, `Settings backup downloaded: ${filename}`));
  } catch (err) {
    showDiagnosticStatus(tr(`備份失敗：${err.message || err}`, `Backup failed: ${err.message || err}`), true);
  }
});

document.getElementById("importSettings").addEventListener("click", () => {
  document.getElementById("importSettingsFile").click();
});

document.getElementById("importSettingsFile").addEventListener("change", async event => {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    if (file.size > 2 * 1024 * 1024) throw new Error(tr("備份檔案超過 2 MB", "The backup file is larger than 2 MB"));
    const imported = CGUBackupDiagnostics.parseBackup(await file.text());
    const confirmed = confirm(tr(
      "匯入會覆蓋目前的收件人、排程、通知、語言與其他設定。是否繼續？",
      "Importing replaces the current recipients, schedule, notifications, language, and other settings. Continue?"
    ));
    if (!confirmed) return;

    let screenshotWarning = "";
    if (imported.captureScreenshotOnError) {
      const granted = await chrome.permissions.contains({ permissions: ["debugger"] });
      if (!granted) {
        imported.captureScreenshotOnError = false;
        screenshotWarning = tr(
          "；原備份的錯誤截圖設定未啟用，請在本機重新授權",
          "; screenshot capture was not enabled because permission must be granted again on this device"
        );
      }
    }

    await chrome.storage.local.set(imported);
    await runtimeMessage({ type: "CGU_SETTINGS_UPDATED" });
    await loadSettings();
    showDiagnosticStatus(tr(`設定匯入完成${screenshotWarning}`, `Settings imported${screenshotWarning}`));
  } catch (err) {
    showDiagnosticStatus(tr(`匯入失敗：${err.message || err}`, `Import failed: ${err.message || err}`), true);
  }
});

async function collectDiagnosticReport() {
  const response = await runtimeMessage({ type: "CGU_COLLECT_DIAGNOSTICS" });
  if (!response?.ok || !response.report) {
    throw new Error(response?.message || tr("無法收集診斷資料", "Unable to collect diagnostics"));
  }
  return response.report;
}

async function downloadDiagnostics(asZip) {
  const jsonButton = document.getElementById("downloadDiagnosticsJson");
  const zipButton = document.getElementById("downloadDiagnosticsZip");
  jsonButton.disabled = true;
  zipButton.disabled = true;
  showDiagnosticStatus(tr("正在收集診斷資料…", "Collecting diagnostic data…"));
  try {
    const report = await collectDiagnosticReport();
    const version = chrome.runtime.getManifest().version;
    const stamp = CGUBackupDiagnostics.timestampForFilename();
    const jsonText = JSON.stringify(report, null, 2);

    if (!asZip) {
      const filename = `CGUPostalChecker-diagnostics-v${version}-${stamp}.json`;
      await CGUBackupDiagnostics.downloadBlob(
        new Blob([jsonText], { type: "application/json" }),
        filename
      );
      showDiagnosticStatus(tr(`診斷 JSON 已下載：${filename}`, `Diagnostic JSON downloaded: ${filename}`));
      return;
    }

    const screenshotData = await chrome.storage.local.get(["lastErrorScreenshot"]);
    const screenshot = screenshotData.lastErrorScreenshot;
    const entries = [{ name: "diagnostics.json", data: jsonText }];
    if (screenshot?.dataUrl) {
      entries.push({
        name: screenshot.mimeType === "image/png" ? "last-error-screenshot.png" : "last-error-screenshot.jpg",
        data: CGUBackupDiagnostics.dataUrlToBytes(screenshot.dataUrl)
      });
    }
    const filename = `CGUPostalChecker-diagnostics-v${version}-${stamp}.zip`;
    await CGUBackupDiagnostics.downloadBlob(CGUBackupDiagnostics.createStoredZip(entries), filename);
    showDiagnosticStatus(tr(
      `診斷 ZIP 已下載：${filename}${screenshot?.dataUrl ? "（含錯誤截圖）" : "（無錯誤截圖）"}`,
      `Diagnostic ZIP downloaded: ${filename}${screenshot?.dataUrl ? " (screenshot included)" : " (no screenshot available)"}`
    ));
  } catch (err) {
    showDiagnosticStatus(tr(`診斷報告失敗：${err.message || err}`, `Diagnostic report failed: ${err.message || err}`), true);
  } finally {
    jsonButton.disabled = false;
    zipButton.disabled = false;
  }
}

document.getElementById("downloadDiagnosticsJson").addEventListener("click", () => downloadDiagnostics(false));
document.getElementById("downloadDiagnosticsZip").addEventListener("click", () => downloadDiagnostics(true));

document.getElementById("clearSeen").addEventListener("click", async () => {
  if (!confirm(tr("確定清除已看過郵件紀錄？清除後，既有郵件可能會再次被視為新資料。", "Clear seen-mail records? Existing mail may be treated as new again."))) return;
  await chrome.storage.local.set({ seenKeys: [], lastCountsByRecipient: {}, lastRecipientDetails: {}, lastNotifyDateByRecipient: {} });
  chrome.runtime.sendMessage({ type: "CGU_SETTINGS_UPDATED" });
  showMessage(tr("已清除已看過郵件紀錄", "Seen-mail records cleared"));
});

document.getElementById("clearLogs").addEventListener("click", async () => {
  if (!confirm(tr("確定清除查詢紀錄？", "Clear all query history?"))) return;
  await chrome.storage.local.set({ checkLogs: [] });
  showMessage(tr("已清除查詢紀錄", "Query history cleared"));
});

document.getElementById("resetDailyNotify").addEventListener("click", async () => {
  await chrome.storage.local.set({ lastNotifyDateByRecipient: {} });
  showMessage(tr("已重置今日提醒紀錄", "Today's notification limit was reset"));
});

document.getElementById("testNotification").addEventListener("click", async () => {
  await chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: tr("長庚大學自動查詢郵件", "CGU Postal Mail Checker"),
    message: tr("這是一則測試通知。", "This is a test notification.")
  });
});

loadSettings();
