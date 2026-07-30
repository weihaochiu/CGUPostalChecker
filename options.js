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
    "openTabIfMissing"
  ]) {
    document.getElementById(key).checked = Boolean(settings[key]);
  }

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
