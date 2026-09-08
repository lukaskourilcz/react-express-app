import { en } from '../../client/src/i18n/translations';
import { CODING_TRACKS } from '../../shared/coding-catalog';
import { BASE_PATH_STAGES, fdePathFor, pathsForProfile } from '../../shared/progression';
import { BASE_TRACKS } from '../../shared/learner-profile';
import { ORDER_STATUSES } from '../../shared/rewards';
import { FAILURE_CATEGORIES, stageOf } from '../../shared/coding-failures';
import { APPROACH_STYLES } from '../../shared/coding-approaches';
import { MERCH_CATALOG } from '../../shared/merchandise';
const K = en as unknown as Record<string, string>;
const miss: string[] = [];
const need = (k: string) => { if (!(k in K)) miss.push(k); };
for (const s of ['mdn', 'react', 'typescript']) need(`coding.resources.source.${s}`);
for (const c of FAILURE_CATEGORIES) { need(`coding.failure.${c}`); need(`coding.failure.stage.${stageOf(c)}`); }
for (const s of APPROACH_STYLES) need(`coding.approaches.style.${s}`);
for (const t of BASE_TRACKS) need(`learnerProfile.track.${t}.label`);
for (const t of CODING_TRACKS) need(`coding.track.${t}`);
for (const s of ORDER_STATUSES) need(`shop.status.${s}`);
for (const d of ['short', 'medium', 'long']) need(`coding.filter.duration.${d}`);
for (const f of ['tests', 'checklist', 'debug']) need(`coding.filter.format.${f}`);
for (const b of ['no_token_price', 'not_in_region', 'out_of_stock', 'no_supplier', 'no_payment_provider', 'no_price', 'not_yet']) need(`shop.blocker.${b}`);
const stageKeys = new Set<string>();
for (const track of BASE_TRACKS) {
  for (const st of BASE_PATH_STAGES[track]) stageKeys.add(st.key);
  for (const st of fdePathFor(track).stages) stageKeys.add(st.key);
}
for (const k of stageKeys) need(`progression.stage.${k}`);
for (const p of ['frontend', 'backend', 'fullstack', 'fde', 'dsa']) need(`progression.path.${p}`);
console.log('MISSING KEYS:', miss);
console.log('SKUS:', MERCH_CATALOG.map((m) => m.sku));
