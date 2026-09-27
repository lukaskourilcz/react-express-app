# devShark brand kit · V9 (vítězná varianta, vybrána 2026-09-27)

Všechny soubory jsou vygenerovány z přesné zdrojové geometrie, text nápisu je na křivkách, PNG mají průhledné pozadí. Generátor (`tools/brand-generator.js`), brand manuál (`devshark-02-brand-manual.dc.html`), seznam změn (`CHANGES.md`) a šablony pro socials (`devshark-04-social.dc.html`, `social/SKILL.md`) zůstávají v archivu vlastníka a v repozitáři nejsou. Pravidla v angličtině: [`docs/brand/brand-guidelines.md`](../../../../docs/brand/brand-guidelines.md).

## recommended/ — rodina značky (green #2D7A2D · ink #132019 · white #FFFFFF, každý SVG + PNG)
| Soubor | Použití | Min. velikost |
|---|---|---|
| [`recommended/devshark-logo-horizontal-*`](recommended/devshark-logo-horizontal-green.svg) | primární logo | 160 px / 35 mm šířky |
| [`recommended/devshark-logo-horizontal-small-*`](recommended/devshark-logo-horizontal-small-green.svg) | stejná geometrie, silnější vlna | 100–160 px / 20–35 mm |
| [`recommended/devshark-logo-compact-*`](recommended/devshark-logo-compact-green.svg) | navigace, mobil, patičky | 18 px výšky |
| [`recommended/devshark-logo-stacked-*`](recommended/devshark-logo-stacked-green.svg) | čtvercové formáty: avatar, samolepka, hrnek | 120 px šířky |
| [`recommended/devshark-fin-wave-*`](recommended/devshark-fin-wave-green.svg) | samostatný symbol s vlnou | 20 px / 6 mm |
| [`recommended/devshark-fin-clean-*`](recommended/devshark-fin-clean-green.svg) | čistá ploutev: favicon, ikona, výšivka, roh příspěvků | 12 px / 4 mm |

PNG šířky: horizontální 2400 px, stacked 1600 px, symboly 1024 px.

## favicon/
- [`favicon/favicon.svg`](favicon/favicon.svg), [`favicon/favicon-white.svg`](favicon/favicon-white.svg) (tmavá témata prohlížeče)
- `favicon/favicon-16.png`, `-32`, `-48`, `-180`, `-192`, `-512` — průhledné, zelená ploutev
- [`favicon/favicon.ico`](favicon/favicon.ico) — 16 + 32 + 48 (PNG vrstvy)
- [`favicon/app-icon.svg`](favicon/app-icon.svg), `favicon/app-icon-180.png`, `-192`, `-512` — bílá ploutev na zelené dlaždici, roh dodá platforma

Aplikace servíruje kopie těchto souborů z kořene `client/public/` (`/favicon.ico`, `/favicon.svg`, `/favicon-white.svg`, `/favicon-16.png`, `/favicon-32.png`, `/favicon-48.png`, `/apple-touch-icon.png` = `app-icon-180.png`, `/icon-192.png` = `app-icon-192.png`, `/icon-512.png` = `app-icon-512.png`, `/icon.svg` = `app-icon.svg`).

HTML (`client/index.html`):
```html
<link rel="icon" href="/favicon.ico" sizes="16x16 32x32 48x48">
<link rel="icon" type="image/svg+xml" href="/favicon.svg" media="(prefers-color-scheme: light)">
<link rel="icon" type="image/svg+xml" href="/favicon-white.svg" media="(prefers-color-scheme: dark)">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```
manifest (`client/vite.config.ts`): `/icon-192.png`, `/icon-512.png` (kopie `app-icon-192.png`, `app-icon-512.png`).

## variants/ — pracovní varianty V1–V10
Nejsou součástí repozitáře (jen pro porovnání, nepoužívat v produkci). Zůstávají v archivu vlastníka.

## Rychlá pravidla
- Zápis vždy **devShark**. Ploutev vlevo, špička doleva, jedna vlna, průhledný výřez.
- Zelená na bílé/světlé, bílá na ink/zelené, ink pro jednobarevný tisk. Bez gradientů, stínů, 3D.
- Ochranná zóna = výška písmene d na všech stranách.
- Favicon a výšivka = pouze čistá ploutev.
- Textil: tričko 80 mm, mikina 90 mm, hrnek 85 mm, kšiltovka (ploutev) 35 mm, samolepka 100 mm — návrh, potvrdit šablonou dodavatele.
