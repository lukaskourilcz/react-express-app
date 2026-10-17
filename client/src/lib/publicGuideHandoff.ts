interface StartupGuide {
  article: HTMLElement;
  pathname: string;
  historyKey: unknown;
  focus: Element | null;
  release(): void;
}

let pending: StartupGuide | undefined;

/** Keep the visitor's native disclosure interaction across createRoot's
 * replacement of the public fallback. No storage or state on later visits. */
export function capturePublicGuide(): void {
  const article = document.querySelector<HTMLElement>('.ss-public-fallback .ss-topic-article');
  if (!article) return;
  const active = document.activeElement;
  const snapshot: StartupGuide = {
    article, pathname: location.pathname, historyKey: history.state?.key,
    focus: active?.matches('summary') && article.contains(active) ? active : null,
    release() {
      document.removeEventListener('focusin', moved);
      document.removeEventListener('pointerdown', moved);
      window.removeEventListener('popstate', snapshot.release);
      pending = undefined;
    },
  };
  function moved(event: Event) {
    if (event.type === 'focusin') snapshot.focus = event.target instanceof Element &&
      event.target.matches('summary') && article!.contains(event.target) ? event.target : null;
    else if (event.target !== snapshot.focus) snapshot.focus = null;
  }
  pending = snapshot;
  document.addEventListener('focusin', moved);
  document.addEventListener('pointerdown', moved);
  window.addEventListener('popstate', snapshot.release);
}

export function takePublicGuide(): StartupGuide | undefined {
  const snapshot = pending;
  snapshot?.release();
  return snapshot;
}
