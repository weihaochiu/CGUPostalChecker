importScripts("i18n.js");

const POSTAL_URL = "https://www4.is.cgu.edu.tw/postal/studentletter.aspx";
const POSTAL_URL_PATTERN = "https://www4.is.cgu.edu.tw/postal/*";
const AUTO_CHECK_ALARM = "cgu_postal_auto_check";
const STARTUP_DELAY_ALARM = "cgu_postal_startup_delayed_check";
const UPDATE_CHECK_ALARM = "cgu_postal_update_check";
const UPDATE_MANIFEST_URL = "https://raw.githubusercontent.com/weihaochiu/CGUPostalChecker/main/manifest.json";
const UPDATE_DOWNLOAD_URL = "https://github.com/weihaochiu/CGUPostalChecker/archive/refs/heads/main.zip";
const REPOSITORY_URL = "https://github.com/weihaochiu/CGUPostalChecker";
const UPDATE_NOTIFICATION_ID = "cgu_postal_update_available";
const CONTENT_READY_ATTEMPTS = 5;
const RECIPIENT_QUERY_ATTEMPTS = 3;
const MAX_LOGS = 500;
const MAX_SEEN_KEYS = 3000;
const RUN_TIMEOUT_MS = 3 * 60 * 1000;

const DEFAULT_SETTINGS = {
  enabled: false,
  language: "zh-TW",
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
  openTabIfMissing: true,
  updateCheckEnabled: true,
  updateCheckIntervalMinutes: 1440,
  latestVersion: "",
  updateAvailable: false,
  updateCheckStatus: "尚未檢查",
  lastUpdateCheckAt: 0,
  lastUpdateNotifiedVersion: "",
  latestDownloadUrl: UPDATE_DOWNLOAD_URL,
  dateType: "0",
  dateInterval: "1",
  defaultStatus: "0",
  recipients: [],
  seenKeys: [],
  checkLogs: [],
  lastNotifyDateByRecipient: {},
  lastCountsByRecipient: {},
  lastRecipientDetails: {},
  lastCheckTime: "",
  lastResultText: "尚未查詢",
  lastManualCheckAt: 0,
  lastAutoCheckAt: 0,
  nextAllowedCheckAt: 0,
  lastRunStatus: "never",
  lastRunErrors: [],
  activeRun: null
};

function nowIso() {
  return new Date().toISOString();
}

function textFor(settings, key, replacements = {}) {
  return CGUI18N.t(settings?.language || "zh-TW", key, replacements);
}

function queryErrorText(settings, response = {}) {
  const english = settings?.language === "en";
  const map = {
    QUERY_FIELDS_NOT_FOUND: english
      ? "Query fields were not found. The CGU session may have expired or this is not the postal query page."
      : "找不到查詢欄位，可能尚未登入、登入已失效，或頁面不是郵件查詢頁。",
    TAB_WAIT_TIMEOUT: english
      ? "Timed out while waiting for the postal query page."
      : "等待郵件查詢頁載入逾時。",
    CONTENT_SCRIPT_UNAVAILABLE: english
      ? "The extension could not connect to the postal query page."
      : "外掛無法連線到郵件查詢頁面。"
  };
  return map[response.errorCode] || response.message || (english ? "Unknown query error." : "未知查詢錯誤。");
}

function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function localTimeHHMM(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  const a = Math.ceil(Number(min));
  const b = Math.floor(Number(max));
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return Math.max(0, a || 0);
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function recipientKey(recipient) {
  return recipient.receiverId || recipient.name || "未命名收件人";
}

function normalizeSettingValue(value, fallback = "") {
  if (value === undefined || value === null) return String(fallback ?? "");
  return String(value);
}

function recipientQueryKey(recipient, settings = {}) {
  const base = recipientKey(recipient);
  const status = normalizeSettingValue(recipient.status, settings.defaultStatus ?? "0");
  const dateType = normalizeSettingValue(recipient.dateType, settings.dateType ?? "0");
  const dateInterval = normalizeSettingValue(recipient.dateInterval, settings.dateInterval ?? "1");
  return `${base}::status=${status}::dateType=${dateType}::dateInterval=${dateInterval}`;
}

function statusLabel(status) {
  const normalized = status === undefined || status === null ? "" : String(status);
  return ({
    "": "全部",
    "0": "未領取",
    "1": "已領取",
    "2": "退件"
  })[normalized] || "全部";
}

function versionParts(version) {
  return String(version || "")
    .trim()
    .replace(/^v/i, "")
    .split(/[.-]/)
    .map(part => Number.parseInt(part, 10))
    .map(part => Number.isFinite(part) ? part : 0);
}

function compareVersions(a, b) {
  const left = versionParts(a);
  const right = versionParts(b);
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i += 1) {
    const diff = (left[i] || 0) - (right[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

function formatDateTimeForUi(timestamp) {
  const ts = Number(timestamp || 0);
  if (!ts) return "尚未排定";
  try {
    return new Date(ts).toLocaleString("zh-TW");
  } catch {
    return String(timestamp);
  }
}

function buildActionTitle(settings) {
  const baseTitle = textFor(settings, "appName");
  const runErrors = Array.isArray(settings.lastRunErrors) ? settings.lastRunErrors : [];
  if (runErrors.length) {
    const names = runErrors.map(item => item.recipient || "未知收件人").join("、");
    return settings.language === "en"
      ? `${baseTitle} | Query error: ${names}`
      : `${baseTitle}｜查詢有錯誤：${names}`;
  }

  const recipients = (settings.recipients || []).filter(r => r && r.enabled && r.name);
  if (!recipients.length) {
    return settings.language === "en"
      ? `${baseTitle} | No enabled recipients`
      : `${baseTitle}｜尚未設定啟用中的收件人`;
  }

  const counts = settings.lastCountsByRecipient || {};
  const detail = settings.lastRecipientDetails || {};

  const lines = recipients.map(recipient => {
    const queryKey = recipientQueryKey(recipient, settings);
    const saved = detail[queryKey] || {};
    const count = Number(counts[queryKey] ?? saved.count ?? 0);
    const statusValue = normalizeSettingValue(recipient.status, saved.status ?? settings.defaultStatus ?? "0");
    const label = settings.language === "en"
      ? ({ "": "All", "0": "Uncollected", "1": "Collected", "2": "Returned" })[statusValue] || "All"
      : statusLabel(statusValue);
    return settings.language === "en"
      ? `${recipient.name} ${label}: ${count}`
      : `${recipient.name} ${label} ${count}件`;
  });

  return [baseTitle, ...lines].join(settings.language === "en" ? " | " : "｜");
}

function signatureForRow(recipient, row) {
  const queryKey = recipientQueryKey(recipient);
  const raw = JSON.stringify({ recipient: queryKey, row });
  return `${queryKey}::${hashString(raw)}`;
}

async function getSettings() {
  const data = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  return { ...DEFAULT_SETTINGS, ...data };
}

async function setDefaultsIfNeeded() {
  const data = await chrome.storage.local.get(Object.keys(DEFAULT_SETTINGS));
  const patch = {};
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    if (data[key] === undefined) patch[key] = value;
  }

  // 1.0.6 之後為避免伺服器負擔，自動查詢最低間隔強制為 120 分鐘。
  // 若舊版曾儲存 30 分鐘等較短間隔，升級後自動改成建議值 360 分鐘。
  if (data.intervalMinutes !== undefined && Number(data.intervalMinutes) < 120) {
    patch.intervalMinutes = 360;
  }

  // 只在第一次安裝或語言設定無效時偵測 Chrome / Windows 語言。
  // 繁體中文語系使用 zh-TW，其餘（包含簡體中文）一律使用英文。
  const detectedLanguage = CGUI18N.detect();
  if (!["zh-TW", "en"].includes(data.language)) {
    patch.language = detectedLanguage;
    patch.languageUserSelected = false;
  } else if (data.languageUserSelected === undefined) {
    // 舊版沒有記錄「是否手動選擇」：若現有值與偵測值不同，視為使用者曾手動選擇。
    const likelyManualSelection = data.language !== detectedLanguage;
    patch.languageUserSelected = likelyManualSelection;
    if (!likelyManualSelection) patch.language = detectedLanguage;
  }

  if (Object.keys(patch).length) await chrome.storage.local.set(patch);
}

async function appendLog(entry) {
  const data = await chrome.storage.local.get(["checkLogs"]);
  const logs = data.checkLogs || [];
  logs.unshift({ time: nowIso(), ...entry });
  await chrome.storage.local.set({ checkLogs: logs.slice(0, MAX_LOGS) });
}

async function setBadgeFromCounts(settings) {
  const counts = settings.lastCountsByRecipient || {};
  const recipients = (settings.recipients || []).filter(r => r && r.enabled && r.name);
  const runErrors = Array.isArray(settings.lastRunErrors) ? settings.lastRunErrors : [];

  if (runErrors.length) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#dc3545" });
    await chrome.action.setTitle({ title: buildActionTitle(settings) });
    return;
  }

  let total = 0;
  if (recipients.length) {
    total = recipients.reduce((sum, recipient) => {
      const queryKey = recipientQueryKey(recipient, settings);
      return sum + Number(counts[queryKey] || 0);
    }, 0);
  }

  if (!settings.showBadge) {
    await chrome.action.setBadgeText({ text: "" });
  } else {
    await chrome.action.setBadgeText({ text: total > 0 ? String(total) : "" });
    await chrome.action.setBadgeBackgroundColor({ color: "#0d6efd" });
  }

  await chrome.action.setTitle({ title: buildActionTitle(settings) });
}

function isWithinAllowedTime(settings) {
  const now = new Date();
  const day = now.getDay();
  if (settings.skipWeekends && (day === 0 || day === 6)) return false;
  if (!settings.onlyWithinHours) return true;

  const current = localTimeHHMM(now);
  const start = settings.activeStartTime || "00:00";
  const end = settings.activeEndTime || "23:59";

  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

function effectiveAutoIntervalMinutes(settings) {
  const configured = Number(settings.intervalMinutes || DEFAULT_SETTINGS.intervalMinutes);
  const minimum = Number(settings.minAutoIntervalMinutes || DEFAULT_SETTINGS.minAutoIntervalMinutes);
  return Math.max(configured, minimum, 120);
}

function calculateNextAllowedCheckAt(settings, from = Date.now()) {
  const intervalMin = effectiveAutoIntervalMinutes(settings);
  const jitterMax = Math.max(0, Number(settings.scheduleJitterMaxMinutes ?? DEFAULT_SETTINGS.scheduleJitterMaxMinutes));
  const jitterMin = jitterMax > 0 ? randomInt(0, jitterMax) : 0;
  return from + (intervalMin + jitterMin) * 60 * 1000;
}

async function scheduleAutoAlarm(settings = null, options = {}) {
  const cfg = settings || await getSettings();
  await chrome.alarms.clear(AUTO_CHECK_ALARM);

  if (!cfg.enabled || !cfg.intervalEnabled) return;

  const now = Date.now();
  let nextAllowed = Number(cfg.nextAllowedCheckAt || 0);

  if (options.forceNew || !nextAllowed) {
    nextAllowed = calculateNextAllowedCheckAt(cfg, now);
    await chrome.storage.local.set({ nextAllowedCheckAt: nextAllowed });
  }

  const when = Math.max(nextAllowed, now + 60 * 1000);
  await chrome.alarms.create(AUTO_CHECK_ALARM, { when });
}

async function scheduleRetryAutoAlarm(minutes = 60) {
  const settings = await getSettings();
  if (!settings.enabled || !settings.intervalEnabled) return;
  const when = Date.now() + Math.max(10, Number(minutes || 60)) * 60 * 1000;
  await chrome.alarms.clear(AUTO_CHECK_ALARM);
  await chrome.alarms.create(AUTO_CHECK_ALARM, { when });
  await appendLog({ type: "auto_retry_scheduled", message: `自動查詢暫緩，約 ${minutes} 分鐘後再檢查` });
}

async function scheduleUpdateAlarm(settings = null) {
  const cfg = settings || await getSettings();
  await chrome.alarms.clear(UPDATE_CHECK_ALARM);
  if (!cfg.updateCheckEnabled) return;
  const interval = Math.max(360, Number(cfg.updateCheckIntervalMinutes || 1440));
  await chrome.alarms.create(UPDATE_CHECK_ALARM, {
    delayInMinutes: Math.min(60, interval),
    periodInMinutes: interval
  });
}

async function checkForUpdates(options = {}) {
  const settings = await getSettings();
  const currentVersion = chrome.runtime.getManifest().version;
  if (!settings.updateCheckEnabled && !options.manual) {
    return { ok: false, message: settings.language === "en" ? "Automatic update checks are disabled." : "自動檢查更新已關閉。" };
  }

  try {
    const response = await fetch(`${UPDATE_MANIFEST_URL}?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const remoteManifest = await response.json();
    const latestVersion = String(remoteManifest.version || "").trim();
    if (!/^\d+(?:\.\d+){1,3}$/.test(latestVersion)) {
      throw new Error("Invalid remote version");
    }

    const updateAvailable = compareVersions(latestVersion, currentVersion) > 0;
    const updateCheckStatus = updateAvailable
      ? textFor(settings, "updateAvailable", { version: latestVersion })
      : textFor(settings, "latestVersion");

    await chrome.storage.local.set({
      latestVersion,
      updateAvailable,
      updateCheckStatus,
      lastUpdateCheckAt: Date.now(),
      latestDownloadUrl: UPDATE_DOWNLOAD_URL
    });

    if (updateAvailable && settings.lastUpdateNotifiedVersion !== latestVersion) {
      await chrome.notifications.create(UPDATE_NOTIFICATION_ID, {
        type: "basic",
        iconUrl: "icons/icon128.png",
        title: textFor(settings, "appName"),
        message: textFor(settings, "updateAvailable", { version: latestVersion }),
        buttons: [
          { title: textFor(settings, "downloadLatest") },
          { title: textFor(settings, "upgradeGuide") }
        ],
        requireInteraction: true
      });
      await chrome.storage.local.set({ lastUpdateNotifiedVersion: latestVersion });
    }

    return {
      ok: true,
      currentVersion,
      latestVersion,
      updateAvailable,
      downloadUrl: UPDATE_DOWNLOAD_URL,
      message: updateCheckStatus
    };
  } catch (err) {
    const details = String(err && err.message ? err.message : err);
    const message = settings.language === "en"
      ? `Unable to check for updates: ${details}`
      : `無法檢查更新：${details}`;
    await chrome.storage.local.set({
      updateCheckStatus: message,
      lastUpdateCheckAt: Date.now()
    });
    return { ok: false, currentVersion, message };
  }
}

async function downloadLatestVersion() {
  const settings = await getSettings();
  const currentVersion = chrome.runtime.getManifest().version;
  const updateResult = await checkForUpdates({ manual: true });
  const latestVersion = String(updateResult.latestVersion || "").trim();

  if (!updateResult.ok || !latestVersion) {
    return {
      ok: false,
      message: updateResult.message || (settings.language === "en"
        ? "Unable to determine the latest GitHub version."
        : "無法確認 GitHub 最新版本。")
    };
  }

  if (compareVersions(latestVersion, currentVersion) < 0) {
    return {
      ok: false,
      message: settings.language === "en"
        ? `GitHub v${latestVersion} is older than installed v${currentVersion}; download cancelled.`
        : `GitHub v${latestVersion} 舊於已安裝的 v${currentVersion}，已取消下載。`
    };
  }

  const safeVersion = /^\d+(?:\.\d+){1,3}$/.test(latestVersion)
    ? latestVersion
    : latestVersion;
  const filename = `CGUPostalChecker-v${safeVersion}.zip`;

  try {
    const downloadId = await chrome.downloads.download({
      url: UPDATE_DOWNLOAD_URL,
      filename,
      conflictAction: "uniquify",
      saveAs: true
    });
    return {
      ok: true,
      downloadId,
      filename,
      message: settings.language === "en"
        ? `Downloading ${filename}`
        : `正在下載 ${filename}`
    };
  } catch (err) {
    await chrome.tabs.create({ url: UPDATE_DOWNLOAD_URL, active: true });
    return {
      ok: false,
      filename,
      message: settings.language === "en"
        ? `Chrome could not assign the versioned filename. The GitHub download page was opened instead.`
        : "Chrome 無法指定含版本號的檔名，已改為開啟 GitHub 下載頁面。"
    };
  }
}

async function clearRunIfStale() {
  const data = await chrome.storage.local.get(["activeRun"]);
  const activeRun = data.activeRun;
  if (!activeRun || !activeRun.startedAtMs) return false;
  const age = Date.now() - Number(activeRun.startedAtMs || 0);
  if (age <= RUN_TIMEOUT_MS) return false;

  await chrome.storage.local.set({ activeRun: null, pendingParse: null });
  await appendLog({ type: "stale_run_cleared", message: "前一次查詢超過 3 分鐘未完成，已自動解除查詢鎖" });
  return true;
}

async function hasActiveRun() {
  await clearRunIfStale();
  const data = await chrome.storage.local.get(["activeRun"]);
  return Boolean(data.activeRun && data.activeRun.status && data.activeRun.status !== "done");
}

async function canRunManual(settings) {
  const now = Date.now();
  const cooldownMs = Math.max(1, Number(settings.manualCooldownMinutes || DEFAULT_SETTINGS.manualCooldownMinutes)) * 60 * 1000;
  const last = Number(settings.lastManualCheckAt || 0);
  if (last && now - last < cooldownMs) {
    const remainSec = Math.ceil((cooldownMs - (now - last)) / 1000);
    const remainMin = Math.ceil(remainSec / 60);
    return { ok: false, message: `剛剛已手動查詢過，請約 ${remainMin} 分鐘後再試。` };
  }
  return { ok: true };
}

async function canRunAuto(settings, reason) {
  if (!settings.enabled) return { ok: false, message: "自動監控尚未啟用" };
  if (!isWithinAllowedTime(settings)) return { ok: false, message: "目前不在允許查詢時段" };

  const now = Date.now();
  const nextAllowed = Number(settings.nextAllowedCheckAt || 0);
  if (nextAllowed && now < nextAllowed) {
    return { ok: false, message: `尚未到下次允許查詢時間：${formatDateTimeForUi(nextAllowed)}` };
  }
  return { ok: true };
}

async function scheduleStartupDelayedCheck(settings) {
  await chrome.alarms.clear(STARTUP_DELAY_ALARM);
  if (!settings.enabled || !settings.checkOnStartup) return;

  const canAuto = await canRunAuto(settings, "startup");
  if (!canAuto.ok) {
    await appendLog({ type: "startup_skipped", message: canAuto.message });
    await scheduleAutoAlarm(settings);
    return;
  }

  const minDelay = Math.max(1, Number(settings.startupDelayMinMinutes || DEFAULT_SETTINGS.startupDelayMinMinutes));
  const maxDelay = Math.max(minDelay, Number(settings.startupDelayMaxMinutes || DEFAULT_SETTINGS.startupDelayMaxMinutes));
  const delayMin = randomInt(minDelay, maxDelay);
  await chrome.alarms.create(STARTUP_DELAY_ALARM, { when: Date.now() + delayMin * 60 * 1000 });
  await appendLog({ type: "startup_delayed", message: `Chrome 啟動後不立即查詢，已隨機延遲約 ${delayMin} 分鐘` });
}

async function markRunStartedByReason(reason, settings) {
  const now = Date.now();
  const patch = {};
  if (["manual", "start_button"].includes(reason)) {
    patch.lastManualCheckAt = now;
  }
  if (["interval", "startup", "startup_delayed"].includes(reason)) {
    patch.lastAutoCheckAt = now;
  }

  // 不論自動或手動，只要真的開始查詢，都重新排定下一次自動允許時間，避免手動剛查完又立刻自動查。
  const nextAllowed = calculateNextAllowedCheckAt(settings, now);
  patch.nextAllowedCheckAt = nextAllowed;
  await chrome.storage.local.set(patch);
  const updated = { ...settings, ...patch };
  await scheduleAutoAlarm(updated);
}

async function findOrOpenPostalTab(settings) {
  const tabs = await chrome.tabs.query({ url: POSTAL_URL_PATTERN });
  const preferred = tabs.find(t => t.url && t.url.startsWith(POSTAL_URL)) || tabs[0];
  if (preferred) return preferred;

  if (!settings.openTabIfMissing) return null;
  return await chrome.tabs.create({ url: POSTAL_URL, active: false });
}

async function waitForTabComplete(tabId, timeoutMs = 15000) {
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  if (tab && tab.status === "complete") {
    await sleep(300);
    return true;
  }

  return await new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(false);
    }, timeoutMs);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status === "complete") {
        if (done) return;
        done = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        setTimeout(() => resolve(true), 300);
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function ensureContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return { ok: true };
  } catch (err) {
    console.warn("executeScript warning", err);
    return {
      ok: false,
      errorCode: "CONTENT_SCRIPT_UNAVAILABLE",
      message: `無法載入查詢程式：${String(err && err.message ? err.message : err)}`
    };
  }
}

async function sendToTab(tabId, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    console.warn("sendToTab failed", err);
    return {
      ok: false,
      transportError: true,
      errorCode: "CONTENT_SCRIPT_UNAVAILABLE",
      message: `無法連線到查詢頁面：${String(err && err.message ? err.message : err)}`
    };
  }
}

async function waitForContentScriptReady(tabId) {
  let lastError = "查詢頁面的程式尚未準備完成";
  let lastErrorCode = "CONTENT_SCRIPT_UNAVAILABLE";
  for (let attempt = 1; attempt <= CONTENT_READY_ATTEMPTS; attempt += 1) {
    const tabReady = await waitForTabComplete(tabId, 15000);
    if (!tabReady) {
      lastError = "等待查詢頁面載入逾時";
      lastErrorCode = "TAB_WAIT_TIMEOUT";
    }

    const injected = await ensureContentScript(tabId);
    if (!injected.ok) {
      lastError = injected.message;
      lastErrorCode = injected.errorCode || "CONTENT_SCRIPT_UNAVAILABLE";
    }

    const ping = await sendToTab(tabId, { type: "CGU_PING" });
    if (ping && ping.ok) return { ok: true, attempt };

    if (ping?.message) {
      lastError = ping.message;
      lastErrorCode = ping.errorCode || lastErrorCode;
    }
    await sleep(400 * attempt);
  }
  return { ok: false, errorCode: lastErrorCode, message: lastError };
}

async function notify(title, message) {
  await chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message
  });
}

async function startRun(reason = "manual") {
  const settings = await getSettings();

  if (await hasActiveRun()) {
    await appendLog({ type: "skipped", reason, message: "已有查詢流程進行中，略過本次查詢" });
    return { ok: false, message: "已有查詢流程進行中，請稍後再試" };
  }

  const isManualReason = ["manual", "start_button"].includes(reason);
  const isAutoReason = ["interval", "startup", "startup_delayed"].includes(reason);

  if (isManualReason) {
    const manualAllowed = await canRunManual(settings);
    if (!manualAllowed.ok) {
      await appendLog({ type: "skipped", reason, message: manualAllowed.message });
      return manualAllowed;
    }
  }

  if (isAutoReason) {
    const autoAllowed = await canRunAuto(settings, reason);
    if (!autoAllowed.ok) {
      await appendLog({ type: "skipped", reason, message: autoAllowed.message });
      await scheduleAutoAlarm(settings);
      return autoAllowed;
    }
  } else if (!isWithinAllowedTime(settings)) {
    await appendLog({ type: "skipped", reason, message: "目前不在允許查詢時段" });
    return { ok: false, message: "目前不在允許查詢時段" };
  }

  const recipients = (settings.recipients || []).filter(r => r && r.enabled && r.name);
  if (!recipients.length) {
    await appendLog({ type: "skipped", reason, message: "尚未設定啟用中的收件人" });
    return { ok: false, message: "尚未設定啟用中的收件人" };
  }

  const runId = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const activeRun = {
    runId,
    tabId: null,
    recipients,
    index: 0,
    reason,
    startedAt: nowIso(),
    startedAtMs: Date.now(),
    status: "preparing",
    failures: []
  };
  await chrome.storage.local.set({ activeRun });

  try {
    await markRunStartedByReason(reason, settings);

    const tab = await findOrOpenPostalTab(settings);
    if (!tab || !tab.id) {
      await chrome.storage.local.set({ activeRun: null });
      await appendLog({ type: "error", reason, message: "找不到郵件查詢頁面" });
      return { ok: false, message: "找不到郵件查詢頁面" };
    }

    activeRun.tabId = tab.id;
    activeRun.status = "running";
    await chrome.storage.local.set({ activeRun });

    const contentReady = await waitForContentScriptReady(tab.id);
    if (!contentReady.ok) {
      const message = queryErrorText(settings, contentReady);
      activeRun.failures = recipients.map(recipient => ({ recipient: recipient.name, message }));
      await chrome.storage.local.set({ activeRun });
      await appendLog({ type: "error", reason, message });
      await finishRun(activeRun, "error");
      return { ok: false, message };
    }

    await appendLog({ type: "run_started", reason, message: `開始查詢 ${recipients.length} 位收件人` });
    await runRecipient(tab.id, activeRun, 0);
    return { ok: true, message: "已開始查詢" };
  } catch (err) {
    await chrome.storage.local.set({ activeRun: null, pendingParse: null });
    await appendLog({ type: "error", reason, message: String(err && err.message ? err.message : err) });
    return { ok: false, message: String(err && err.message ? err.message : err) };
  }
}

async function runRecipient(tabId, activeRun, index) {
  const recipient = activeRun.recipients[index];
  if (!recipient) {
    await finishRun(activeRun, "done");
    return;
  }

  activeRun.index = index;
  activeRun.status = "filling";
  activeRun.currentRecipient = recipient;
  activeRun.startedAtMs = Number(activeRun.startedAtMs || Date.now());
  activeRun.currentRecipientStartedAtMs = Date.now();
  await chrome.storage.local.set({ activeRun });

  let response = null;
  for (let attempt = 1; attempt <= RECIPIENT_QUERY_ATTEMPTS; attempt += 1) {
    const ready = await waitForContentScriptReady(tabId);
    if (!ready.ok) {
      response = { ok: false, errorCode: ready.errorCode, message: ready.message };
    } else {
      response = await sendToTab(tabId, {
        type: "CGU_RUN_RECIPIENT",
        runId: activeRun.runId,
        tabId,
        index,
        recipient,
        defaults: {
          dateType: activeRun.dateType,
          dateInterval: activeRun.dateInterval,
          defaultStatus: activeRun.defaultStatus
        }
      });
    }

    if (response && response.ok) return;

    await appendLog({
      type: "recipient_retry",
      recipient: recipient.name,
      attempt,
      message: `第 ${attempt} 次操作失敗${attempt < RECIPIENT_QUERY_ATTEMPTS ? "，準備重試" : ""}：${response?.message || "未知錯誤"}`
    });
    if (attempt < RECIPIENT_QUERY_ATTEMPTS) await sleep(700 * attempt);
  }

  if (!response || !response.ok) {
    const currentSettings = await getSettings();
    const errorMessage = queryErrorText(currentSettings, response || {});
    await recordRecipientFailure(activeRun.runId, recipient, errorMessage);
    await appendLog({
      type: "error",
      recipient: recipient.name,
      message: errorMessage
    });
    await handleLoginOrTabIssue(recipient, errorMessage);
    await continueNext(activeRun.runId, index);
  }
}

async function recordRecipientFailure(runId, recipient, message) {
  const settings = await getSettings();
  const activeRun = settings.activeRun;
  if (!activeRun || activeRun.runId !== runId) return;

  const failures = Array.isArray(activeRun.failures) ? activeRun.failures : [];
  failures.push({ recipient: recipient.name, message, time: nowIso() });
  activeRun.failures = failures;

  const queryKey = recipientQueryKey(recipient, settings);
  const previous = (settings.lastRecipientDetails || {})[queryKey] || {};
  const lastRecipientDetails = {
    ...(settings.lastRecipientDetails || {}),
    [queryKey]: {
      ...previous,
      name: recipient.name,
      receiverId: recipient.receiverId || "",
      status: normalizeSettingValue(recipient.status, settings.defaultStatus ?? "0"),
      dateType: normalizeSettingValue(recipient.dateType, settings.dateType ?? "0"),
      dateInterval: normalizeSettingValue(recipient.dateInterval, settings.dateInterval ?? "1"),
      queryStatus: "error",
      errorMessage: message,
      failedAt: nowIso()
    }
  };

  await chrome.storage.local.set({
    activeRun,
    lastRecipientDetails,
    lastRunStatus: "error",
    lastRunErrors: failures
  });
  await setBadgeFromCounts({ ...settings, activeRun, lastRecipientDetails, lastRunErrors: failures });
}

async function handleLoginOrTabIssue(recipient, message) {
  const settings = await getSettings();
  if (settings.notifyLoginIssue) {
    const today = localDateKey();
    const key = `login_issue_${today}`;
    const data = await chrome.storage.local.get([key]);
    if (!data[key]) {
      await chrome.storage.local.set({ [key]: true });
      const notice = settings.language === "en"
        ? `Sign in again or open the postal query page: ${message}`
        : `需要重新登入或開啟查詢頁面：${message}`;
      await notify(textFor(settings, "appName"), notice);
    }
  }
}

async function finishRun(activeRun, status = "done") {
  const settings = await getSettings();
  const storedRun = settings.activeRun && settings.activeRun.runId === activeRun.runId
    ? settings.activeRun
    : activeRun;
  const failures = Array.isArray(storedRun.failures) ? storedRun.failures : [];
  const finalStatus = failures.length ? "error" : status;
  const resultText = failures.length
    ? settings.language === "en"
      ? `Query error: ${failures.length} recipient(s) failed`
      : `查詢有錯誤：${failures.length} 位收件人未成功`
    : finalStatus === "done"
      ? settings.language === "en" ? "Query completed" : "查詢完成"
      : finalStatus;

  await chrome.storage.local.set({
    activeRun: null,
    pendingParse: null,
    lastCheckTime: nowIso(),
    lastResultText: resultText,
    lastRunStatus: finalStatus,
    lastRunErrors: failures
  });
  const updated = await getSettings();
  await setBadgeFromCounts(updated);
  await scheduleAutoAlarm(updated);
  await appendLog({
    type: failures.length ? "run_finished_with_errors" : "run_finished",
    errorCount: failures.length,
    errors: failures,
    message: resultText
  });
}

async function continueNext(runId, currentIndex) {
  const data = await chrome.storage.local.get(["activeRun"]);
  const activeRun = data.activeRun;
  if (!activeRun || activeRun.runId !== runId) return;

  const nextIndex = currentIndex + 1;
  if (nextIndex >= activeRun.recipients.length) {
    await finishRun(activeRun, "done");
    return;
  }

  const settings = await getSettings();
  const minSec = Math.max(1, Number(settings.recipientDelayMinSeconds || DEFAULT_SETTINGS.recipientDelayMinSeconds));
  const maxSec = Math.max(minSec, Number(settings.recipientDelayMaxSeconds || DEFAULT_SETTINGS.recipientDelayMaxSeconds));
  const delaySec = randomInt(minSec, maxSec);
  await appendLog({ type: "recipient_delay", message: `下一位收件人查詢將延遲約 ${delaySec} 秒` });
  await sleep(delaySec * 1000);

  const fresh = (await chrome.storage.local.get(["activeRun"])).activeRun;
  if (!fresh || fresh.runId !== runId) return;
  await runRecipient(fresh.tabId, fresh, nextIndex);
}

async function processResult(message) {
  const { runId, tabId, index, recipient, rows, pageMessage } = message;
  const data = await chrome.storage.local.get(["activeRun"]);
  const activeRun = data.activeRun;
  if (!activeRun || activeRun.runId !== runId) return;
  if (activeRun.tabId && tabId && activeRun.tabId !== tabId) {
    await appendLog({ type: "ignored_result", message: "收到非本次查詢分頁的結果，已忽略" });
    return;
  }
  if (Number(activeRun.index) !== Number(index)) {
    await appendLog({ type: "ignored_result", message: "收到非目前收件人的結果，已忽略" });
    return;
  }

  const settings = await getSettings();
  const rowList = Array.isArray(rows) ? rows : [];
  const seen = new Set(settings.seenKeys || []);
  const allKeys = rowList.map(row => signatureForRow(recipient, row));
  const newRows = rowList.filter((row, i) => !seen.has(allKeys[i]));

  for (const key of allKeys) seen.add(key);
  const seenKeys = Array.from(seen).slice(-MAX_SEEN_KEYS);

  const queryKey = recipientQueryKey(recipient, settings);
  const statusValue = normalizeSettingValue(recipient.status, settings.defaultStatus ?? "0");
  const lastCountsByRecipient = settings.lastCountsByRecipient || {};
  lastCountsByRecipient[queryKey] = rowList.length;

  const lastRecipientDetails = settings.lastRecipientDetails || {};
  lastRecipientDetails[queryKey] = {
    name: recipient.name,
    receiverId: recipient.receiverId || "",
    status: statusValue,
    statusLabel: statusLabel(statusValue),
    dateType: normalizeSettingValue(recipient.dateType, settings.dateType ?? "0"),
    dateInterval: normalizeSettingValue(recipient.dateInterval, settings.dateInterval ?? "1"),
    count: rowList.length,
    checkedAt: nowIso(),
    queryStatus: "success",
    errorMessage: "",
    failedAt: ""
  };

  await chrome.storage.local.set({
    seenKeys,
    lastCountsByRecipient,
    lastRecipientDetails,
    lastCheckTime: nowIso(),
    lastResultText: settings.language === "en"
      ? `${recipient.name}: ${rowList.length} item(s), ${newRows.length} new`
      : `${recipient.name}：${rowList.length} 筆，新增 ${newRows.length} 筆`
  });

  await appendLog({
    type: rowList.length ? "mail_found" : "no_mail",
    recipient: recipient.name,
    status: statusLabel(statusValue),
    count: rowList.length,
    newCount: newRows.length,
    pageMessage: pageMessage || "",
    rows: rowList.slice(0, 20),
    message: rowList.length ? `查到 ${rowList.length} 筆，新增 ${newRows.length} 筆` : "沒有查到郵件"
  });

  await maybeNotify(settings, recipient, rowList, newRows);

  const updatedSettings = await getSettings();
  await setBadgeFromCounts(updatedSettings);
  await continueNext(runId, index);
}

async function maybeNotify(settings, recipient, rows, newRows) {
  if (!rows || rows.length === 0) return;
  if (!settings.notifyOnlyWhenMailExists) return;

  const today = localDateKey();
  const key = recipientQueryKey(recipient, settings);
  const lastNotifyDateByRecipient = settings.lastNotifyDateByRecipient || {};

  if (settings.notifyOncePerDay && lastNotifyDateByRecipient[key] === today) {
    await appendLog({
      type: "silent_due_to_daily_limit",
      recipient: recipient.name,
      count: rows.length,
      newCount: newRows.length,
      message: "今天已提醒過，因此本次不再跳通知"
    });
    return;
  }

  if (!settings.notifyOncePerDay && newRows.length === 0) return;

  lastNotifyDateByRecipient[key] = today;
  await chrome.storage.local.set({ lastNotifyDateByRecipient });

  const previewRows = (newRows.length ? newRows : rows).slice(0, 3);
  const preview = previewRows.map(row => Object.values(row).join(" / ")).join("\n");
  const newPart = newRows.length
    ? settings.language === "en" ? `, including ${newRows.length} new` : `，其中新增 ${newRows.length} 筆`
    : "";
  const message = settings.language === "en"
    ? `${recipient.name} currently has ${rows.length} mail item(s)${newPart}\n${preview}`.slice(0, 900)
    : `${recipient.name} 目前有 ${rows.length} 筆郵件${newPart}\n${preview}`.slice(0, 900);
  await notify(textFor(settings, "appName"), message);
}

chrome.runtime.onInstalled.addListener(async () => {
  await setDefaultsIfNeeded();
  const settings = await getSettings();
  await scheduleAutoAlarm(settings);
  await scheduleUpdateAlarm(settings);
  await setBadgeFromCounts(settings);
  await checkForUpdates();
});

chrome.runtime.onStartup.addListener(async () => {
  await setDefaultsIfNeeded();
  const settings = await getSettings();
  await setBadgeFromCounts(settings);
  await scheduleAutoAlarm(settings);
  await scheduleUpdateAlarm(settings);
  await scheduleStartupDelayedCheck(settings);
  if (settings.updateCheckEnabled && Date.now() - Number(settings.lastUpdateCheckAt || 0) > 24 * 60 * 60 * 1000) {
    await checkForUpdates();
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === AUTO_CHECK_ALARM) {
    await startRun("interval");
    return;
  }
  if (alarm.name === STARTUP_DELAY_ALARM) {
    await startRun("startup_delayed");
    return;
  }
  if (alarm.name === UPDATE_CHECK_ALARM) {
    await checkForUpdates();
  }
});

chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId !== UPDATE_NOTIFICATION_ID) return;
  if (buttonIndex === 0) {
    await downloadLatestVersion();
  } else if (buttonIndex === 1) {
    await chrome.tabs.create({ url: chrome.runtime.getURL("升級教學.html"), active: true });
  }
});

chrome.notifications.onClicked.addListener(async notificationId => {
  if (notificationId === UPDATE_NOTIFICATION_ID) {
    await chrome.tabs.create({ url: REPOSITORY_URL, active: true });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "CGU_START_MONITOR") {
      await chrome.storage.local.set({ enabled: true });
      const settings = await getSettings();
      await scheduleAutoAlarm(settings);
      sendResponse(await startRun("start_button"));
      return;
    }

    if (message.type === "CGU_STOP_MONITOR") {
      await chrome.storage.local.set({ enabled: false, activeRun: null, pendingParse: null });
      await chrome.alarms.clear(AUTO_CHECK_ALARM);
      await chrome.alarms.clear(STARTUP_DELAY_ALARM);
      const stoppedSettings = await getSettings();
      await setBadgeFromCounts(stoppedSettings);
      await appendLog({ type: "monitor_stopped", message: "已停止監控" });
      sendResponse({ ok: true, message: "已停止監控" });
      return;
    }

    if (message.type === "CGU_CHECK_NOW") {
      sendResponse(await startRun("manual"));
      return;
    }

    if (message.type === "CGU_OPEN_OPTIONS") {
      await chrome.runtime.openOptionsPage();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CGU_OPEN_POSTAL") {
      await chrome.tabs.create({ url: POSTAL_URL, active: true });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CGU_OPEN_TUTORIAL") {
      await chrome.tabs.create({ url: chrome.runtime.getURL("使用教學.html"), active: true });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CGU_OPEN_UPGRADE_GUIDE") {
      await chrome.tabs.create({ url: chrome.runtime.getURL("升級教學.html"), active: true });
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CGU_OPEN_UPDATE_DOWNLOAD") {
      sendResponse(await downloadLatestVersion());
      return;
    }

    if (message.type === "CGU_OPEN_EXTENSIONS_PAGE") {
      try {
        await chrome.tabs.create({ url: "chrome://extensions/", active: true });
        sendResponse({ ok: true });
      } catch (err) {
        const settings = await getSettings();
        sendResponse({
          ok: false,
          message: settings.language === "en"
            ? "Chrome blocked this internal page. Open chrome://extensions/ manually."
            : "Chrome 阻擋開啟內部頁面，請手動輸入 chrome://extensions/。"
        });
      }
      return;
    }

    if (message.type === "CGU_OPEN_DOWNLOADS_FOLDER") {
      chrome.downloads.showDefaultFolder();
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CGU_CHECK_UPDATE") {
      sendResponse(await checkForUpdates({ manual: true }));
      return;
    }

    if (message.type === "CGU_SETTINGS_UPDATED") {
      const settings = await getSettings();
      const interval = effectiveAutoIntervalMinutes(settings);
      const patch = { intervalMinutes: interval };
      if (settings.enabled && settings.intervalEnabled && !settings.nextAllowedCheckAt) {
        patch.nextAllowedCheckAt = calculateNextAllowedCheckAt({ ...settings, intervalMinutes: interval });
      }
      if (Object.keys(patch).length) await chrome.storage.local.set(patch);
      const updated = await getSettings();
      await scheduleAutoAlarm(updated);
      await scheduleUpdateAlarm(updated);
      await setBadgeFromCounts(updated);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CGU_QUERY_RESULT") {
      await processResult(message);
      sendResponse({ ok: true });
      return;
    }

    if (message.type === "CGU_LOGIN_REQUIRED") {
      const recipient = message.recipient || {};
      const currentSettings = await getSettings();
      const errorMessage = queryErrorText(currentSettings, message);
      await recordRecipientFailure(message.runId, recipient, errorMessage);
      await appendLog({ type: "error", recipient: recipient.name || "", message: errorMessage });
      await handleLoginOrTabIssue(recipient, errorMessage);
      await continueNext(message.runId, message.index || 0);
      sendResponse({ ok: true });
      return;
    }

    sendResponse({ ok: false, message: "Unknown message" });
  })().catch(async (err) => {
    console.error(err);
    await appendLog({ type: "error", message: String(err && err.message ? err.message : err) });
    sendResponse({ ok: false, message: String(err && err.message ? err.message : err) });
  });

  return true;
});
