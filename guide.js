(() => {
  async function setLanguage(language, persist = false) {
    const lang = CGUI18N.normalizeLanguage(language);
    document.documentElement.lang = lang === "en" ? "en" : "zh-Hant";
    document.querySelectorAll("[data-guide-lang]").forEach(section => {
      section.hidden = section.dataset.guideLang !== lang;
    });
    const selector = document.getElementById("guideLanguage");
    if (selector) selector.value = lang;
    if (persist) await chrome.storage.local.set({ language: lang });
  }

  document.getElementById("guideLanguage")?.addEventListener("change", event => {
    setLanguage(event.target.value, true);
  });

  chrome.storage.local.get(["language"]).then(data => {
    setLanguage(data.language || "zh-TW");
  });
})();
