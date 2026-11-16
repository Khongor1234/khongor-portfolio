// Smile demo: one shared audio element, waveform players, sentence and model pickers, and the ruler.
(function () {
  const data = window.SMILE_DEMO;
  if (!data) return;

  const SENTENCE_LABELS = {
    ja: ['おはようございます', '深呼吸', '血圧', '検査結果', '10ミリグラム'],
    en: ['Good morning', 'Deep breath', 'Blood pressure', 'Results', 'Ten milligrams'],
  };
  const TEXT = {
    play: { ja: '再生', en: 'Play' },
    pause: { ja: '一時停止', en: 'Pause' },
    cannotClone: { ja: '声をコピーできない', en: 'cannot clone' },
    ceiling: { ja: '天井：本人の別録音', en: 'Ceiling: same speaker' },
    floor: { ja: '床：別人', en: 'Floor: other people' },
    real: { ja: '本人の録音', en: 'Real recording' },
    speed: { ja: '倍速', en: '× real time' },
  };
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const audio = new Audio();
  audio.preload = 'auto';

  let sentenceIndex = 0;
  let activePlayer = null;
  let frame = 0;

  const lang = () => document.documentElement.dataset.lang === 'en' ? 'en' : 'ja';
  const percentOfCeiling = (similarity) => Math.round((similarity / data.ceiling) * 100);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function bilingual(tag, className, pair) {
    const node = el(tag, className);
    ['ja', 'en'].forEach((code) => {
      const span = el('span', '', pair[code]);
      span.lang = code;
      node.append(span);
    });
    return node;
  }

  /** A waveform of bars; returns the svg and a function that paints playback progress (0..1). */
  function waveform(peaks) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${peaks.length * 4} 40`);
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.classList.add('wave');
    const bars = peaks.map((peak, index) => {
      const height = Math.max(2, peak * 36);
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(index * 4));
      rect.setAttribute('y', String(20 - height / 2));
      rect.setAttribute('width', '2.4');
      rect.setAttribute('height', String(height));
      rect.setAttribute('rx', '1.2');
      svg.append(rect);
      return rect;
    });
    const paint = (progress) => {
      const lit = Math.round(progress * bars.length);
      bars.forEach((bar, index) => bar.classList.toggle('lit', index < lit));
    };
    return { svg, paint };
  }

  function stopTicker() {
    cancelAnimationFrame(frame);
  }

  function tick() {
    if (activePlayer && audio.duration) {
      activePlayer.paint(audio.currentTime / audio.duration);
    }
    frame = requestAnimationFrame(tick);
  }

  function setActive(player) {
    if (activePlayer && activePlayer !== player) {
      activePlayer.root.classList.remove('is-playing');
      activePlayer.paint(0);
    }
    activePlayer = player;
  }

  /** Plays a clip in the given player; pressing the playing player again pauses it. */
  function toggle(player, clip, seekTo) {
    const isSameClip = activePlayer === player && audio.src.endsWith(clip.src);
    if (isSameClip && !audio.paused && seekTo === undefined) {
      audio.pause();
      return;
    }
    setActive(player);
    if (!isSameClip) audio.src = clip.src;
    if (seekTo !== undefined) {
      const applySeek = () => { audio.currentTime = seekTo * (audio.duration || clip.seconds); };
      if (audio.readyState >= 1) applySeek(); else audio.addEventListener('loadedmetadata', applySeek, { once: true });
    }
    audio.play().catch((error) => console.warn('Smile demo could not play the clip:', error));
  }

  audio.addEventListener('play', () => {
    activePlayer?.root.classList.add('is-playing');
    stopTicker();
    frame = requestAnimationFrame(tick);
  });
  audio.addEventListener('pause', () => {
    activePlayer?.root.classList.remove('is-playing');
    stopTicker();
  });
  audio.addEventListener('ended', () => {
    activePlayer?.paint(1);
    activePlayer?.root.classList.remove('is-playing');
    stopTicker();
  });

  /** A play button plus a clickable waveform; clip() returns the clip to play right now. */
  function makePlayer(root, clip, label) {
    root.textContent = '';
    const button = el('button', 'play');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="i-play" d="M8 5v14l11-7z"/><path class="i-pause" d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
    const current = clip();
    const wave = waveform(current.peaks);
    const time = el('span', 'time', `${current.seconds.toFixed(1)}s`);
    root.append(button, wave.svg, time);
    const player = { root, paint: wave.paint };
    button.addEventListener('click', () => toggle(player, clip()));
    wave.svg.addEventListener('click', (event) => {
      const box = wave.svg.getBoundingClientRect();
      toggle(player, clip(), Math.min(1, Math.max(0, (event.clientX - box.left) / box.width)));
    });
    return player;
  }

  function renderSentences() {
    const holder = document.querySelector('[data-sentences]');
    holder.textContent = '';
    SENTENCE_LABELS[lang()].forEach((label, index) => {
      const chip = el('button', 'chip', label);
      chip.type = 'button';
      chip.setAttribute('role', 'radio');
      chip.setAttribute('aria-checked', String(index === sentenceIndex));
      chip.addEventListener('click', () => {
        sentenceIndex = index;
        audio.pause();
        render();
      });
      holder.append(chip);
    });
    document.querySelector('[data-sentence-text]').textContent = `“${data.sentences[sentenceIndex]}”`;
  }

  function renderModels() {
    const list = document.querySelector('[data-models]');
    list.textContent = '';
    data.models.forEach((model, index) => {
      const row = el('li', `model${model.clones ? '' : ' model--preset'}`);
      row.style.setProperty('--i', index);
      const head = el('div', 'model-head');
      head.append(el('span', 'model-name', model.name));
      if (!model.clones) head.append(bilingual('span', 'badge', TEXT.cannotClone));
      const share = percentOfCeiling(model.similarity);
      const meter = el('div', 'meter');
      meter.style.setProperty('--share', Math.min(100, Math.max(0, share)) / 100);
      meter.append(el('span', 'meter-fill'), el('b', 'meter-value', `${share}%`));
      const stats = el('div', 'stats');
      stats.append(el('span', '', `${model.cer.toFixed(1)}%`), el('span', '', `${(1 / model.rtf).toFixed(1)}${TEXT.speed[lang()]}`));
      const playerRoot = el('div', 'player');
      row.append(head, meter, stats, playerRoot);
      list.append(row);
      makePlayer(playerRoot, () => model.clips[sentenceIndex], `${TEXT.play[lang()]}: ${model.name}`);
    });
  }

  function renderRuler() {
    const holder = document.querySelector('[data-ruler]');
    holder.textContent = '';
    const toX = (value) => `${(value * 100).toFixed(1)}%`;
    const track = el('div', 'track');
    const band = el('span', 'band');
    band.style.left = toX(data.floor);
    band.style.width = toX(data.ceiling - data.floor);
    track.append(band);
    [['floor', data.floor, TEXT.floor], ['ceiling', data.ceiling, TEXT.ceiling]].forEach(([kind, value, text]) => {
      const mark = el('span', `mark mark--${kind}`);
      mark.style.left = toX(value);
      mark.append(bilingual('span', 'mark-label', { ja: `${text.ja} ${value}`, en: `${text.en} ${value}` }));
      track.append(mark);
    });
    data.models.forEach((model, index) => {
      const dot = el('button', `dot${model.clones ? '' : ' dot--preset'}`);
      dot.type = 'button';
      dot.style.left = toX(model.similarity);
      dot.style.setProperty('--row', index % 3);
      dot.setAttribute('aria-label', `${model.name} ${model.similarity}`);
      dot.append(el('span', 'dot-label', `${model.name} · ${model.similarity}`));
      const player = { root: dot, paint: () => {} };
      dot.addEventListener('click', () => toggle(player, model.clips[sentenceIndex]));
      track.append(dot);
    });
    const scale = el('div', 'scale');
    ['0', '0.25', '0.5', '0.75', '1'].forEach((tickLabel) => scale.append(el('span', '', tickLabel)));
    holder.append(track, scale);
  }

  function renderHeld() {
    const row = document.querySelector('[data-held]');
    row.textContent = '';
    data.held.forEach((clip, index) => {
      const playerRoot = el('div', 'player player--small');
      row.append(playerRoot);
      makePlayer(playerRoot, () => clip, `${TEXT.play[lang()]}: ${TEXT.real[lang()]} ${index + 1}`);
    });
  }

  function render() {
    renderSentences();
    renderModels();
    renderRuler();
    renderHeld();
    makePlayer(document.querySelector('[data-player="reference"]'), () => data.reference, TEXT.play[lang()]);
    activePlayer = null;
  }

  document.querySelectorAll('[data-set-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      const code = button.dataset.setLang;
      document.documentElement.lang = code;
      document.documentElement.dataset.lang = code;
      try { localStorage.setItem('lang', code); } catch { /* storage blocked: lasts for this visit */ }
      audio.pause();
      render();
    });
  });

  render();
})();
