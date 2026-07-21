export interface TopicLandingDefinition {
  slug: string;
  subject: 'webdev' | 'geography' | 'history' | 'math' | 'biology' | 'chess';
  category: string;
  title: { en: string; cs: string };
  description: { en: string; cs: string };
  misconception: { en: string; cs: string };
  practice: { en: Array<[string, string]>; cs: Array<[string, string]> };
}

export const TOPIC_LANDINGS: TopicLandingDefinition[] = [
  {
    slug: 'javascript-closures', subject: 'webdev', category: 'javascript',
    title: { en: 'JavaScript closures, clearly explained', cs: 'JavaScript closures srozumitelně' },
    description: { en: 'A closure is a function together with access to lexical variables from the scope where it was created, even after that outer function returns.', cs: 'Closure je funkce, která si uchovává přístup k proměnným z lexikálního oboru, ve kterém vznikla, i po dokončení vnější funkce.' },
    misconception: { en: 'Closures retain access to bindings; they do not freeze a copy of every value.', cs: 'Closure si uchovává přístup k vazbám, nevytváří zmrazenou kopii každé hodnoty.' },
    practice: { en: [['Can a closure outlive its outer call?', 'Yes.'], ['Are closures only for private state?', 'No.'], ['What scope do they capture?', 'The lexical scope where the function was created.']], cs: [['Může closure přežít vnější volání?', 'Ano.'], ['Slouží closure jen pro soukromý stav?', 'Ne.'], ['Jaký obor zachycuje?', 'Lexikální obor, ve kterém funkce vznikla.']] },
  },
  {
    slug: 'typescript-narrowing', subject: 'webdev', category: 'typescript',
    title: { en: 'TypeScript narrowing fundamentals', cs: 'Základy zužování typů v TypeScriptu' },
    description: { en: 'Runtime checks such as typeof, in, discriminants and predicates refine a broad static type inside a controlled branch.', cs: 'Kontroly typeof, in, diskriminanty a predikáty zpřesní široký statický typ uvnitř konkrétní větve.' },
    misconception: { en: 'A type assertion does not validate data at runtime.', cs: 'Typová aserce neověřuje data za běhu.' },
    practice: { en: [['Which operator narrows primitives?', 'typeof'], ['What identifies a discriminated union member?', 'A shared literal tag.'], ['Does `as` validate input?', 'No.']], cs: [['Který operátor zužuje primitiva?', 'typeof'], ['Co určuje člena diskriminovaného sjednocení?', 'Sdílená literální značka.'], ['Ověřuje `as` vstup?', 'Ne.']] },
  },
  {
    slug: 'react-hooks', subject: 'webdev', category: 'react',
    title: { en: 'React Hooks mental model', cs: 'Mentální model React Hooks' },
    description: { en: 'Hooks expose stateful React features. Their call order stays stable, while effects synchronize React with systems outside rendering.', cs: 'Hooky zpřístupňují stavové funkce Reactu. Jejich pořadí zůstává stabilní a efekty synchronizují React s okolním světem.' },
    misconception: { en: 'Derived values usually belong in render, not in an effect.', cs: 'Odvozené hodnoty obvykle patří do renderu, ne do efektu.' },
    practice: { en: [['Why not call Hooks conditionally?', 'React associates Hook state by call order.'], ['What belongs in an effect?', 'External synchronization.'], ['Does useMemo guarantee correctness?', 'No.']], cs: [['Proč nevolat Hooky podmíněně?', 'React přiřazuje stav podle pořadí volání.'], ['Co patří do efektu?', 'Externí synchronizace.'], ['Zaručuje useMemo správnost?', 'Ne.']] },
  },
  {
    slug: 'sql-joins', subject: 'webdev', category: 'databases',
    title: { en: 'SQL joins without guesswork', cs: 'SQL JOIN bez hádání' },
    description: { en: 'A join combines related rows. INNER JOIN keeps matches; LEFT JOIN also keeps every row from the left side.', cs: 'JOIN spojuje související řádky. INNER JOIN zachová shody, LEFT JOIN navíc všechny řádky z levé strany.' },
    misconception: { en: 'A right-table filter in WHERE can accidentally remove unmatched LEFT JOIN rows.', cs: 'Filtr pravé tabulky ve WHERE může omylem odstranit nespárované řádky LEFT JOIN.' },
    practice: { en: [['Which join preserves every left row?', 'LEFT JOIN'], ['Where is the relationship expressed?', 'The ON clause.'], ['Can joins multiply rows?', 'Yes.']], cs: [['Který JOIN zachová všechny levé řádky?', 'LEFT JOIN'], ['Kde se zapíše vztah?', 'V klauzuli ON.'], ['Může JOIN znásobit řádky?', 'Ano.']] },
  },
  {
    slug: 'git-rebase', subject: 'webdev', category: 'git',
    title: { en: 'Git rebasing safely', cs: 'Bezpečný Git rebase' },
    description: { en: 'Rebase replays commits onto a new base and rewrites their identities, producing a linear history.', cs: 'Rebase přehraje commity na nový základ, přepíše jejich identity a vytvoří lineární historii.' },
    misconception: { en: 'Rebase does more than move a pointer: replayed commits receive new hashes.', cs: 'Rebase pouze neposune ukazatel: přehrané commity dostanou nové hashe.' },
    practice: { en: [['What does rebase rewrite?', 'Commit history.'], ['When is it safest?', 'On unpublished commits.'], ['How do you cancel it?', 'git rebase --abort']], cs: [['Co rebase přepisuje?', 'Historii commitů.'], ['Kdy je nejbezpečnější?', 'U nezveřejněných commitů.'], ['Jak ho zrušíš?', 'git rebase --abort']] },
  },
  {
    slug: 'capitals-of-europe', subject: 'geography', category: 'capitals',
    title: { en: 'Capitals of Europe practice', cs: 'Procvičování hlavních měst Evropy' },
    description: { en: 'Connect each capital with its country, region and a memorable geographic clue.', cs: 'Propoj každé hlavní město se státem, regionem a zapamatovatelnou zeměpisnou stopou.' },
    misconception: { en: 'The largest city is not always the capital; Switzerland uses Bern rather than Zürich.', cs: 'Největší město nemusí být hlavní; Švýcarsko má Bern, nikoli Curych.' },
    practice: { en: [['Capital of Portugal?', 'Lisbon'], ['Capital of Slovenia?', 'Ljubljana'], ['Capital of Switzerland?', 'Bern']], cs: [['Hlavní město Portugalska?', 'Lisabon'], ['Hlavní město Slovinska?', 'Lublaň'], ['Hlavní město Švýcarska?', 'Bern']] },
  },
  {
    slug: 'major-historical-periods', subject: 'history', category: 'modern',
    title: { en: 'Major historical periods', cs: 'Hlavní historická období' },
    description: { en: 'Period labels organize change over time, but their boundaries vary by region and historical question.', cs: 'Názvy období uspořádávají změny v čase, jejich hranice se však liší podle regionu i historické otázky.' },
    misconception: { en: 'Historical periods do not begin everywhere on one exact date.', cs: 'Historická období nezačínají všude jedním přesným datem.' },
    practice: { en: [['What conventionally ends prehistory?', 'Written records.'], ['One global medieval start date?', 'No.'], ['What is periodization?', 'Dividing history into analytical periods.']], cs: [['Co obvykle ukončuje pravěk?', 'Písemné záznamy.'], ['Má středověk jedno světové počáteční datum?', 'Ne.'], ['Co je periodizace?', 'Rozdělení historie do analytických období.']] },
  },
  {
    slug: 'foundational-mathematics', subject: 'math', category: 'prealgebra',
    title: { en: 'Foundational mathematics practice', cs: 'Procvičování základů matematiky' },
    description: { en: 'Build number sense through fractions, ratios, operations and explaining why a method works.', cs: 'Buduj cit pro čísla pomocí zlomků, poměrů, operací a vysvětlování, proč postup funguje.' },
    misconception: { en: 'Memorizing a rule is not the same as understanding it; estimate first.', cs: 'Zapamatovat si pravidlo není totéž jako mu rozumět; nejprve odhaduj.' },
    practice: { en: [['25% of 80?', '20'], ['Is 3/4 larger than 2/3?', 'Yes.'], ['Meaning of equals?', 'Both sides have the same value.']], cs: [['Kolik je 25 % z 80?', '20'], ['Je 3/4 větší než 2/3?', 'Ano.'], ['Co znamená rovnítko?', 'Obě strany mají stejnou hodnotu.']] },
  },
  {
    slug: 'basic-human-biology', subject: 'biology', category: 'cell-biology',
    title: { en: 'Basic human biology', cs: 'Základy biologie člověka' },
    description: { en: 'Connect cells, tissues, organs and coordinated body systems that maintain internal balance.', cs: 'Propoj buňky, tkáně, orgány a spolupracující tělní soustavy, které udržují vnitřní rovnováhu.' },
    misconception: { en: 'Body systems are interconnected rather than isolated modules.', cs: 'Tělní soustavy jsou propojené, nikoli izolované moduly.' },
    practice: { en: [['Basic unit of life?', 'The cell'], ['What transports oxygen?', 'The cardiovascular system.'], ['What is homeostasis?', 'Stable internal conditions.']], cs: [['Základní jednotka života?', 'Buňka'], ['Co přenáší kyslík?', 'Oběhová soustava.'], ['Co je homeostáza?', 'Stabilní vnitřní podmínky.']] },
  },
  {
    slug: 'chess-rules-and-tactics', subject: 'chess', category: 'tactics',
    title: { en: 'Chess rules and tactical patterns', cs: 'Šachová pravidla a taktické motivy' },
    description: { en: 'Build tactical vision from legal moves, checks, captures, threats, forks and pins.', cs: 'Buduj taktické vidění od legálních tahů, šachů, braní a hrozeb po vidličky a vazby.' },
    misconception: { en: 'Spotting a pattern is not enough; check the opponent’s forcing replies.', cs: 'Rozpoznat motiv nestačí; prověř soupeřovy vynucující odpovědi.' },
    practice: { en: [['What is a fork?', 'One piece attacks multiple targets.'], ['Can an absolute pin move?', 'Not legally if it exposes the king.'], ['Scan first for?', 'Checks, captures and threats.']], cs: [['Co je vidlička?', 'Jedna figura napadá více cílů.'], ['Může se absolutně vázaná figura pohnout?', 'Ne, pokud odkryje krále.'], ['Co hledat nejdřív?', 'Šachy, braní a hrozby.']] },
  },
];

export const TOPIC_BY_SLUG = new Map(TOPIC_LANDINGS.map((topic) => [topic.slug, topic]));
