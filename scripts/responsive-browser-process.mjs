// Chrome helpers can inherit stderr beyond the browser's lifetime. Release our
// pipes as well as our browser; do not terminate unrelated helper processes.
export function closeBrowserProcess(browser) {
  try { browser.kill('SIGKILL'); } catch { /* already stopped */ }
  browser.stdout?.destroy();
  browser.stderr?.destroy();
}
