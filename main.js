// Language switch and the share QR code.

const TITLES = {
  ja: 'Gombo Khongor — ポートフォリオ',
  en: 'Gombo Khongor — Portfolio',
};
const QR_MARGIN_CELLS = 0;

function setLanguage(lang) {
  document.documentElement.lang = lang;
  document.documentElement.dataset.lang = lang;
  document.title = TITLES[lang];
  try {
    localStorage.setItem('lang', lang);
  } catch {
    // Storage blocked: the choice lasts for this page only.
  }
}

/** QR for this page's own address (no query or hash), so it stays right on any domain. */
function renderQr() {
  const target = document.getElementById('qr');
  if (!target) return;
  if (typeof window.qrcode !== 'function') {
    target.hidden = true;
    return;
  }
  const qr = window.qrcode(0, 'M');
  qr.addData(`${location.origin}${location.pathname}`);
  qr.make();
  target.innerHTML = qr.createSvgTag({ cellSize: 4, margin: QR_MARGIN_CELLS, scalable: true });
}

document.querySelectorAll('[data-set-lang]').forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.setLang));
});
document.title = TITLES[document.documentElement.dataset.lang] || TITLES.en;
renderQr();
