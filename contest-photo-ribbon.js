/* Galería en movimiento: solo fotografías de las fichas del concurso. */
(() => {
  'use strict';
  const anchor = document.querySelector('#feria') || document.querySelector('main .hero');
  if (!anchor || !window.firebase || document.getElementById('contest-photo-ribbon')) return;
  const section = document.createElement('section');
  section.id = 'contest-photo-ribbon';
  section.hidden = true;
  section.setAttribute('aria-labelledby', 'contest-ribbon-title');
  section.innerHTML = '<div class="cr-heading"><div><p class="cr-eyebrow">El talento de nuestros comerciantes</p><h2 id="contest-ribbon-title">Vitrinas y mostradores que iluminan Neiva</h2><p class="cr-description">Recorre las decoraciones del concurso y amplía tus favoritas.</p></div><div class="cr-actions"><button type="button" class="cr-pause" aria-pressed="false">Pausar movimiento</button><a href="./concurso.html">Ver participantes →</a></div></div><div class="cr-viewport" tabindex="0" role="region" aria-label="Fotos del concurso. Desliza para explorar."><div class="cr-track"><div class="cr-group"></div></div></div>';
  if (anchor.id === 'feria') anchor.before(section); else anchor.after(section);
  const viewport = section.querySelector('.cr-viewport');
  const track = section.querySelector('.cr-track');
  const group = section.querySelector('.cr-group');
  const button = section.querySelector('button');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, hovered = false, focused = false, visible = true;
  let last = 0, frame = 0, signature = '', interactedUntil = 0, offset = 0;
  function updateButton() {
    button.textContent = paused ? 'Reanudar movimiento' : 'Pausar movimiento';
    button.setAttribute('aria-pressed', String(paused));
  }
  function tick(now) {
    const delta = last ? Math.min(now - last, 50) : 0;
    last = now;
    if (!paused && !focused && visible && !document.hidden && now > interactedUntil) {
      const distance = group.getBoundingClientRect().width;
      if (distance > 0 && group.children.length > 1) {
        // Keep fractional pixels in memory: scrollLeft can round each assignment to zero.
        offset = (offset + delta * .045) % distance;
        viewport.scrollLeft = offset;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  button.addEventListener('click', () => { paused = !paused; updateButton(); });
  reduced.addEventListener('change', () => { paused = reduced.matches; updateButton(); });
  viewport.addEventListener('mouseenter', () => { hovered = true; });
  viewport.addEventListener('mouseleave', () => { hovered = false; });
  viewport.addEventListener('focusin', () => { focused = true; });
  viewport.addEventListener('focusout', event => { focused = viewport.contains(event.relatedTarget); });
  viewport.addEventListener('scroll', () => { if (performance.now() < interactedUntil) offset = viewport.scrollLeft; }, { passive: true });
  for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) viewport.addEventListener(type, () => { interactedUntil = performance.now() + 5000; }, { passive: true });
  if ('IntersectionObserver' in window) new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(section);
  function safeUrl(value) {
    try {
      const full = window.FeriaPhotos ? window.FeriaPhotos.full(String(value || '')) : String(value || '');
      const url = new URL(full);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }
  function render(snapshot) {
    const photos = [];
    snapshot.forEach(child => {
      const entry = child.val();
      if (!entry || !entry.name) return;
      const urls = Array.isArray(entry.photoUrls) ? entry.photoUrls : [];
      const seen = new Set();
      urls.forEach((value, i) => {
        const url = safeUrl(value);
        if (url && !seen.has(url)) { seen.add(url); photos.push({ name: String(entry.name), url, index: i + 1 }); }
      });
    });
    const next = JSON.stringify(photos);
    if (next === signature) return;
    signature = next;
    track.querySelector('.cr-copy')?.remove();
    group.replaceChildren();
    section.hidden = !photos.length;
    for (const photo of photos) {
      const link = document.createElement('a');
      link.className = 'cr-photo'; link.href = photo.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `Ampliar foto ${photo.index} de ${photo.name}`);
      const img = document.createElement('img');
      img.src = window.FeriaPhotos ? window.FeriaPhotos.thumb(photo.url) : photo.url;
      img.alt = `Decoración del concurso de ${photo.name}`;
      img.width = 300; img.height = 210; img.loading = 'lazy'; img.decoding = 'async';
      img.addEventListener('error', () => { link.hidden = true; }, { once: true });
      const caption = document.createElement('span'); caption.textContent = photo.name;
      link.append(img, caption); group.append(link);
    }
    // Visual copy closes the loop, without duplicating keyboard or screen-reader items.
    if (photos.length > 1) {
      const copy = group.cloneNode(true); copy.classList.add('cr-copy'); copy.setAttribute('aria-hidden', 'true'); copy.inert = true;
      copy.querySelectorAll('a').forEach(a => { a.tabIndex = -1; });
      copy.querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.parentElement.hidden = true; }, { once: true }));
      track.append(copy);
    }
    offset = 0;
    viewport.scrollLeft = 0;
    button.hidden = photos.length < 2;
    if (!frame && photos.length) frame = requestAnimationFrame(tick);
  }
  updateButton();
  firebase.database().ref('approvedShops/_contestEntries').on('value', render, () => { section.hidden = true; });
})();

