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
    target.closest('.share')?.setAttribute('hidden', '');
    return;
  }
  const qr = window.qrcode(0, 'M');
  qr.addData(shareUrl());
  qr.make();
  target.innerHTML = qr.createSvgTag({ cellSize: 4, margin: QR_MARGIN_CELLS, scalable: true });
}

// Scroll film: page scroll sets the video's time, forward and back.
const FILM_MOBILE_QUERY = '(max-width: 760px), (hover: none) and (pointer: coarse)';
const SEEK_TOLERANCE_S = 1 / 48;
const FILM_END_MARGIN_S = 0.05;

function filmProgress(film) {
  const travel = film.offsetHeight - window.innerHeight;
  if (travel <= 0) return 0;
  return Math.min(1, Math.max(0, -film.getBoundingClientRect().top / travel));
}

function waitForFirstFrame(video) {
  return new Promise((resolve, reject) => {
    video.addEventListener('loadeddata', resolve, { once: true });
    video.addEventListener('error', () => reject(new Error('film could not be decoded')), { once: true });
  });
}

async function loadFilm(video) {
  const src = window.matchMedia(FILM_MOBILE_QUERY).matches ? video.dataset.mobileSrc : video.dataset.src;
  const response = await fetch(src);
  if (!response.ok) throw new Error(`film request failed: ${response.status}`);
  // A Blob URL makes every seek local, so scrubbing never waits on the network.
  const ready = waitForFirstFrame(video);
  video.preload = 'auto';
  video.src = URL.createObjectURL(await response.blob());
  await ready;
}

function initFilm() {
  const film = document.querySelector('[data-film]');
  const video = film?.querySelector('video');
  if (!film || !video) return;

  let duration = 0;
  let target = 0;
  let isFrameQueued = false;

  const seekToTarget = () => {
    if (duration && !video.seeking && Math.abs(video.currentTime - target) > SEEK_TOLERANCE_S) {
      video.currentTime = target;
    }
  };
  const update = () => {
    isFrameQueued = false;
    const progress = filmProgress(film);
    film.style.setProperty('--film-progress', progress.toFixed(4));
    target = progress * Math.max(0, duration - FILM_END_MARGIN_S);
    seekToTarget();
  };
  const queueUpdate = () => {
    if (isFrameQueued) return;
    isFrameQueued = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener('scroll', queueUpdate, { passive: true });
  window.addEventListener('resize', queueUpdate);
  queueUpdate();

  // Reduced motion: the poster stays and the chapters still read over it.
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  video.addEventListener('seeked', seekToTarget);
  // iOS Safari paints seeked frames only after the video has played once.
  window.addEventListener('touchstart', () => {
    video.play().then(() => video.pause()).catch(() => { /* autoplay refused: seeking still works */ });
  }, { once: true, passive: true });

  loadFilm(video)
    .then(() => {
      duration = video.duration;
      film.classList.add('is-ready');
      queueUpdate();
    })
    .catch((error) => {
      // The poster is a complete fallback, so the page stays usable.
      console.warn('Scroll film unavailable, showing the still:', error);
    });
}

document.querySelectorAll('[data-set-lang]').forEach((button) => {
  button.addEventListener('click', () => setLanguage(button.dataset.setLang));
});
document.title = TITLES[document.documentElement.dataset.lang] || TITLES.en;
renderQr();
initFilm();
