# Lighthouse baseline — 2026-07-28

Lighthouse 12.8.2. Ran against the two production URLs at mobile + desktop preset. Chrome flags: `--headless=new --no-sandbox`. Reports (HTML + JSON) sit next to this file for drill-down.

## Category scores (0–100)

| Site | Form factor | Perf | A11y | Best Practices | SEO |
|------|-------------|-----:|-----:|---------------:|----:|
| StudyShark | mobile | 68 | 96 | 96 | 91 |
| StudyShark | desktop | 45 | 96 | 96 | 91 |
| devShark | mobile | 66 | 96 | 96 | 91 |
| devShark | desktop | 33 | 96 | 96 | 91 |

## Core Web Vitals + timing

| Site | Form factor | FCP | LCP | TBT | CLS | Speed Index | TTI |
|------|-------------|-----|-----|-----|-----|-------------|-----|
| StudyShark | mobile | 4.3 s | 5.2 s | 10 ms | 0 | 5.5 s | 5.2 s |
| StudyShark | desktop | 2.7 s | 2.7 s | 70 ms | 0.96 | 2.7 s | 5.2 s |
| devShark | mobile | 4.6 s | 5.7 s | 20 ms | 0 | 5.7 s | 5.8 s |
| devShark | desktop | 3.4 s | 4.1 s | 160 ms | 0.959 | 3.4 s | 5.7 s |

## Sources

- **StudyShark mobile** — [`studyshark-mobile.report.html`](./studyshark-mobile.report.html) · JSON alongside
  - URL: https://studyshark-app.vercel.app/
  - Fetched: 2026-07-28T21:33:38.364Z
- **StudyShark desktop** — [`studyshark-desktop.report.html`](./studyshark-desktop.report.html) · JSON alongside
  - URL: https://studyshark-app.vercel.app/
  - Fetched: 2026-07-28T21:33:53.724Z
- **devShark mobile** — [`devshark-mobile.report.html`](./devshark-mobile.report.html) · JSON alongside
  - URL: https://devshark.app/
  - Fetched: 2026-07-28T21:34:06.358Z
- **devShark desktop** — [`devshark-desktop.report.html`](./devshark-desktop.report.html) · JSON alongside
  - URL: https://devshark.app/
  - Fetched: 2026-07-28T21:34:22.569Z

## How to re-run

```sh
# Regenerate the whole baseline (overwrites the files in this directory):
CHROME_FLAGS='--headless=new --no-sandbox --disable-gpu'
for site in "https://studyshark-app.vercel.app|studyshark" "https://devshark.app|devshark"; do
  url="${site%|*}"; name="${site#*|}"
  for form in mobile desktop; do
    npx --yes lighthouse@12 "$url" \
      --output=json --output=html \
      --output-path="./${name}-${form}" \
      --form-factor="$form" \
      --screenEmulation.mobile=$([ "$form" = "mobile" ] && echo true || echo false) \
      --chrome-flags="$CHROME_FLAGS" --quiet
  done
done
```
