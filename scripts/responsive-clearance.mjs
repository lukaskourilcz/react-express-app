// Scrolled to the end of a page, nothing readable may sit under the fixed
// ocean footer. The shell reserves space for it; this proves the reserve is
// still big enough, which is the one thing a horizontal-overflow probe cannot
// see. The app scrolls inside <main>, not the window.
export const CLEARANCE = `(async () => {
  const scroller = document.querySelector('main') || document.scrollingElement;
  if (scroller) {
    // Late query/error UI can grow the page after the first scroll. Measure
    // the real page end, rather than mistaking that growth for covered links.
    for (let attempt = 0; attempt < 4; attempt++) {
      scroller.scrollTop = scroller.scrollHeight;
      await new Promise((r) => setTimeout(r, 250));
      if (scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop < 2) break;
    }
  }
  // The decorative overlays: fixed or absolute, ignored by the pointer, and
  // sitting against the bottom of the viewport.
  const overlays = [];
  for (const el of document.querySelectorAll('body *')) {
    const style = getComputedStyle(el);
    if (style.position !== 'fixed' && style.position !== 'absolute') continue;
    if (style.pointerEvents !== 'none') continue;
    const r = el.getBoundingClientRect();
    if (r.height === 0 || r.width < window.innerWidth * 0.5) continue;
    if (r.bottom < window.innerHeight - 4 || r.top > window.innerHeight) continue;
    // A band along the bottom, not a page-height decorative layer: a tall
    // layer covers the whole viewport by definition and would flag everything.
    if (r.height > window.innerHeight * 0.35) continue;
    overlays.push(r);
  }
  if (overlays.length === 0) return { covered: [], overlays: 0 };

  const TEXTY = new Set(['A', 'BUTTON', 'P', 'SPAN', 'STRONG', 'LI', 'DD', 'DT', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LABEL', 'SMALL']);
  const covered = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!TEXTY.has(el.tagName)) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (!el.textContent || !el.textContent.trim()) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) continue;
    const bounds = el.getBoundingClientRect();
    if (bounds.height === 0 || bounds.width === 0) continue;
    // DOM bounds include content outside a nested scrollport. Only the part
    // actually painted through each clipping ancestor can meet the ocean.
    const r = { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right };
    for (let parent = el.parentElement; parent; parent = parent.parentElement) {
      const parentStyle = getComputedStyle(parent);
      const clipsX = /^(auto|scroll|hidden|clip)$/.test(parentStyle.overflowX);
      const clipsY = /^(auto|scroll|hidden|clip)$/.test(parentStyle.overflowY);
      if (!clipsX && !clipsY) continue;
      const box = parent.getBoundingClientRect();
      const left = box.left + parent.clientLeft;
      const top = box.top + parent.clientTop;
      if (clipsX) { r.left = Math.max(r.left, left); r.right = Math.min(r.right, left + parent.clientWidth); }
      if (clipsY) { r.top = Math.max(r.top, top); r.bottom = Math.min(r.bottom, top + parent.clientHeight); }
    }
    if (r.bottom <= r.top || r.right <= r.left) continue;
    if (r.top >= window.innerHeight || r.bottom <= 0) continue;
    // Measured against each band in turn, on both axes.
    let overlap = 0;
    for (const band of overlays) {
      const vertical = Math.min(r.bottom, band.bottom) - Math.max(r.top, band.top);
      const horizontal = Math.min(r.right, band.right) - Math.max(r.left, band.left);
      if (vertical > 0 && horizontal > 0) overlap = Math.max(overlap, vertical);
    }
    if (overlap > 2) {
      covered.push({
        tag: el.tagName.toLowerCase(),
        text: el.textContent.trim().slice(0, 40),
        overlap: Math.round(overlap),
      });
      if (covered.length >= 6) break;
    }
  }
  return { covered, overlays: overlays.length };
})()`;
