// The /shop lists on a phone (UX audit money-02, money-13). jsdom applies no
// media queries, so this reads the stylesheet's phone rules.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/components/Rewards.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const phone = css.slice(css.lastIndexOf('@media (max-width: 599px)'));

describe('/shop on a phone', () => {
  it('keeps each How to earn figure on its label\'s line, with the detail under both', () => {
    expect(phone).toMatch(/\.rw-earn__row \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;[^}]*grid-template-areas: 'label figure' 'detail detail';/);
    expect(phone).toContain('.rw-earn__main { display: contents; }');
    expect(phone).not.toMatch(/\.rw-earn__row \{[^}]*flex-direction: column/);
  });

  it('gives both coin rows one structure, the action on its own row', () => {
    expect(phone).toMatch(/\.rw-spend__row \{[^}]*grid-template-areas: 'icon name' 'icon blurb' '\. action';/);
  });

  it('keeps the signed-out sentence beside the coin, not on a row under it (money-05)', () => {
    expect(css).toMatch(/\.rw-wallet__balance \{[^}]*flex: 1 1 0;[^}]*min-width: 0;/);
  });

  it('puts See what Premium includes under the note with its label on the sentence\'s edge (money-14)', () => {
    const narrow = css.slice(css.indexOf('@media (max-width: 639px)'));
    expect(narrow).toMatch(/\.rw-earn__note \{ flex-direction: column; align-items: flex-start; \}/);
    expect(narrow).toContain('.rw-earn__note > .astryx-button.ghost { margin-inline-start: -20px; }');
  });
});
