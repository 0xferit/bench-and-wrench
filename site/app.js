(() => {
  const HIDE_AFTER_HEADER_HEIGHTS = 5;
  const SETTLE_DELAY_MS = 150;
  const DESKTOP = matchMedia('(min-width: 992px)');
  const WIDER_THAN_PHONE = matchMedia('(min-width: 768px)');
  const HOVER_DESKTOP = matchMedia('(hover: hover) and (min-width: 992px)');
  const FILL_DURATION_MS = 580;
  const FILL_EASING = 'steps(20, jump-none)';
  const RESET_MS = 250;
  const PIXEL_COLUMNS = 24;
  const PIXEL_ROWS = 6;
  const FILL_BLEED_PX = 2;
  const FILL_STATES = ['is-active', 'is-filling', 'is-entered', 'is-exiting', 'is-resetting'];
  const MARQUEE_PX_PER_SECOND = 40;
  const CROSSHAIR_FOLLOW = 0.3;
  const FRAME_MS = 1000 / 60;
  const CROSSHAIR_SETTLE_PX = 0.1;
  const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)');
  const SCENE_EDGES = { top: 0, center: 0.5, bottom: 1 };
  const SCENE_DEFAULT_END = 'bottom top';
  const SCENE_MIN_SPAN_PX = 1;
  const SCENE_LENGTH = /^(?:(top|center|bottom)|(-?\d*\.?\d+)(px|%|vh)?)?(?:([+-])=(\d*\.?\d+)(px|%|vh)?)?$/;
  const SCENE_CLAMP = /^clamp\((.*)\)$/;
  const PERCENT = 100;
  const TWEEN_DURATION = 0.5;
  const TIMELINE_POSITION = /^(?:([<>])=?(-?\d*\.?\d+)?|([+-])=(\d*\.?\d+))$/;
  const STATEMENT_SCRUB = { start: 'center bottom+=10%', end: 'center top+=40%' };
  const STATEMENT_CHAR_STAGGER = 0.03;
  const INK_SCRUB = { start: 'top 35%', end: 'bottom 55%' };
  const INK_BULGE = 1.25;
  const PLAN_ENTRY = { start: 'top bottom', end: 'top top' };
  const PLAN_SCRUB = { start: 'top 50%', end: () => (WIDER_THAN_PHONE.matches ? 'bottom-=30vh bottom' : 'bottom-=180vh top') };
  const PLAN_HEADING_IN = { at: '>=0' };
  const PLAN_HEADING_OUT = { at: '>=0.5' };
  const PLAN_WALLS_IN = { at: '-=0.5' };
  const PLAN_WALL_PIECES = { at: '<=0', stagger: { amount: 0.02, from: 'random' } };
  const PLAN_PANEL_REVEAL_MS = 200;
  const STRIP_AUTOPLAY_MS = 3000;
  const STRIP_SPEED_MS = 600;
  const STRIP_STEP_DESKTOP = 3;
  const STRIP_STEP_NARROW = 1;
  const FAQ_SLIDE_MS = 400;
  const FINE_POINTER = matchMedia('(pointer: fine)');
  const SCROLL_LERP = 0.1;
  const SCROLL_SETTLE_PX = 0.5;
  const ANCHOR_SCROLL_MS = 1000;
  const ANCHOR_EASE_RATE = 10;
  const ANCHOR_EASE_CEILING = 1.001;
  const LINE_HEIGHT_PX = 16;
  const LOADER_DRAW_MS = 1300;
  const LOADER_DRAW_SPREAD_MS = 3000;
  const LOADER_FIRST_MS = 3000;
  const LOADER_FIRST_SHARE = 60;
  const LOADER_SECOND_MS = 2500;
  const LOADER_FULL = 100;
  const LOADER_FADE_MS = 400;
  const LOADER_SPLIT_MS = 800;
  const HEADER_FADE_MS = 1000;
  const LOADED_AT_MS = 7200;
  const PAGE_MARK_MS = 800;
  const PAGE_OPEN_MS = 800;
  const CURSOR_POINTER = matchMedia('(hover: hover) and (min-width: 992px) and (pointer: fine)');
  const CURSOR_FOLLOW = 0.18;
  const CURSOR_SIZE_PX = 8;
  const CURSOR_SETTLE_PX = 0.1;
  const TRAIL_MS = 400;
  const TRAIL_ALPHA = 0.9;
  const BAND_UNITS = 1000;
  const BLOT_RADIUS_SHARE = 0.45;
  const BLOT_FOLLOW = 0.09;
  const BLOT_PULSE_FOLLOW = 0.15;
  const BLOT_PULSE_RADIUS = 1.05;
  const BLOT_PULSE_OPACITY = 0.2;
  const BLOT_GROW_MS = 550;
  const BLOT_PULSE_GROW_MS = 450;
  const BLOT_SHRINK_MS = 800;
  const BLOT_PULSE_SHRINK_MS = 1000;
  const BLOT_SETTLE_UNITS = 0.1;
  const INK_DISPLACEMENT_SHARE = 0.7;
  const INK_DISPLACEMENT_MAX_UNITS = 150;
  const INK_FREQUENCY_UNITS = [0.028, 0.04];
  const INK_BLUR_UNITS = 0.55;
  const BAND_TICK_SHARE = 0.1;
  const ROUND_LETTER = /[CDGOQS]/;
  const BAND_LETTER = /\p{L}/u;
  const powerOut = (power) => (share) => 1 - (1 - share) ** (power + 1);
  const EASES = { none: (share) => share, power1Out: powerOut(1), power2Out: powerOut(2), power3Out: powerOut(3) };
  const REVEAL_TRIGGERS = [
    ['.home-hero, .bench-plan-panel', 0],
    ['.section-head', 0.65],
    ['.statement-strip-wrap, .cell-list, .faq-list, .footer-left, .footer-menu, .footer-info, .footer-logo, .footer-band, .footer-copyright-wrap', 0.55],
    ['.statement-body, .statement-media, .tool-row-art, .cell-item-img', 0.45],
    ['.tool-row-left, .tool-row-right, .cta', 0.4],
  ];
  const REVEAL_EFFECTS = {
    text: '.section-head-title .heading, .section-head-title p, .section-head-label span, .cell-item-head > span, .tool-row-title, .tool-row-sub p, .cell-item-title, .cell-item-content p, .cta-main-title, .cta-main-sub, .footer-title, .footer-label, .footer-info-label, .statement-desc',
    words: '.home-hero-title, .bench-plan-panel-label-text, .bench-plan-panel-title, .bench-plan-panel-sub, .bench-plan-panel-item-text',
    block: '.home-hero-sub, .home-hero-work, .statement-link, .cta-main-btn, .tool-row-btn, .tool-facts > div, .faq-ic, .footer-note, .cta-head-item span',
    scale: '.tool-row-art .tool-illustration, .cell-item-img > svg, .statement-media > svg, .cta-deco-art > svg, .footer-logo .mark, .bench-plan-panel-item-ic',
    rule: 'main .line:not(.hero-guide, .bench-plan-panel .line), .cta .line, .footer .line',
    fade: '.home-hero-img .ruler',
  };
  const REVEAL_STATES = ['rv-pending', 'rv-start', ...Object.keys(REVEAL_EFFECTS).map((effect) => `rv-${effect}`)];

  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  const token = (name, fallback = 'linear') => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

  const scroller = { current: scrollY, target: scrollY, frame: 0, last: 0, anchor: null };
  const smoothScrolling = () => FINE_POINTER.matches && !REDUCED_MOTION.matches && !document.documentElement.classList.contains('is-loading');
  const maxScroll = () => document.documentElement.scrollHeight - innerHeight;
  const clampScroll = (value) => Math.min(maxScroll(), Math.max(0, value));
  const anchorEase = (time) => Math.min(1, ANCHOR_EASE_CEILING - 2 ** (-ANCHOR_EASE_RATE * time));
  const scrollsWithin = (node, delta) => {
    for (let element = node instanceof Element ? node : node.parentElement; element && element !== document.body; element = element.parentElement) {
      if (!/auto|scroll/.test(getComputedStyle(element).overflowY) || element.scrollHeight <= element.clientHeight) continue;
      if (delta < 0 ? element.scrollTop > 0 : element.scrollTop + element.clientHeight < element.scrollHeight - 1) return true;
    }
    return false;
  };
  const landAnchor = ({ target, hash }) => {
    history.pushState(null, '', hash);
    if (target === document.body) return;
    if (!target.hasAttribute('tabindex') && target.tabIndex < 0) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  };
  const glide = (time) => {
    const elapsed = scroller.last ? time - scroller.last : FRAME_MS;
    scroller.last = time;
    const { anchor } = scroller;
    let settled;
    if (anchor) {
      anchor.start ??= time;
      const share = clamp01((time - anchor.start) / ANCHOR_SCROLL_MS);
      scroller.current = anchor.from + (scroller.target - anchor.from) * anchorEase(share);
      settled = share === 1;
    } else {
      scroller.current += (scroller.target - scroller.current) * (1 - (1 - SCROLL_LERP) ** (elapsed / FRAME_MS));
      settled = Math.abs(scroller.target - scroller.current) < SCROLL_SETTLE_PX;
    }
    if (settled) scroller.current = scroller.target;
    scrollTo(0, scroller.current);
    scroller.frame = settled ? 0 : requestAnimationFrame(glide);
    if (settled && anchor) {
      scroller.anchor = null;
      landAnchor(anchor);
    }
  };
  const startGlide = () => {
    if (scroller.frame) return;
    scroller.last = 0;
    scroller.frame = requestAnimationFrame(glide);
  };
  window.addEventListener('scroll', () => { if (!scroller.frame) scroller.current = scroller.target = scrollY; }, { passive: true });
  window.addEventListener('wheel', (event) => {
    if (!smoothScrolling() || event.ctrlKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || scrollsWithin(event.target, event.deltaY)) return;
    event.preventDefault();
    const unit = { [WheelEvent.DOM_DELTA_LINE]: LINE_HEIGHT_PX, [WheelEvent.DOM_DELTA_PAGE]: innerHeight }[event.deltaMode] || 1;
    if (!scroller.frame) scroller.current = scroller.target = scrollY;
    scroller.anchor = null;
    scroller.target = clampScroll(scroller.target + event.deltaY * unit);
    startGlide();
  }, { passive: false });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href*="#"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !smoothScrolling()) return;
    if (link.origin !== location.origin || link.pathname !== location.pathname || link.search !== location.search || link.hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
    if (!target) return;
    event.preventDefault();
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    scroller.current = scrollY;
    scroller.target = clampScroll(target.getBoundingClientRect().top + scrollY - margin);
    scroller.anchor = { target, hash: link.hash, from: scrollY };
    startGlide();
  });

  const scene = (() => {
    const parseLength = (text) => {
      const match = SCENE_LENGTH.exec(text);
      if (!match) throw new Error(`Unreadable scene position: ${text}`);
      const [, edge, base, baseUnit, sign, offset, offsetUnit] = match;
      const length = { share: edge ? SCENE_EDGES[edge] : 0, viewports: 0, px: 0 };
      const extend = (amount, unit) => {
        if (unit === '%') length.share += amount / PERCENT;
        else if (unit === 'vh') length.viewports += amount / PERCENT;
        else length.px += amount;
      };
      if (base) extend(Number(base), baseUnit);
      if (offset) extend(Number(`${sign}${offset}`), offsetUnit);
      return length;
    };
    const parsePosition = (text) => {
      const clamped = SCENE_CLAMP.exec(text.trim());
      const [element, viewport = 'top', ...rest] = (clamped ? clamped[1] : text).trim().split(/\s+/);
      if (rest.length) throw new Error(`Unreadable scene position: ${text}`);
      return { clamped: Boolean(clamped), element: parseLength(element), viewport: parseLength(viewport) };
    };
    const positionOf = (value) => {
      if (typeof value === 'function') return () => parsePosition(value());
      const parsed = parsePosition(value);
      return () => parsed;
    };
    const measureLength = ({ share, viewports, px }, size) => share * size + viewports * innerHeight + px;
    const scrollPoint = ({ element, viewport }, bounds) => Math.round(bounds.top + scrollY + measureLength(element, bounds.height) - measureLength(viewport, innerHeight));
    const live = new Set();
    let printing = false;
    const range = (entry, bounds) => {
      const start = entry.start();
      const end = entry.end();
      const max = maxScroll();
      let from = scrollPoint(start, bounds);
      let to = scrollPoint(end, bounds);
      if (start.clamped) from = from >= max ? max - SCENE_MIN_SPAN_PX : Math.max(from, 0);
      if (end.clamped) to = Math.min(to, max);
      return { from, span: Math.max(to - from, SCENE_MIN_SPAN_PX) };
    };
    const read = (entry) => {
      const bounds = entry.trigger.getBoundingClientRect();
      if (REDUCED_MOTION.matches || printing) return { entry, bounds, progress: 1 };
      const { from, span } = range(entry, bounds);
      return { entry, bounds, progress: clamp01((scrollY - from) / span) };
    };
    const render = ({ entry, bounds, progress }) => {
      if (entry.onProgress) entry.onProgress(progress, bounds);
      if (entry.onEnter && progress > 0) {
        live.delete(entry);
        entry.onEnter();
      }
    };
    let frame = 0;
    const update = () => {
      frame = 0;
      [...live].map(read).forEach(render);
    };
    const requestUpdate = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    new ResizeObserver(requestUpdate).observe(document.body);
    REDUCED_MOTION.addEventListener('change', requestUpdate);
    window.addEventListener('beforeprint', () => {
      printing = true;
      update();
    });
    window.addEventListener('afterprint', () => {
      printing = false;
      update();
    });
    return (trigger, { start, end = SCENE_DEFAULT_END, onProgress, onEnter }) => {
      const entry = { trigger, start: positionOf(start), end: positionOf(end), onProgress, onEnter };
      live.add(entry);
      render(read(entry));
      return {
        scrollAt: (progress) => {
          const { from, span } = range(entry, trigger.getBoundingClientRect());
          return from + span * progress;
        },
      };
    };
  })();
  const shuffle = (items) => {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const other = Math.floor(Math.random() * (index + 1));
      [items[index], items[other]] = [items[other], items[index]];
    }
    return items;
  };
  const staggerDelays = (count, stagger) => {
    const { each = 0, amount = each * (count - 1), from = 'start' } = typeof stagger === 'number' ? { each: stagger } : stagger;
    const ranks = [...Array(count).keys()];
    if (from === 'random') shuffle(ranks);
    return ranks.map((rank) => (count > 1 ? amount * rank / (count - 1) : 0));
  };
  const timeline = () => {
    const tracks = [];
    let recent = { start: 0, end: 0 };
    let length = 0;
    const startOf = (position) => {
      if (position === undefined) return length;
      if (typeof position === 'number') return position;
      const match = TIMELINE_POSITION.exec(position);
      if (!match) throw new Error(`Unreadable timeline position: ${position}`);
      const [, anchor, shift = 0, sign, offset] = match;
      if (anchor) return (anchor === '<' ? recent.start : recent.end) + Number(shift);
      return length + Number(`${sign}${offset}`);
    };
    const seek = (time) => {
      for (const track of tracks) {
        track.delays.forEach((delay, index) => {
          const local = time - track.start - delay;
          const linear = track.duration ? clamp01(local / track.duration) : Number(local >= 0);
          if (linear === track.shown[index]) return;
          track.shown[index] = linear;
          track.render(track.ease(linear), index, linear);
        });
      }
    };
    const api = {
      add(render, { at, duration = TWEEN_DURATION, ease = EASES.power1Out, count = 1, stagger = 0 } = {}) {
        const start = startOf(at);
        const delays = staggerDelays(count, stagger);
        tracks.push({ render, start, duration, ease, delays, shown: [] });
        recent = { start, end: start + Math.max(...delays) + duration };
        length = Math.max(length, recent.end);
        return api;
      },
      progress: (share) => seek(share * length),
    };
    return api;
  };

  const splitLines = (element, byWord) => {
    const original = [...element.childNodes];
    const overlays = original.filter((node) => node.nodeType === Node.ELEMENT_NODE && node.classList.contains('line'));
    const content = original.filter((node) => !overlays.includes(node));
    const riser = (index, nodes, className) => {
      const line = document.createElement('span');
      line.className = className;
      line.style.setProperty('--line', index);
      line.append(...nodes);
      return line;
    };
    const lineMask = (nodes) => {
      const mask = document.createElement('span');
      mask.className = 'rv-mask';
      mask.append(...nodes);
      return mask;
    };
    if (!content.every((node) => node.nodeType === Node.TEXT_NODE || node.nodeName === 'BR')) {
      element.replaceChildren(lineMask([riser(0, content, 'rv-line')]), ...overlays);
      return original;
    }
    const words = [];
    element.replaceChildren(...content.flatMap((node) => {
      if (node.nodeName === 'BR') return [node];
      return node.textContent.split(/(\s+)/).filter(Boolean).map((part) => {
        if (!part.trim()) return document.createTextNode(part);
        const word = document.createElement('span');
        word.textContent = part;
        words.push(word);
        return word;
      });
    }), ...overlays);
    const rows = [];
    for (const word of words) {
      const row = rows.at(-1);
      if (row && row.top === word.offsetTop) row.words.push(word.textContent);
      else rows.push({ top: word.offsetTop, words: [word.textContent] });
    }
    let wordIndex = 0;
    const masks = rows.map((row, index) => lineMask(byWord
      ? row.words.flatMap((word, position) => [...(position ? [' '] : []), riser(wordIndex++, [word], 'rv-line rv-word')])
      : [riser(index, [row.words.join(' ')], 'rv-line')]));
    element.replaceChildren(...masks, ...overlays);
    return original;
  };
  const reveal = (() => {
    if (REDUCED_MOTION.matches) return { hold() {}, release() {} };
    const triggerSelector = REVEAL_TRIGGERS.map(([selector]) => selector).join(', ');
    const ownerOf = (target) => target.closest(triggerSelector) || target.parentElement;
    const shares = new Map();
    for (const [effect, selector] of Object.entries(REVEAL_EFFECTS)) {
      for (const target of document.querySelectorAll(selector)) {
        target.classList.add(`rv-${effect}`, 'rv-pending');
        const trigger = ownerOf(target);
        if (!shares.has(trigger)) shares.set(trigger, (REVEAL_TRIGGERS.find(([triggers]) => trigger.matches(triggers)) || [null, 0])[1]);
      }
    }
    const settle = async (target, original) => {
      const transitions = target.getAnimations({ subtree: true }).filter((animation) => animation instanceof CSSTransition);
      await Promise.allSettled(transitions.map((animation) => animation.finished));
      if (original) target.replaceChildren(...original);
      target.classList.remove(...REVEAL_STATES);
    };
    const begin = (target) => {
      const byWord = target.classList.contains('rv-words');
      if (!byWord && !target.classList.contains('rv-text')) {
        target.classList.remove('rv-pending');
        settle(target, null);
        return;
      }
      const original = splitLines(target, byWord);
      target.classList.replace('rv-pending', 'rv-start');
      target.getBoundingClientRect();
      target.classList.remove('rv-start');
      settle(target, original);
    };
    const near = new Set();
    const held = new Set();
    const watcher = new IntersectionObserver((entries) => {
      for (const { target, isIntersecting, boundingClientRect } of entries) {
        if (isIntersecting || boundingClientRect.top < 0) near.add(target);
        else near.delete(target);
      }
      requestCheck();
    });
    const play = (trigger) => {
      near.delete(trigger);
      shares.delete(trigger);
      watcher.unobserve(trigger);
      for (const target of trigger.querySelectorAll('.rv-pending')) if (ownerOf(target) === trigger) begin(target);
    };
    let checkFrame = 0;
    const check = () => {
      checkFrame = 0;
      for (const trigger of near) {
        if (held.has(trigger)) continue;
        const { top, height } = trigger.getBoundingClientRect();
        if (top + shares.get(trigger) * height <= innerHeight) play(trigger);
      }
    };
    const requestCheck = () => { if (!checkFrame) checkFrame = requestAnimationFrame(check); };
    for (const trigger of shares.keys()) watcher.observe(trigger);
    window.addEventListener('scroll', requestCheck, { passive: true });
    window.addEventListener('resize', requestCheck);
    const playAll = () => { for (const trigger of [...shares.keys()]) play(trigger); };
    window.addEventListener('beforeprint', playAll);
    REDUCED_MOTION.addEventListener('change', playAll);
    return {
      hold: (trigger) => held.add(trigger),
      release: (trigger) => {
        held.delete(trigger);
        if (shares.has(trigger)) play(trigger);
      },
    };
  })();

  const loader = document.querySelector('.loading');
  const heroSection = document.querySelector('.home-hero');
  const heroDrawing = heroSection && heroSection.querySelector('.drawing');
  if (loader && heroDrawing && !REDUCED_MOTION.matches) {
    const root = document.documentElement;
    const sheet = loader.querySelector('.loading-sheet');
    const image = loader.querySelector('.loading-img');
    const content = loader.querySelector('.loading-content');
    const progressBar = loader.querySelector('.loading-progress-line');
    const counter = loader.querySelector('.loading-progress-text');
    const edges = [...loader.querySelectorAll('.loading-edge')];
    const headerParts = [...document.querySelectorAll('.header-logo, .header-menu-wrap')];
    root.classList.add('is-loading');
    reveal.hold(heroSection);
    const placeSketch = () => {
      const sheetBox = loader.getBoundingClientRect();
      const drawingBox = heroDrawing.getBoundingClientRect();
      Object.assign(image.style, {
        left: `${drawingBox.left - sheetBox.left}px`,
        top: `${drawingBox.top - sheetBox.top}px`,
        width: `${drawingBox.width}px`,
        height: `${drawingBox.height}px`,
      });
    };
    placeSketch();
    document.fonts.ready.then(placeSketch);
    window.addEventListener('resize', placeSketch);
    const sketch = heroDrawing.cloneNode(true);
    for (const node of [sketch, ...sketch.querySelectorAll('[id]')]) node.removeAttribute('id');
    for (const name of ['role', 'aria-labelledby']) sketch.removeAttribute(name);
    sketch.querySelector('title')?.remove();
    sketch.setAttribute('aria-hidden', 'true');
    image.append(sketch);
    const parts = [...sketch.querySelectorAll('path, line, circle, rect, polygon, polyline, ellipse, text')];
    const drawTiming = (index) => ({ duration: LOADER_DRAW_MS, delay: index * LOADER_DRAW_SPREAD_MS / parts.length, easing: token('--ease-out-quad'), fill: 'backwards' });
    parts.forEach((part, index) => {
      const { stroke, strokeDasharray } = getComputedStyle(part);
      if (part.nodeName === 'text' || stroke === 'none' || strokeDasharray !== 'none') {
        part.animate([{ opacity: 0 }, { opacity: 1 }], drawTiming(index));
        return;
      }
      const length = part.getTotalLength();
      part.style.strokeDasharray = length;
      part.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], drawTiming(index));
    });
    const started = performance.now();
    let counterFrame = 0;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(counterFrame);
      window.removeEventListener('resize', placeSketch);
      loader.classList.add('loaded');
      root.classList.remove('is-loading');
      reveal.release(heroSection);
    };
    const showPage = () => {
      if (finished) return;
      sheet.style.visibility = 'hidden';
      for (const part of headerParts) part.animate([{ opacity: 0 }, { opacity: 1 }], { duration: HEADER_FADE_MS, easing: token('--ease-out-cubic') });
    };
    const open = () => {
      const box = loader.getBoundingClientRect();
      const frame = heroSection.querySelector('.home-hero-img').getBoundingClientRect();
      const from = progressBar.getBoundingClientRect().top - box.top;
      const stops = [frame.top - box.top, frame.bottom - box.top];
      const timing = { duration: LOADER_SPLIT_MS, easing: token('--ease-out-cubic'), fill: 'forwards' };
      for (const part of [content, counter]) part.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LOADER_FADE_MS, fill: 'forwards' });
      progressBar.style.visibility = 'hidden';
      edges.forEach((edge, index) => {
        Object.assign(edge.style, { top: `${from}px`, visibility: 'visible' });
        edge.animate([
          { transform: 'none', backgroundColor: token('--brand') },
          { transform: `translateY(${stops[index] - from}px)`, backgroundColor: token('--rule') },
        ], timing);
      });
      const hole = (top, bottom) => `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, 0 ${top}px, 100% ${top}px, 100% ${bottom}px, 0 ${bottom}px, 0 ${top}px)`;
      sheet.animate([{ clipPath: hole(from, from) }, { clipPath: hole(...stops) }], timing).finished.then(showPage, showPage);
      setTimeout(finish, Math.max(0, LOADED_AT_MS - (performance.now() - started)));
    };
    const count = (now) => {
      const elapsed = now - started;
      const value = elapsed < LOADER_FIRST_MS
        ? LOADER_FIRST_SHARE * EASES.power2Out(elapsed / LOADER_FIRST_MS)
        : LOADER_FIRST_SHARE + (LOADER_FULL - LOADER_FIRST_SHARE) * EASES.power3Out(clamp01((elapsed - LOADER_FIRST_MS) / LOADER_SECOND_MS));
      counter.textContent = `${Math.round(value)}%`;
      progressBar.style.width = `${value}%`;
      if (value < LOADER_FULL) counterFrame = requestAnimationFrame(count);
      else open();
    };
    counterFrame = requestAnimationFrame(count);
    document.addEventListener('keydown', finish, { once: true });
  } else if (loader) {
    loader.classList.add('loaded');
  }

  const [navigation] = performance.getEntriesByType('navigation');
  const arrivedFromElsewhere = !document.referrer || new URL(document.referrer).origin !== location.origin;
  if (!loader && !REDUCED_MOTION.matches && navigation && navigation.type === 'navigate' && arrivedFromElsewhere) {
    const cover = document.createElement('div');
    cover.className = 'page-mark';
    cover.setAttribute('aria-hidden', 'true');
    cover.innerHTML = '<svg viewBox="0 0 40 40"><use href="assets/mark.svg#mark"/></svg>';
    document.documentElement.append(cover);
    document.body.style.clipPath = 'inset(50%)';
    const opened = () => document.body.style.removeProperty('clip-path');
    cover.querySelector('svg').animate(
      [{ strokeDashoffset: 1, stroke: token('--rule') }, { strokeDashoffset: 0, stroke: token('--brand') }],
      { duration: PAGE_MARK_MS, easing: token('--ease-out-quad'), fill: 'forwards' },
    ).finished.then(() => {
      cover.remove();
      opened();
      document.body.animate([{ clipPath: 'inset(50%)' }, { clipPath: 'inset(0%)' }], { duration: PAGE_OPEN_MS, easing: token('--ease-out-quad') });
    }, opened);
  }

  const cursor = { canvas: null, context: null, pointer: null, head: null, trail: [], frame: 0, last: 0, hidden: true, colour: '' };
  const sizeCursor = () => {
    const ratio = devicePixelRatio || 1;
    cursor.canvas.width = Math.round(innerWidth * ratio);
    cursor.canvas.height = Math.round(innerHeight * ratio);
    cursor.context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const drawCursor = (time) => {
    const elapsed = cursor.last ? time - cursor.last : FRAME_MS;
    cursor.last = time;
    const { context, head, pointer, trail } = cursor;
    const share = 1 - (1 - CURSOR_FOLLOW) ** (elapsed / FRAME_MS);
    const step = { x: (pointer.x - head.x) * share, y: (pointer.y - head.y) * share };
    head.x += step.x;
    head.y += step.y;
    if (Math.hypot(step.x, step.y) > CURSOR_SETTLE_PX) trail.push({ x: head.x, y: head.y, time });
    while (trail.length && time - trail[0].time > TRAIL_MS) trail.shift();
    context.clearRect(0, 0, innerWidth, innerHeight);
    if (!cursor.hidden) {
      context.strokeStyle = cursor.colour;
      context.fillStyle = cursor.colour;
      context.lineWidth = 1;
      for (let index = 1; index < trail.length; index += 1) {
        context.globalAlpha = TRAIL_ALPHA * (1 - (time - trail[index].time) / TRAIL_MS);
        context.beginPath();
        context.moveTo(trail[index - 1].x, trail[index - 1].y);
        context.lineTo(trail[index].x, trail[index].y);
        context.stroke();
      }
      context.globalAlpha = 1;
      context.fillRect(head.x - CURSOR_SIZE_PX / 2, head.y - CURSOR_SIZE_PX / 2, CURSOR_SIZE_PX, CURSOR_SIZE_PX);
    }
    const settled = !trail.length && Math.hypot(pointer.x - head.x, pointer.y - head.y) < CURSOR_SETTLE_PX;
    cursor.frame = settled ? 0 : requestAnimationFrame(drawCursor);
  };
  const wakeCursor = () => {
    if (cursor.frame) return;
    cursor.last = 0;
    cursor.frame = requestAnimationFrame(drawCursor);
  };
  document.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    if (!CURSOR_POINTER.matches || REDUCED_MOTION.matches) {
      if (cursor.canvas && !cursor.hidden) {
        cursor.hidden = true;
        wakeCursor();
      }
      return;
    }
    if (!cursor.canvas) {
      cursor.canvas = document.createElement('canvas');
      cursor.canvas.className = 'cursor-canvas';
      cursor.canvas.setAttribute('aria-hidden', 'true');
      cursor.context = cursor.canvas.getContext('2d');
      document.body.append(cursor.canvas);
      sizeCursor();
      window.addEventListener('resize', sizeCursor);
    }
    cursor.pointer = { x: event.clientX, y: event.clientY };
    cursor.head ??= { ...cursor.pointer };
    cursor.hidden = Boolean(event.target.closest('.home-hero-img'));
    cursor.colour = token('--brand');
    wakeCursor();
  });
  document.addEventListener('mouseout', (event) => {
    if (event.relatedTarget || !cursor.canvas) return;
    cursor.hidden = true;
    wakeCursor();
  });

  const progress = document.querySelector('.demo-progress-value');
  const progressBar = document.querySelector('.mini-progress span');
  if (progress && progressBar) progressBar.style.width = `${Number(progress.textContent)}%`;

  const toggle = document.querySelector('.tree-toggle');
  const branches = document.querySelector('#tree-branches');
  if (toggle && branches) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      branches.hidden = expanded;
      toggle.querySelector('.tree-toggle-icon').textContent = expanded ? '+' : '−';
    });
  }

  const marquee = document.querySelector('.home-hero-work');
  const marqueeCopy = marquee && marquee.querySelector('.home-hero-work-inner');
  if (marqueeCopy) {
    const fillMarquee = () => {
      const copyWidth = marqueeCopy.offsetWidth;
      if (!copyWidth) return;
      const needed = Math.ceil(marquee.clientWidth / copyWidth) + 1;
      const copies = marquee.querySelectorAll('.home-hero-work-inner');
      for (let count = copies.length; count < needed; count += 1) {
        const clone = marqueeCopy.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        marquee.append(clone);
      }
      for (let index = copies.length - 1; index >= needed; index -= 1) copies[index].remove();
      marquee.style.setProperty('--marquee-duration', `${Math.round(copyWidth / MARQUEE_PX_PER_SECOND)}s`);
    };
    const marqueeResizes = new ResizeObserver(fillMarquee);
    marqueeResizes.observe(marquee);
    marqueeResizes.observe(marqueeCopy);
  }

  const statementTitle = document.querySelector('.statement-title');
  if (statementTitle && !REDUCED_MOTION.matches) {
    statementTitle.setAttribute('aria-label', statementTitle.textContent.replace(/\s+/g, ' ').trim());
    const chars = [];
    const walker = document.createTreeWalker(statementTitle, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      const fragment = document.createDocumentFragment();
      for (const part of node.textContent.split(/(\s+)/)) {
        if (!part.trim()) {
          fragment.append(part);
          continue;
        }
        const word = document.createElement('span');
        word.className = 'word';
        for (const letter of part) {
          const char = document.createElement('span');
          char.className = 'char';
          char.setAttribute('aria-hidden', 'true');
          char.textContent = letter;
          word.append(char);
          chars.push(char);
        }
        fragment.append(word);
      }
      node.replaceWith(fragment);
    }
    const inking = timeline().add((share, index) => chars[index].style.setProperty('--ink-share', share.toFixed(3)), { count: chars.length, stagger: STATEMENT_CHAR_STAGGER });
    scene(statementTitle, { ...STATEMENT_SCRUB, onProgress: inking.progress });
  }

  const statementMedia = document.querySelector('.statement-media');
  const inkEdge = statementMedia && statementMedia.querySelector('.statement-ink-edge');
  if (inkEdge) {
    scene(statementMedia, {
      ...INK_SCRUB,
      onProgress: (progress, { width, height }) => {
        const edge = (height * progress).toFixed(1);
        inkEdge.setAttribute('d', `M0 ${edge} Q${width / 2} ${(INK_BULGE * edge).toFixed(1)} ${width} ${edge} L${width} 0 L0 0Z`);
      },
    });
  }

  const strip = document.querySelector('.statement-strip');
  const stripList = strip && strip.querySelector('.statement-strip-list');
  const stripTrack = stripList && stripList.querySelector('.statement-strip-track');
  if (stripTrack && stripTrack.children.length) {
    const originals = [...stripTrack.children];
    const controls = [...strip.querySelectorAll('.statement-strip-ctrl')];
    let index = 0;
    let autoplay = 0;
    let paused = false;
    const itemWidth = () => originals[0].getBoundingClientRect().width;
    const place = (animate) => {
      stripTrack.style.transition = animate && !REDUCED_MOTION.matches ? `transform ${STRIP_SPEED_MS}ms ease` : 'none';
      stripTrack.style.transform = `translateX(${-index * itemWidth()}px)`;
    };
    const wrapIndex = () => {
      if (index < originals.length) return;
      index -= originals.length;
      place(false);
    };
    const step = (direction) => {
      const delta = direction * (DESKTOP.matches ? STRIP_STEP_DESKTOP : STRIP_STEP_NARROW);
      if (index + delta < 0) {
        index += originals.length;
        place(false);
        stripTrack.getBoundingClientRect();
      }
      index += delta;
      place(true);
      if (REDUCED_MOTION.matches) wrapIndex();
    };
    const stopAutoplay = () => { clearInterval(autoplay); autoplay = 0; };
    const startAutoplay = () => {
      stopAutoplay();
      if (REDUCED_MOTION.matches || controls.some((control) => control.disabled)) return;
      autoplay = setInterval(() => { if (!paused) step(1); }, STRIP_AUTOPLAY_MS);
    };
    const layoutStrip = () => {
      for (const clone of stripTrack.querySelectorAll('[data-clone]')) clone.remove();
      const width = itemWidth();
      const overflowing = Math.round(originals.length * width) > stripList.clientWidth;
      for (const control of controls) control.disabled = !overflowing;
      if (overflowing) {
        const visible = Math.ceil(stripList.clientWidth / width);
        const copies = Math.ceil((STRIP_STEP_DESKTOP - 1 + visible) / originals.length);
        for (let copy = 0; copy < copies; copy += 1) {
          for (const item of originals) {
            const clone = item.cloneNode(true);
            clone.dataset.clone = '';
            clone.setAttribute('aria-hidden', 'true');
            clone.inert = true;
            stripTrack.append(clone);
          }
        }
      } else {
        index = 0;
      }
      place(false);
      startAutoplay();
    };
    stripTrack.addEventListener('transitionend', (event) => { if (event.target === stripTrack) wrapIndex(); });
    for (const control of controls) {
      control.addEventListener('click', () => {
        step(Number(control.dataset.step));
        startAutoplay();
      });
    }
    stripTrack.addEventListener('focusin', (event) => {
      const focused = originals.indexOf(event.target.closest('.statement-strip-item'));
      if (focused < 0) return;
      index = focused;
      place(true);
    });
    strip.addEventListener('pointerenter', () => { paused = true; });
    strip.addEventListener('pointerleave', () => { paused = false; });
    strip.addEventListener('focusin', () => { paused = true; });
    strip.addEventListener('focusout', () => { paused = false; });
    new ResizeObserver(layoutStrip).observe(stripList);
    REDUCED_MOTION.addEventListener('change', startAutoplay);
  }

  const plan = document.querySelector('.bench-plan');
  const planStage = plan && plan.querySelector('.bench-plan-stage');
  const planCanvas = planStage && planStage.querySelector('.bench-plan-canvas');
  if (planCanvas) {
    scene(plan, {
      ...PLAN_ENTRY,
      onProgress: (progress, { top }) => {
        const pinnedAt = parseFloat(getComputedStyle(planStage).top);
        const below = progress < 1 && DESKTOP.matches ? Math.min(Math.max(top - pinnedAt, 0), planStage.offsetHeight) : 0;
        planCanvas.style.setProperty('--plan-entry', `${-below}px`);
      },
    });
    const sequence = timeline();
    for (const heading of planCanvas.querySelectorAll('.bench-plan-heading')) {
      sequence
        .add((share) => heading.style.setProperty('--heading-in', share.toFixed(4)), PLAN_HEADING_IN)
        .add((share) => heading.style.setProperty('--heading-out', share.toFixed(4)), PLAN_HEADING_OUT);
    }
    const [wallLayer, ...detailLayers] = planCanvas.querySelectorAll('.bench-plan-layer');
    const walls = [...planCanvas.querySelectorAll('.bench-plan-wall')];
    const begun = new Set();
    const showLayer = (layer) => (share, index, linear) => {
      layer.style.setProperty('--layer-share', share.toFixed(4));
      if (linear > 0) begun.add(layer);
      else begun.delete(layer);
    };
    const limitsLayer = planCanvas.querySelector('.bench-plan-limits');
    const limits = [...plan.querySelectorAll('.limit-marker')].map((marker) => {
      const callout = document.getElementById(marker.getAttribute('aria-controls'));
      return { marker, callout, body: callout.querySelector('.limit-callout-body'), mark: limitsLayer && limitsLayer.querySelector(`[data-limit="${callout.id}"]`), slide: null };
    });
    const markLimit = (limit, state, on) => {
      limit.callout.classList.toggle(state, on);
      if (limit.mark) limit.mark.classList.toggle(state, on);
    };
    const slideLimit = (limit, open) => {
      const { body } = limit;
      const from = body.classList.contains('is-open') ? body.getBoundingClientRect().height : 0;
      if (limit.slide) limit.slide.cancel();
      body.classList.add('is-open');
      const to = open ? body.scrollHeight : 0;
      limit.slide = body.animate({ height: [`${from}px`, `${to}px`] }, { duration: REDUCED_MOTION.matches || !WIDER_THAN_PHONE.matches ? 0 : FAQ_SLIDE_MS, easing: token('--ease-swing') });
      limit.slide.onfinish = () => {
        limit.slide = null;
        body.classList.toggle('is-open', open);
      };
    };
    const openLimit = (chosen) => {
      for (const limit of limits) {
        const open = limit === chosen;
        if (limit.marker.getAttribute('aria-expanded') === String(open)) continue;
        limit.marker.setAttribute('aria-expanded', String(open));
        markLimit(limit, 'is-active', open);
        slideLimit(limit, open);
      }
    };
    let limitsTurning = false;
    const showLimits = limitsLayer && showLayer(limitsLayer);
    const turnLimits = (share, index, linear) => {
      showLimits(share, index, linear);
      const turning = linear > 0 && linear < 1;
      if (!turning && (limitsTurning || linear === 0)) openLimit(null);
      limitsTurning = turning;
    };
    if (wallLayer && walls.length) {
      sequence
        .add(showLayer(wallLayer), PLAN_WALLS_IN)
        .add((share, index) => walls[index].style.setProperty('--wall', share.toFixed(4)), { ...PLAN_WALL_PIECES, count: walls.length });
      for (const layer of detailLayers) sequence.add(layer === limitsLayer ? turnLimits : showLayer(layer));
    }
    const captionBox = plan.querySelector('.caption-box');
    const captionList = captionBox && captionBox.querySelector('.caption-box-list');
    const captions = captionList ? [...captionList.querySelectorAll('.caption-box-item')] : [];
    const captionHeights = new Map();
    const showCaption = () => {
      if (!captions.length) return;
      const latestLayer = detailLayers.findLastIndex((layer) => begun.has(layer));
      const step = Math.min(Math.max(latestLayer, 0), captions.length - 1);
      captionBox.classList.toggle('is-active', begun.has(wallLayer));
      captions.forEach((caption, index) => caption.classList.toggle('is-active', index === step));
      if (captionHeights.has(captions[step])) captionList.style.setProperty('--caption-height', `${captionHeights.get(captions[step])}px`);
    };
    const captionSizes = new ResizeObserver((entries) => {
      for (const { target, borderBoxSize: [size] } of entries) captionHeights.set(target, size.blockSize);
      showCaption();
    });
    for (const caption of captions) captionSizes.observe(caption);
    const planPanel = plan.querySelector('.bench-plan-panel');
    let panelRevealQueued = false;
    if (planPanel && WIDER_THAN_PHONE.matches) reveal.hold(planPanel);
    else if (planPanel) reveal.release(planPanel);
    const expand = (expanded) => {
      plan.classList.toggle('expanded', expanded);
      if (!expanded || !planPanel || panelRevealQueued) return;
      panelRevealQueued = true;
      setTimeout(() => reveal.release(planPanel), PLAN_PANEL_REVEAL_MS);
    };
    const planScrub = scene(plan, {
      ...PLAN_SCRUB,
      onProgress: (progress) => {
        sequence.progress(progress);
        showCaption();
        plan.classList.toggle('is-started', progress > 0);
        plan.classList.toggle('is-limits-live', begun.has(limitsLayer));
        expand(progress === 1);
      },
    });
    for (const limit of limits) {
      const { marker } = limit;
      marker.addEventListener('mouseenter', () => markLimit(limit, 'is-hover', true));
      marker.addEventListener('mouseleave', () => markLimit(limit, 'is-hover', false));
      marker.addEventListener('focus', () => {
        if (!begun.has(limitsLayer)) scrollTo(0, planScrub.scrollAt(1));
        if (marker.matches(':focus-visible')) markLimit(limit, 'is-hover', true);
      });
      marker.addEventListener('blur', () => markLimit(limit, 'is-hover', false));
      marker.addEventListener('click', () => openLimit(marker.getAttribute('aria-expanded') === 'true' ? null : limit));
    }
    if (limits.length) {
      document.addEventListener('click', (event) => {
        if (!event.target.closest('.limit-marker')) openLimit(null);
      });
      document.addEventListener('keydown', (event) => {
        const open = limits.find(({ marker }) => marker.getAttribute('aria-expanded') === 'true');
        if (event.key !== 'Escape' || !open) return;
        if (open.callout.contains(document.activeElement)) open.marker.focus();
        openLimit(null);
      });
    }
  }

  const toolInfos = [...document.querySelectorAll('.tool-row-info')];
  if (toolInfos.length) {
    const infoFor = (art) => toolInfos.find((info) => info.dataset.tool === art.dataset.tool);
    const centreInfos = () => {
      for (const info of toolInfos) info.style.top = `${Math.max(0, (innerHeight - info.getBoundingClientRect().height) / 2)}px`;
    };
    const infoResizes = new ResizeObserver(centreInfos);
    for (const info of toolInfos) infoResizes.observe(info);
    window.addEventListener('resize', centreInfos);
    const activate = (active) => { for (const info of toolInfos) info.classList.toggle('active', info === active); };
    const midline = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) activate(infoFor(entry.target));
    }, { rootMargin: '-50% 0px -50% 0px' });
    for (const art of document.querySelectorAll('.tool-row-art')) {
      midline.observe(art);
      const info = infoFor(art);
      info.addEventListener('focusin', () => {
        if (DESKTOP.matches && !info.classList.contains('active')) art.scrollIntoView();
      });
    }
  }

  const cellList = document.querySelector('.cell-list');
  const cellBars = cellList && [...cellList.parentElement.querySelectorAll('.cell-pagi span')];
  if (cellBars && cellBars.length) {
    const cells = [...cellList.children];
    let cellFrame = 0;
    const markCell = () => {
      cellFrame = 0;
      const index = Math.round(cellList.scrollLeft / cellList.firstElementChild.offsetWidth);
      cells.forEach((cell, position) => cell.classList.toggle('active', position === index));
      cellBars.forEach((bar, position) => bar.classList.toggle('active', position === index));
    };
    cellList.addEventListener('scroll', () => { if (!cellFrame) cellFrame = requestAnimationFrame(markCell); }, { passive: true });
    markCell();
  }

  for (const list of document.querySelectorAll('.faq-list')) {
    const easing = token('--ease-swing');
    const opened = new Map();
    const slides = new Map();
    const isOpening = (details) => (slides.has(details) ? opened.get(details) : details.open);
    const slide = (details, open) => {
      const body = details.querySelector('.faq-body');
      if (slides.has(details)) slides.get(details).cancel();
      opened.set(details, open);
      details.open = true;
      const shut = { height: '0px', paddingTop: '0px', overflow: 'hidden' };
      const full = { height: `${body.getBoundingClientRect().height}px`, paddingTop: getComputedStyle(body).paddingTop, overflow: 'hidden' };
      const animation = body.animate(open ? [shut, full] : [full, shut], { duration: REDUCED_MOTION.matches ? 0 : FAQ_SLIDE_MS, easing });
      slides.set(details, animation);
      animation.onfinish = () => {
        slides.delete(details);
        if (!open) details.open = false;
      };
    };
    const items = [...list.querySelectorAll('.faq-details')];
    for (const details of items) details.removeAttribute('name');
    list.addEventListener('click', (event) => {
      const item = event.target.closest('.faq-item');
      if (!item || event.target.closest('.faq-body')) return;
      event.preventDefault();
      const details = item.querySelector('.faq-details');
      const open = !isOpening(details);
      if (open) for (const other of items) if (other !== details && isOpening(other)) slide(other, false);
      slide(details, open);
    });
  }

  const frame = document.querySelector('.home-hero-img');
  const crosshair = frame && frame.querySelector('.crosshair');
  const drawing = frame && frame.querySelector('.drawing');
  if (crosshair && drawing) {
    const [originX, originY] = drawing.dataset.origin.split(' ').map(Number);
    const unitsPerMm = Number(drawing.dataset.unitsPerMm);
    const readX = crosshair.querySelector('.crosshair-x');
    const readY = crosshair.querySelector('.crosshair-y');
    const target = { x: 0, y: 0 };
    let position = null;
    let lastFrame = 0;
    let followFrame = 0;
    const draw = () => {
      crosshair.style.setProperty('--cross-x', `${position.x}px`);
      crosshair.style.setProperty('--cross-y', `${position.y}px`);
      const bounds = frame.getBoundingClientRect();
      const point = new DOMPoint(bounds.left + position.x, bounds.top + position.y).matrixTransform(drawing.getScreenCTM().inverse());
      readX.textContent = `X:${((point.x - originX) / unitsPerMm).toFixed(1)}MM`;
      readY.textContent = `Y:${((originY - point.y) / unitsPerMm).toFixed(1)}MM`;
    };
    const follow = (time) => {
      const elapsed = lastFrame ? time - lastFrame : FRAME_MS;
      lastFrame = time;
      const share = 1 - Math.pow(1 - CROSSHAIR_FOLLOW, elapsed / FRAME_MS);
      position.x += (target.x - position.x) * share;
      position.y += (target.y - position.y) * share;
      const settled = Math.abs(target.x - position.x) < CROSSHAIR_SETTLE_PX && Math.abs(target.y - position.y) < CROSSHAIR_SETTLE_PX;
      if (settled) Object.assign(position, target);
      draw();
      followFrame = settled ? 0 : requestAnimationFrame(follow);
    };
    frame.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const bounds = frame.getBoundingClientRect();
      target.x = event.clientX - bounds.left;
      target.y = event.clientY - bounds.top;
      if (!position) position = { x: bounds.width / 2, y: bounds.height / 2 };
      crosshair.classList.add('active');
      if (REDUCED_MOTION.matches) {
        Object.assign(position, target);
        draw();
      } else if (!followFrame) {
        lastFrame = 0;
        followFrame = requestAnimationFrame(follow);
      }
    });
    frame.addEventListener('pointerleave', () => crosshair.classList.remove('active'));
  }

  const guides = frame && frame.querySelector('.hero-guides');
  if (guides && drawing) {
    const numbers = (name) => drawing.dataset[name].split(' ').map(Number);
    const guideXs = numbers('guidesX');
    const guideYs = numbers('guidesY');
    const [extentLeft, extentTop, extentRight, extentBottom] = numbers('extent');
    const guide = (classes) => {
      const line = document.createElement('i');
      line.className = `line ${classes} hero-guide`;
      guides.append(line);
      return line;
    };
    const rows = guideYs.map(() => guide('line-h line-dash'));
    const columns = guideXs.map(() => guide('line-v line-dash'));
    const brandColumn = guide('line-v hero-guide-brand');
    const brandRow = guide('line-h hero-guide-brand');
    const placeGuides = () => {
      const bounds = guides.getBoundingClientRect();
      const matrix = drawing.getScreenCTM();
      const toGuides = (x, y) => {
        const point = new DOMPoint(x, y).matrixTransform(matrix);
        return { x: point.x - bounds.left, y: point.y - bounds.top };
      };
      guideYs.forEach((y, index) => { rows[index].style.top = `${toGuides(0, y).y}px`; });
      guideXs.forEach((x, index) => { columns[index].style.left = `${toGuides(x, 0).x}px`; });
      const start = toGuides(extentLeft, extentTop);
      const end = toGuides(extentRight, extentBottom);
      Object.assign(brandColumn.style, { top: `${start.y}px`, height: `${end.y - start.y}px` });
      Object.assign(brandRow.style, { left: `${start.x}px`, width: `${end.x - start.x}px` });
    };
    const guideResizes = new ResizeObserver(placeGuides);
    guideResizes.observe(guides);
    guideResizes.observe(drawing);
    for (const zone of guides.querySelectorAll('.hero-zone')) {
      zone.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'mouse') return;
        guides.dataset.zone = zone.dataset.zone;
        guides.classList.add('active');
      });
    }
    guides.addEventListener('pointermove', (event) => {
      guides.style.setProperty('--px', `${event.clientX - guides.getBoundingClientRect().left}px`);
    });
    guides.addEventListener('pointerleave', () => guides.classList.remove('active'));
  }

  const band = document.querySelector('[data-band]');
  if (band) {
    const sketch = band.querySelector('.band-sketch');
    const solid = band.querySelector('.band-solid');
    const drawMarks = () => {
      if (!sketch.getBoundingClientRect().width) return;
      const lines = sketch.querySelector('.band-lines');
      const cap = new DOMMatrix(getComputedStyle(lines).transform).f;
      const tick = cap * BAND_TICK_SHARE;
      const context = document.createElement('canvas').getContext('2d');
      const path = [];
      for (const text of lines.querySelectorAll('text')) {
        const style = getComputedStyle(text);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        [...text.textContent].forEach((letter, index) => {
          if (!BAND_LETTER.test(letter)) return;
          const start = text.getStartPositionOfChar(index);
          const glyph = context.measureText(letter);
          const scale = (text.getEndPositionOfChar(index).x - start.x) / glyph.width;
          const left = start.x - glyph.actualBoundingBoxLeft * scale;
          const right = start.x + glyph.actualBoundingBoxRight * scale;
          for (const x of [left, right]) {
            for (const y of [start.y - cap, start.y]) path.push(`M${x} ${y - tick}V${y + tick}`);
          }
          if (ROUND_LETTER.test(letter)) {
            const centre = { x: (left + right) / 2, y: start.y - cap / 2 };
            path.push(`M${centre.x - tick} ${centre.y}H${centre.x + tick}M${centre.x} ${centre.y - tick}V${centre.y + tick}`);
          }
        });
      }
      lines.querySelector('.band-marks').setAttribute('d', path.join(''));
    };
    document.fonts.ready.then(() => new ResizeObserver(drawMarks).observe(sketch));

    const [turbulence, displacement, blur] = solid.querySelectorAll('feTurbulence, feDisplacementMap, feGaussianBlur');
    const blots = [...solid.querySelectorAll('.band-blot')].map((element, index) => ({
      element,
      follow: index ? BLOT_PULSE_FOLLOW : BLOT_FOLLOW,
      grow: index ? { radius: BLOT_PULSE_RADIUS, opacity: BLOT_PULSE_OPACITY, ms: BLOT_PULSE_GROW_MS } : { radius: 1, opacity: 1, ms: BLOT_GROW_MS },
      shrink: index ? { opacity: 0, ms: BLOT_PULSE_SHRINK_MS } : { opacity: 1, ms: BLOT_SHRINK_MS },
      x: 0, y: 0, radius: 0, opacity: Number(element.getAttribute('opacity') ?? 1), tween: null,
    }));
    const ink = { entered: false, frame: 0, unit: 1, radius: 0, target: { x: 0, y: 0 } };
    const measureInk = () => {
      const { width, height } = band.getBoundingClientRect();
      ink.unit = width / BAND_UNITS;
      const radiusUnits = BLOT_RADIUS_SHARE * Math.min(BAND_UNITS, (height / width) * BAND_UNITS);
      ink.radius = radiusUnits * ink.unit;
      turbulence.setAttribute('baseFrequency', INK_FREQUENCY_UNITS.map((frequency) => frequency / ink.unit).join(' '));
      displacement.setAttribute('scale', Math.min(INK_DISPLACEMENT_MAX_UNITS, radiusUnits * INK_DISPLACEMENT_SHARE) * ink.unit);
      blur.setAttribute('stdDeviation', INK_BLUR_UNITS * ink.unit);
    };
    const aimInk = (event) => {
      const area = band.getBoundingClientRect();
      const origin = solid.getBoundingClientRect();
      ink.target.x = Math.min(Math.max(event.clientX, area.left), area.right) - origin.left;
      ink.target.y = Math.min(Math.max(event.clientY, area.top), area.bottom) - origin.top;
    };
    const tweenBlot = (blot, radius, opacity, ms, time) => {
      blot.tween = { from: { radius: blot.radius, opacity: blot.opacity }, to: { radius, opacity }, start: time, ms: REDUCED_MOTION.matches ? 0 : ms };
    };
    const renderInk = (time) => {
      ink.frame = 0;
      let moving = false;
      for (const blot of blots) {
        if (blot.tween) {
          const share = blot.tween.ms ? Math.min(1, (time - blot.tween.start) / blot.tween.ms) : 1;
          blot.radius = blot.tween.from.radius + (blot.tween.to.radius - blot.tween.from.radius) * share;
          blot.opacity = blot.tween.from.opacity + (blot.tween.to.opacity - blot.tween.from.opacity) * share;
          blot.tween = share < 1 ? blot.tween : null;
        }
        if (ink.entered) {
          const follow = REDUCED_MOTION.matches ? 1 : blot.follow;
          blot.x += (ink.target.x - blot.x) * follow;
          blot.y += (ink.target.y - blot.y) * follow;
        }
        const settle = BLOT_SETTLE_UNITS * ink.unit;
        moving = moving || Boolean(blot.tween) || (ink.entered && (Math.abs(ink.target.x - blot.x) > settle || Math.abs(ink.target.y - blot.y) > settle));
        blot.element.setAttribute('cx', blot.x);
        blot.element.setAttribute('cy', blot.y);
        blot.element.setAttribute('r', Math.max(0, blot.radius));
        blot.element.setAttribute('opacity', blot.opacity);
      }
      if (moving) ink.frame = requestAnimationFrame(renderInk);
    };
    const requestInk = () => {
      if (!ink.frame) ink.frame = requestAnimationFrame(renderInk);
    };
    band.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || !DESKTOP.matches) return;
      measureInk();
      aimInk(event);
      ink.entered = true;
      for (const blot of blots) {
        Object.assign(blot, ink.target);
        tweenBlot(blot, ink.radius * blot.grow.radius, blot.grow.opacity, blot.grow.ms, document.timeline.currentTime);
      }
      requestInk();
    });
    band.addEventListener('pointermove', (event) => {
      if (!ink.entered) return;
      aimInk(event);
      requestInk();
    });
    band.addEventListener('pointerleave', () => {
      if (!ink.entered) return;
      ink.entered = false;
      for (const blot of blots) tweenBlot(blot, 0, blot.shrink.opacity, blot.shrink.ms, document.timeline.currentTime);
      requestInk();
    });
  }

  const sizeFill = (button) => {
    const bg = button.querySelector('.btn-fill-bg');
    const { width, height } = button.getBoundingClientRect();
    const ratio = devicePixelRatio || 1;
    const cell = Math.ceil(Math.max((width + FILL_BLEED_PX) / PIXEL_COLUMNS, (height + FILL_BLEED_PX) / PIXEL_ROWS) * ratio) / ratio;
    bg.style.width = `${cell * PIXEL_COLUMNS}px`;
    bg.style.height = `${cell * PIXEL_ROWS}px`;
  };
  const dissolve = (bg) => {
    const animation = bg.animate(
      [{ maskPosition: '0% 0', webkitMaskPosition: '0% 0' }, { maskPosition: '100% 0', webkitMaskPosition: '100% 0' }],
      { duration: FILL_DURATION_MS, easing: FILL_EASING },
    );
    animation.startTime = document.timeline.currentTime;
    return animation;
  };
  const fillButtons = [...document.querySelectorAll('.btn-fill')].filter((button) => button.querySelector('.btn-fill-bg'));
  const fillResets = fillButtons.map((button) => {
    const bg = button.querySelector('.btn-fill-bg');
    let entering = null;
    let exiting = null;
    let resetTimer;
    const exit = () => {
      if (button.classList.contains('is-active') || !button.classList.contains('is-entered')) return;
      button.classList.add('is-exiting');
      exiting = dissolve(bg);
      exiting.onfinish = () => { exiting = null; button.classList.remove('is-entered', 'is-exiting'); };
    };
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || !HOVER_DESKTOP.matches) return;
      if (exiting) { exiting.cancel(); exiting = null; }
      clearTimeout(resetTimer);
      button.classList.remove('is-exiting', 'is-resetting');
      button.classList.add('is-active');
      if (entering || button.classList.contains('is-entered')) return;
      button.classList.add('is-filling');
      entering = dissolve(bg);
      entering.onfinish = () => { entering = null; button.classList.replace('is-filling', 'is-entered'); exit(); };
    });
    button.addEventListener('pointerleave', () => {
      if (!button.classList.contains('is-active')) return;
      button.classList.remove('is-active');
      button.classList.add('is-resetting');
      resetTimer = setTimeout(() => button.classList.remove('is-resetting'), RESET_MS);
      if (!entering) exit();
    });
    return () => {
      for (const animation of [entering, exiting]) if (animation) animation.cancel();
      entering = null;
      exiting = null;
      clearTimeout(resetTimer);
      button.classList.remove(...FILL_STATES);
    };
  });
  const fillResizes = new ResizeObserver((entries) => { for (const { target } of entries) sizeFill(target); });
  for (const button of fillButtons) fillResizes.observe(button);
  HOVER_DESKTOP.addEventListener('change', () => { if (!HOVER_DESKTOP.matches) for (const reset of fillResets) reset(); });

  const header = document.querySelector('[data-header]');
  const menuButton = document.querySelector('.header-menu-btn');
  const menu = document.querySelector('#menu');
  if (!header || !menuButton || !menu) return;

  const setMenu = (open) => {
    menuButton.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('active', open);
  };
  menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (event) => { if (event.target.closest('a')) setMenu(false); });
  const dropdownGroups = [...menu.querySelectorAll('.header-menu-item-wrap')];
  const dismissDropdowns = () => {
    for (const group of dropdownGroups) {
      if (!group.matches(':hover, :focus-within')) continue;
      group.classList.add('is-dismissed');
      if (group.contains(document.activeElement)) group.querySelector('.header-menu-item').focus();
    }
  };
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    setMenu(false);
    if (DESKTOP.matches) dismissDropdowns();
  });
  for (const group of dropdownGroups) {
    const restore = () => group.classList.remove('is-dismissed');
    group.addEventListener('pointerleave', restore);
    group.addEventListener('focusout', (event) => { if (!group.contains(event.relatedTarget)) restore(); });
  }

  const headerHeight = () => header.getBoundingClientRect().height;
  const hideThreshold = () => HIDE_AFTER_HEADER_HEIGHTS * headerHeight();
  const markScrolled = (y) => header.classList.toggle('on-scroll', y > headerHeight());
  let lastScroll = scrollY;
  let settleTimer;
  markScrolled(lastScroll);
  window.addEventListener('scroll', () => {
    const y = scrollY;
    markScrolled(y);
    if (y !== lastScroll) {
      if (menuButton.getAttribute('aria-expanded') === 'true') setMenu(false);
      header.classList.toggle('on-hide', DESKTOP.matches && y > lastScroll && y > hideThreshold());
    }
    lastScroll = y;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => { if (DESKTOP.matches && scrollY > hideThreshold()) header.classList.add('on-hide'); }, SETTLE_DELAY_MS);
  }, { passive: true });
  DESKTOP.addEventListener('change', () => { if (!DESKTOP.matches) header.classList.remove('on-hide'); });
})();
