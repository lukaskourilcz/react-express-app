# Lighthouse baseline — 2026-07-28

Lighthouse 12.8.2. Ran against the devShark production URL at mobile + desktop preset. Chrome flags: `--headless=new --no-sandbox`. Reports (HTML + JSON) sit next to this file for drill-down. The same run also measured StudyShark, which moved to its own repository, `lukaskourilcz/studyshark`, on 2026-09-24; this folder keeps the devShark reports.

## Category scores (0–100)

| Site | Form factor | Perf | A11y | Best Practices | SEO |
|------|-------------|-----:|-----:|---------------:|----:|
| devShark | mobile | 66 | 96 | 96 | 91 |
| devShark | desktop | 33 | 96 | 96 | 91 |

## Core Web Vitals + timing

| Site | Form factor | FCP | LCP | TBT | CLS | Speed Index | TTI |
|------|-------------|-----|-----|-----|-----|-------------|-----|
| devShark | mobile | 4.6 s | 5.7 s | 20 ms | 0 | 5.7 s | 5.8 s |
| devShark | desktop | 3.4 s | 4.1 s | 160 ms | 0.959 | 3.4 s | 5.7 s |

## Sources

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
for form in mobile desktop; do
  npx --yes lighthouse@12 "https://devshark.app" \
    --output=json --output=html \
    --output-path="./devshark-${form}" \
    --form-factor="$form" \
    --screenEmulation.mobile=$([ "$form" = "mobile" ] && echo true || echo false) \
    --chrome-flags="$CHROME_FLAGS" --quiet
done
```
