# CGU Postal Mail Checker v1.2.1

## Installation

1. Extract the ZIP to a permanent folder, such as `C:\Program Files\Google\ChromeExtensions\CGUPostalChecker`.
2. Open `chrome://extensions/` and enable **Developer mode**.
3. Select **Load unpacked** and choose the folder that directly contains `manifest.json`.
4. Open `https://www4.is.cgu.edu.tw/postal/studentletter.aspx` and sign in.
5. Open the extension settings, choose a language, add recipients, and save.
6. Save the permanent folder from step 1 in **Source folder note**. Chrome cannot recover this native path automatically later.
7. Select **Check now** and confirm that every recipient succeeds before starting monitoring.

On first installation, Traditional Chinese locales (`zh-TW`, `zh-Hant`, `zh-HK`, and `zh-MO`) default to Traditional Chinese. Every other locale defaults to English. A manual language selection is preserved.

## Icon and notifications

- Blue number: current mail count.
- Red `!`: at least one recipient failed. Open the popup or history for details.
- No badge: a successful zero result, or the count badge is disabled.
- The extension polls the CGU postal system; it does not monitor Gmail in real time. A notification email can arrive before the next scheduled query.

## GitHub updates

- The extension checks `manifest.json` on the GitHub `main` branch once per day.
- When the remote version is newer, a notification and update banner are shown.
- **Download latest** saves the archive as `CGUPostalChecker-vVERSION.zip`.
- **Open Chrome extensions** opens `chrome://extensions/` in another tab.
- **Open Downloads folder** opens the system's default download location.
- Chrome cannot read the native Windows source path of an unpacked extension. Save it once in **Source folder note** and copy it later.
- An unpacked extension cannot safely overwrite its own local files. Follow [Upgrade_Guide.html](./Upgrade_Guide.html) to download, replace files, and reload the extension.
- Fully automatic installation requires Chrome Web Store distribution.

## Upgrade workflow

1. Open Settings, select **Back up all settings**, then select **Copy source folder** to retrieve the saved source path.
2. Select **Download latest vX.Y.Z**; the ZIP filename includes its version.
3. Select **Open Downloads folder** and extract the downloaded ZIP.
4. Copy every file from the extracted folder that directly contains `manifest.json` over the saved source folder.
5. Do not remove the extension. Select **Open Chrome extensions**.
6. Find the extension at `chrome://extensions/` and select **Reload**.
7. Verify the version, language, and recipients, then run **Check now** once.

## Backup, import, and diagnostics

- **Back up all settings** saves recipients, schedules, notifications, language, the source-folder note, and the screenshot option. It never contains university credentials.
- **Import settings** accepts only a validated JSON backup created by this extension.
- **Generate diagnostic JSON** exports extension and Chrome versions, query-field status, error logs, and the latest query result. After downloading, the extension displays `weihao.chiu@gmail.com` and can open the system's default email application; attach the report manually.
- **Generate diagnostic ZIP** contains the same JSON and includes the most recent error screenshot when one is available.
- Error screenshots are off by default. Enabling the option requests the optional debugger permission for the CGU query page only. Disabling it removes the permission and cached screenshot.
- Diagnostics and screenshots may contain names, mail details, and a local path. Review them before sharing.

## Author

- Wei-Hao Chiu
- Email: `weihao.chiu@gmail.com`
- Website: `https://weihaochiu.github.io/`

## Troubleshooting

- Red `!`: verify that the postal page is still signed in, then select **Check now**.
- Notification email but no result: compare the email time with the last query time.
- Update check failed: verify GitHub connectivity and try a manual check later.
- No Windows notification: allow notifications for Chrome and this extension.
