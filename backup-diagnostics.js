(() => {
  const BACKUP_FORMAT = "CGUPostalChecker-settings-backup";
  const BACKUP_SCHEMA_VERSION = 1;
  const SETTING_KEYS = [
    "enabled",
    "language",
    "languageUserSelected",
    "checkOnStartup",
    "intervalEnabled",
    "intervalMinutes",
    "minAutoIntervalMinutes",
    "startupDelayMinMinutes",
    "startupDelayMaxMinutes",
    "scheduleJitterMaxMinutes",
    "manualCooldownMinutes",
    "recipientDelayMinSeconds",
    "recipientDelayMaxSeconds",
    "onlyWithinHours",
    "activeStartTime",
    "activeEndTime",
    "skipWeekends",
    "notifyOnlyWhenMailExists",
    "notifyOncePerDay",
    "notifyLoginIssue",
    "showBadge",
    "openTabIfMissing",
    "updateCheckEnabled",
    "updateCheckIntervalMinutes",
    "sourceFolderNote",
    "captureScreenshotOnError",
    "defaultStatus",
    "dateType",
    "dateInterval",
    "recipients"
  ];

  const BOOLEAN_KEYS = [
    "enabled",
    "languageUserSelected",
    "checkOnStartup",
    "intervalEnabled",
    "onlyWithinHours",
    "skipWeekends",
    "notifyOnlyWhenMailExists",
    "notifyOncePerDay",
    "notifyLoginIssue",
    "showBadge",
    "openTabIfMissing",
    "updateCheckEnabled",
    "captureScreenshotOnError"
  ];

  const NUMBER_RULES = {
    intervalMinutes: [120, 10080, 360],
    minAutoIntervalMinutes: [120, 10080, 120],
    startupDelayMinMinutes: [1, 1440, 5],
    startupDelayMaxMinutes: [1, 1440, 30],
    scheduleJitterMaxMinutes: [0, 1440, 30],
    manualCooldownMinutes: [1, 1440, 5],
    recipientDelayMinSeconds: [1, 600, 5],
    recipientDelayMaxSeconds: [1, 600, 15],
    updateCheckIntervalMinutes: [60, 10080, 1440]
  };

  function clampNumber(value, [min, max, fallback]) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.round(number)));
  }

  function sanitizeText(value, maxLength = 500) {
    return String(value ?? "").replace(/\0/g, "").slice(0, maxLength);
  }

  function sanitizeTime(value, fallback) {
    const text = String(value || "");
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : fallback;
  }

  function sanitizeChoice(value, allowed, fallback) {
    const text = String(value ?? "");
    return allowed.includes(text) ? text : fallback;
  }

  function sanitizeRecipient(recipient) {
    if (!recipient || typeof recipient !== "object" || Array.isArray(recipient)) return null;
    const name = sanitizeText(recipient.name, 200).trim();
    if (!name) return null;
    return {
      enabled: recipient.enabled !== false,
      name,
      receiverId: sanitizeText(recipient.receiverId, 200).trim(),
      status: sanitizeChoice(recipient.status, ["", "0", "1", "2"], "0"),
      dateType: sanitizeChoice(recipient.dateType, ["0", "1"], "0"),
      dateInterval: sanitizeChoice(recipient.dateInterval, ["1", "3", "6"], "1")
    };
  }

  function sanitizeSettings(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Settings must be a JSON object.");
    }

    const settings = {};
    for (const key of BOOLEAN_KEYS) {
      if (Object.prototype.hasOwnProperty.call(input, key)) settings[key] = Boolean(input[key]);
    }
    for (const [key, rule] of Object.entries(NUMBER_RULES)) {
      if (Object.prototype.hasOwnProperty.call(input, key)) settings[key] = clampNumber(input[key], rule);
    }

    if (Object.prototype.hasOwnProperty.call(input, "language")) {
      settings.language = input.language === "en" ? "en" : "zh-TW";
    }
    if (Object.prototype.hasOwnProperty.call(input, "sourceFolderNote")) {
      settings.sourceFolderNote = sanitizeText(input.sourceFolderNote, 1000).trim();
    }
    if (Object.prototype.hasOwnProperty.call(input, "activeStartTime")) {
      settings.activeStartTime = sanitizeTime(input.activeStartTime, "08:00");
    }
    if (Object.prototype.hasOwnProperty.call(input, "activeEndTime")) {
      settings.activeEndTime = sanitizeTime(input.activeEndTime, "18:00");
    }
    if (Object.prototype.hasOwnProperty.call(input, "defaultStatus")) {
      settings.defaultStatus = sanitizeChoice(input.defaultStatus, ["", "0", "1", "2"], "0");
    }
    if (Object.prototype.hasOwnProperty.call(input, "dateType")) {
      settings.dateType = sanitizeChoice(input.dateType, ["0", "1"], "0");
    }
    if (Object.prototype.hasOwnProperty.call(input, "dateInterval")) {
      settings.dateInterval = sanitizeChoice(input.dateInterval, ["1", "3", "6"], "1");
    }
    if (Object.prototype.hasOwnProperty.call(input, "recipients")) {
      if (!Array.isArray(input.recipients)) throw new Error("Recipients must be an array.");
      settings.recipients = input.recipients.slice(0, 100).map(sanitizeRecipient).filter(Boolean);
    }

    if (settings.startupDelayMinMinutes !== undefined && settings.startupDelayMaxMinutes !== undefined) {
      settings.startupDelayMaxMinutes = Math.max(settings.startupDelayMinMinutes, settings.startupDelayMaxMinutes);
    }
    if (settings.recipientDelayMinSeconds !== undefined && settings.recipientDelayMaxSeconds !== undefined) {
      settings.recipientDelayMaxSeconds = Math.max(settings.recipientDelayMinSeconds, settings.recipientDelayMaxSeconds);
    }
    return settings;
  }

  function createBackup(storageData, appVersion) {
    const selected = {};
    for (const key of SETTING_KEYS) {
      if (Object.prototype.hasOwnProperty.call(storageData, key)) selected[key] = storageData[key];
    }
    return {
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      appVersion,
      exportedAt: new Date().toISOString(),
      settings: sanitizeSettings(selected)
    };
  }

  function parseBackup(text) {
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error("The selected file is not valid JSON.");
    }
    if (!payload || payload.format !== BACKUP_FORMAT || Number(payload.schemaVersion) !== BACKUP_SCHEMA_VERSION) {
      throw new Error("This is not a supported CGU Postal Checker settings backup.");
    }
    return sanitizeSettings(payload.settings);
  }

  function timestampForFilename(date = new Date()) {
    const pad = value => String(value).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  }

  async function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    try {
      const downloadId = await chrome.downloads.download({
        url,
        filename,
        conflictAction: "uniquify",
        saveAs: true
      });
      return { downloadId, filename };
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }

  function toBytes(value) {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    return new TextEncoder().encode(String(value));
  }

  function dataUrlToBytes(dataUrl) {
    const match = /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/i.exec(String(dataUrl || ""));
    if (!match) throw new Error("Invalid screenshot data URL.");
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let value = n;
      for (let bit = 0; bit < 8; bit += 1) {
        value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
      }
      table[n] = value >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }

  function concatBytes(parts) {
    const total = parts.reduce((sum, part) => sum + part.length, 0);
    const output = new Uint8Array(total);
    let offset = 0;
    for (const part of parts) {
      output.set(part, offset);
      offset += part.length;
    }
    return output;
  }

  function dosDateTime(date = new Date()) {
    const year = Math.max(1980, date.getFullYear());
    return {
      time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
      date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()
    };
  }

  function writeUint16(view, offset, value) {
    view.setUint16(offset, value, true);
  }

  function writeUint32(view, offset, value) {
    view.setUint32(offset, value >>> 0, true);
  }

  function createStoredZip(entries) {
    const localParts = [];
    const centralParts = [];
    let localOffset = 0;
    const stamp = dosDateTime();

    for (const entry of entries) {
      const nameBytes = new TextEncoder().encode(entry.name);
      const dataBytes = toBytes(entry.data);
      const crc = crc32(dataBytes);

      const localHeader = new Uint8Array(30 + nameBytes.length);
      const localView = new DataView(localHeader.buffer);
      writeUint32(localView, 0, 0x04034b50);
      writeUint16(localView, 4, 20);
      writeUint16(localView, 6, 0x0800);
      writeUint16(localView, 8, 0);
      writeUint16(localView, 10, stamp.time);
      writeUint16(localView, 12, stamp.date);
      writeUint32(localView, 14, crc);
      writeUint32(localView, 18, dataBytes.length);
      writeUint32(localView, 22, dataBytes.length);
      writeUint16(localView, 26, nameBytes.length);
      writeUint16(localView, 28, 0);
      localHeader.set(nameBytes, 30);
      localParts.push(localHeader, dataBytes);

      const centralHeader = new Uint8Array(46 + nameBytes.length);
      const centralView = new DataView(centralHeader.buffer);
      writeUint32(centralView, 0, 0x02014b50);
      writeUint16(centralView, 4, 20);
      writeUint16(centralView, 6, 20);
      writeUint16(centralView, 8, 0x0800);
      writeUint16(centralView, 10, 0);
      writeUint16(centralView, 12, stamp.time);
      writeUint16(centralView, 14, stamp.date);
      writeUint32(centralView, 16, crc);
      writeUint32(centralView, 20, dataBytes.length);
      writeUint32(centralView, 24, dataBytes.length);
      writeUint16(centralView, 28, nameBytes.length);
      writeUint16(centralView, 30, 0);
      writeUint16(centralView, 32, 0);
      writeUint16(centralView, 34, 0);
      writeUint16(centralView, 36, 0);
      writeUint32(centralView, 38, 0);
      writeUint32(centralView, 42, localOffset);
      centralHeader.set(nameBytes, 46);
      centralParts.push(centralHeader);

      localOffset += localHeader.length + dataBytes.length;
    }

    const localData = concatBytes(localParts);
    const centralData = concatBytes(centralParts);
    const end = new Uint8Array(22);
    const endView = new DataView(end.buffer);
    writeUint32(endView, 0, 0x06054b50);
    writeUint16(endView, 4, 0);
    writeUint16(endView, 6, 0);
    writeUint16(endView, 8, entries.length);
    writeUint16(endView, 10, entries.length);
    writeUint32(endView, 12, centralData.length);
    writeUint32(endView, 16, localData.length);
    writeUint16(endView, 20, 0);

    return new Blob([localData, centralData, end], { type: "application/zip" });
  }

  globalThis.CGUBackupDiagnostics = {
    BACKUP_FORMAT,
    SETTING_KEYS,
    createBackup,
    createStoredZip,
    dataUrlToBytes,
    downloadBlob,
    parseBackup,
    sanitizeSettings,
    timestampForFilename
  };
})();
