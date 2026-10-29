// Language switch and the share QR code.

const TITLES = {
  ja: 'Gombo Khongor — ポートフォリオ',
  en: 'Gombo Khongor — Portfolio',
};
const QR_MARGIN_CELLS = 0;
// Per-deployment *.vercel.app URLs sit behind Vercel's login, so the QR always points here.
const CANONICAL_URL = 'https://khongor-portfolio.vercel.app/';
const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

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

/** QR for the public site; on a local server it points at that server instead, for testing. */
function shareUrl() {
  return LOCAL_HOSTS.includes(location.hostname) ? `${location.origin}${location.pathname}` : CANONICAL_URL;
}

function renderQr() {
  const target = document.getElementById('qr');
  if (!target) return;
  if (typeof window.qrcode !== 'function') {
    target.hidden = true;
    return;
  }
  const qr = window.qrcode(0, 'M');
  qr.addData(shareUrl());
  qr.make();
  target.innerHTML = qr.createSvgTag({ cellSize: 4, margin: QR_MARGIN_CELLS, scalable: true });
}

document.querySelectorAll('[data-set-lang]').forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.setLang));
});
document.title = TITLES[document.documentElement.dataset.lang] || TITLES.en;
renderQr();
