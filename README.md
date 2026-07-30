# 長庚大學自動查詢郵件｜CGU Postal Mail Checker

## 繁體中文

Chrome Manifest V3 擴充功能，用於定時查詢長庚大學郵件收發管理系統。

### v1.1.0 功能

- 多位收件人與不同郵件狀態、日期條件
- 查詢頁就緒確認及最多三次自動重試
- 查詢失敗時顯示紅色 `!` badge、失敗收件人及實際錯誤
- 郵件件數 badge、每日一次提醒、查詢紀錄及 JSON 匯出
- 繁體中文／英文介面、說明與教學
- 每天檢查 GitHub 最新版本並提示下載

### 安裝

請開啟 `使用教學.html`；升級既有版本請開啟 `升級教學.html`。

### 重要限制

- 外掛使用目前 Chrome 的長庚網站登入狀態，不儲存帳號或密碼。
- 外掛不會讀取 Gmail；收到通知信不等於外掛已完成下一次郵件系統查詢。
- 未封裝擴充功能不能自動覆寫自己的本機檔案，因此更新採提示下載及手動重新載入。

## English

This Chrome Manifest V3 extension periodically checks the CGU postal mail system.

### v1.1.0 features

- Multiple recipients with independent status and date filters
- Page-readiness checks and up to three automatic retries
- Red `!` badge, affected recipient, and actual error details on query failure
- Mail-count badge, once-per-day notifications, history, and JSON export
- Traditional Chinese and English interfaces, descriptions, and guides
- Daily GitHub version checks with download prompts

### Installation

Open `使用教學.html`. For an existing installation, follow `升級教學.html`.

### Important limitations

- The extension uses the current CGU website session and never stores account credentials.
- It does not read Gmail. A notification email can arrive before the next postal-system query.
- An unpacked extension cannot overwrite its own local files, so updates use a download prompt and manual reload.
