const msgEl = document.getElementById("message");
let currentLanguage = "zh-TW";

const POPUP_STORAGE_KEYS = [
  "enabled",
  "recipients",
  "defaultStatus",
  "dateType",
  "dateInterval",
  "lastCountsByRecipient",
  "lastRecipientDetails",
  "lastCheckTime",
  "nextAllowedCheckAt",
  "lastResultText",
  "activeRun",
  "language",
  "lastRunStatus",
  "lastRunErrors",
  "latestVersion",
  "updateAvailable",
  "updateCheckStatus"
];

function tr(key, replacements = {}) {
  return CGUI18N.t(currentLanguage, key, replacements);
}

function showMessage(text) {
  msgEl.textContent = text;
}

function formatTime(value, fallback = null) {
  const resolvedFallback = fallback ?? tr("neverChecked");
  if (!value) return resolvedFallback;
  const timestamp = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(timestamp)) return String(value);
  try {
    return new Date(timestamp).toLocaleString("zh-TW");
  } catch {
    return String(value);
  }
}

function normalizeSettingValue(value, fallback = "") {
  if (value === undefined || value === null) return String(fallback ?? "");
  return String(value);
}

function recipientBaseKey(recipient) {
  return recipient?.receiverId || recipient?.name || "未命名收件人";
}

function recipientQueryKey(recipient, settings = {}) {
  const base = recipientBaseKey(recipient);
  const status = normalizeSettingValue(recipient?.status, settings.defaultStatus ?? "0");
  const dateType = normalizeSettingValue(recipient?.dateType, settings.dateType ?? "0");
  const dateInterval = normalizeSettingValue(recipient?.dateInterval, settings.dateInterval ?? "1");
  return `${base}::status=${status}::dateType=${dateType}::dateInterval=${dateInterval}`;
}

function statusLabel(status) {
  const normalized = normalizeSettingValue(status, "");
  return ({
    "": tr("all"),
    "0": tr("unread"),
    "1": tr("received"),
    "2": tr("returned")
  })[normalized] || tr("all");
}

function dateTypeLabel(value) {
  return normalizeSettingValue(value, "0") === "1" ? tr("returnDate") : tr("receiveDate");
}

function dateIntervalLabel(value) {
  const normalized = normalizeSettingValue(value, "1");
  return ({ "1": tr("oneMonth"), "3": tr("threeMonths"), "6": tr("sixMonths") })[normalized]
    || (currentLanguage === "en" ? `${normalized} months` : `${normalized} 個月`);
}

function isSameRecipientQuery(a, b, settings) {
  if (!a || !b) return false;
  return recipientQueryKey(a, settings) === recipientQueryKey(b, settings);
}

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}

function renderRecipientResults(data, recipients) {
  const container = document.getElementById("recipientResults");
  const totalEl = document.getElementById("resultTotal");
  container.replaceChildren();

  if (!recipients.length) {
    container.appendChild(createTextElement("div", "recipient-result-empty", tr("noRecipient")));
    totalEl.textContent = tr("total", { count: 0 });
    return;
  }

  const counts = data.lastCountsByRecipient || {};
  const details = data.lastRecipientDetails || {};
  const activeRecipient = data.activeRun?.currentRecipient || null;
  let total = 0;

  for (const recipient of recipients) {
    const queryKey = recipientQueryKey(recipient, data);
    const detail = details[queryKey] || {};
    const hasStoredCount = Object.prototype.hasOwnProperty.call(counts, queryKey)
      || Object.prototype.hasOwnProperty.call(detail, "count");
    const count = hasStoredCount ? Number(counts[queryKey] ?? detail.count ?? 0) : null;
    if (Number.isFinite(count)) total += count;

    const statusValue = normalizeSettingValue(recipient.status, detail.status ?? data.defaultStatus ?? "0");
    const dateTypeValue = normalizeSettingValue(recipient.dateType, detail.dateType ?? data.dateType ?? "0");
    const dateIntervalValue = normalizeSettingValue(recipient.dateInterval, detail.dateInterval ?? data.dateInterval ?? "1");
    const checking = isSameRecipientQuery(activeRecipient, recipient, data);

    const card = document.createElement("article");
    const failed = detail.queryStatus === "error";
    card.className = `popup-recipient-result${checking ? " checking" : ""}${Number(count) > 0 ? " has-mail" : ""}${failed ? " has-error" : ""}`;

    const main = document.createElement("div");
    main.className = "popup-recipient-main";

    const identity = document.createElement("div");
    identity.className = "popup-recipient-identity";
    identity.appendChild(createTextElement("div", "popup-recipient-name", recipient.name));
    identity.appendChild(createTextElement(
      "div",
      "popup-recipient-condition",
      `${statusLabel(statusValue)}｜${dateTypeLabel(dateTypeValue)}｜${dateIntervalLabel(dateIntervalValue)}`
    ));

    const countBox = document.createElement("div");
    countBox.className = "popup-recipient-count";
    countBox.appendChild(createTextElement("strong", "", failed ? "!" : count === null ? "—" : String(count)));
    if (!failed) countBox.appendChild(createTextElement("span", "", tr("pieces")));

    main.append(identity, countBox);
    card.appendChild(main);

    const meta = document.createElement("div");
    meta.className = "popup-recipient-meta";
    if (checking) {
      meta.appendChild(createTextElement("span", "popup-querying-label", tr("checking")));
    } else if (failed) {
      meta.className += " error-text";
      meta.textContent = `${tr("failedAt", { time: formatTime(detail.failedAt) })}｜${detail.errorMessage || tr("queryError")}`;
    } else if (detail.checkedAt) {
      meta.textContent = tr("lastCheckedAt", { time: formatTime(detail.checkedAt) });
    } else {
      meta.textContent = tr("noConditionResult");
    }
    card.appendChild(meta);

    container.appendChild(card);
  }

  totalEl.textContent = tr("total", { count: total });
}

async function loadStatus() {
  const data = await chrome.storage.local.get(POPUP_STORAGE_KEYS);
  currentLanguage = CGUI18N.normalizeLanguage(data.language || CGUI18N.detect());
  CGUI18N.apply(currentLanguage);

  const enabledBadge = document.getElementById("enabledBadge");
  const hasErrors = Array.isArray(data.lastRunErrors) && data.lastRunErrors.length > 0;
  if (hasErrors && !data.activeRun) {
    enabledBadge.textContent = tr("queryError");
    enabledBadge.className = "badge error";
  } else if (data.enabled) {
    enabledBadge.textContent = data.activeRun ? tr("checking") : tr("monitoring");
    enabledBadge.className = "badge on";
  } else {
    enabledBadge.textContent = data.activeRun ? tr("checking") : tr("stopped");
    enabledBadge.className = data.activeRun ? "badge on" : "badge off";
  }

  const recipients = (data.recipients || []).filter(r => r && r.enabled && r.name);
  document.getElementById("recipientCount").textContent = String(recipients.length);
  document.getElementById("lastCheckTime").textContent = formatTime(data.lastCheckTime);
  document.getElementById("nextAllowedCheckAt").textContent = data.nextAllowedCheckAt
    ? formatTime(Number(data.nextAllowedCheckAt), tr("notScheduled"))
    : tr("notScheduled");
  document.getElementById("lastResultText").textContent = hasErrors
    ? tr("queryError")
    : data.lastResultText || tr("neverChecked");

  const updateBanner = document.getElementById("updateBanner");
  updateBanner.hidden = !data.updateAvailable;
  if (data.updateAvailable) {
    document.getElementById("updateStatus").textContent = tr("updateAvailable", { version: data.latestVersion || "" });
    document.getElementById("downloadUpdate").textContent = tr("downloadVersion", { version: data.latestVersion || chrome.runtime.getManifest().version });
  }

  renderRecipientResults(data, recipients);
}

function send(type) {
  showMessage(tr("processing"));
  chrome.runtime.sendMessage({ type }, res => {
    if (chrome.runtime.lastError) {
      showMessage(tr("operationFailed", { message: chrome.runtime.lastError.message }));
      return;
    }
    showMessage(res?.message || tr("completed"));
    loadStatus();
  });
}

document.getElementById("checkNow").addEventListener("click", () => send("CGU_CHECK_NOW"));
document.getElementById("start").addEventListener("click", () => send("CGU_START_MONITOR"));
document.getElementById("stop").addEventListener("click", () => send("CGU_STOP_MONITOR"));
document.getElementById("openPostal").addEventListener("click", () => send("CGU_OPEN_POSTAL"));
document.getElementById("options").addEventListener("click", () => send("CGU_OPEN_OPTIONS"));
document.getElementById("history").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("history.html") });
});

document.getElementById("tutorial").addEventListener("click", () => {
  const filename = currentLanguage === "en" ? "User_Guide.html" : "使用教學.html";
  chrome.tabs.create({ url: chrome.runtime.getURL(filename) });
});
document.getElementById("downloadUpdate").addEventListener("click", () => send("CGU_OPEN_UPDATE_DOWNLOAD"));
document.getElementById("upgradeGuide").addEventListener("click", () => send("CGU_OPEN_UPGRADE_GUIDE"));

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;
  if (POPUP_STORAGE_KEYS.some(key => Object.prototype.hasOwnProperty.call(changes, key))) {
    loadStatus();
  }
});

loadStatus().catch(err => showMessage(`讀取失敗：${err.message || err}`));
