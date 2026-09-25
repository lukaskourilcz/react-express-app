export interface TopicLandingDefinition {
  slug: string;
  subject: 'webdev';
  category: string;
  title: { en: string; cs: string };
  description: { en: string; cs: string };
  misconception: { en: string; cs: string };
  explanation?: { en: string; cs: string };
  example?: string;
  reference?: string;
  practice: { en: Array<[string, string]>; cs: Array<[string, string]> };
}

export const TOPIC_LANDINGS: TopicLandingDefinition[] = [
  {
    explanation: {"en": "Each call to makeCounter creates a separate count binding, so calling the returned function twice produces 1 and then 2, while another counter starts at 1; this is useful when a callback needs to keep access to state without placing that state in a global variable.", "cs": "Každé volání makeCounter vytvoří vlastní vazbu count, takže dvě volání vrácené funkce dají 1 a potom 2, zatímco nový čítač začne znovu od 1; hodí se to, když callback potřebuje pracovat se stavem, který nechceš ukládat do globální proměnné."},
    example: "function makeCounter() {\n  let count = 0;\n  return () => ++count;\n}\nconst next = makeCounter();\nnext(); // 1\nnext(); // 2",
    reference: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures",
    slug: 'javascript-closures', subject: 'webdev', category: 'javascript',
    title: { en: 'JavaScript closures, clearly explained', cs: 'JavaScript closures srozumitelně' },
    description: { en: 'A closure is a function together with access to lexical variables from the scope where it was created, even after that outer function returns.', cs: 'Closure je funkce, která si uchovává přístup k proměnným z lexikálního oboru, ve kterém vznikla, i po dokončení vnější funkce.' },
    misconception: { en: 'Closures retain access to bindings; they do not freeze a copy of every value.', cs: 'Closure si uchovává přístup k vazbám, nevytváří zmrazenou kopii každé hodnoty.' },
    practice: { en: [['Can a closure outlive its outer call?', 'Yes.'], ['Are closures only for private state?', 'No.'], ['What scope do they capture?', 'The lexical scope where the function was created.']], cs: [['Může closure přežít vnější volání?', 'Ano.'], ['Slouží closure jen pro soukromý stav?', 'Ne.'], ['Jaký obor zachycuje?', 'Lexikální obor, ve kterém funkce vznikla.']] },
  },
  {
    explanation: {"en": "A union describes several possible values, while the typeof check gives TypeScript evidence about the value in this branch; checking a tag on an object works in the same way, but casting untrusted JSON with as only changes what the compiler assumes and cannot replace runtime validation.", "cs": "Union typ popisuje několik možných hodnot a kontrola typeof dá TypeScriptu podklad pro zpřesnění typu v konkrétní větvi; podobně funguje kontrola značky objektu, zatímco přetypování nedůvěryhodného JSON pomocí as pouze změní předpoklad kompilátoru a nenahradí ověření za běhu."},
    example: "function label(value: string | number) {\n  if (typeof value === \"string\") {\n    return value.trim();\n  }\n  return value.toFixed(2);\n}",
    reference: "https://www.typescriptlang.org/docs/handbook/2/narrowing.html",
    slug: 'typescript-narrowing', subject: 'webdev', category: 'typescript',
    title: { en: 'TypeScript narrowing fundamentals', cs: 'Základy zužování typů v TypeScriptu' },
    description: { en: 'Runtime checks such as typeof, in, discriminants and predicates refine a broad static type inside a controlled branch.', cs: 'Kontroly typeof, in, diskriminanty a predikáty zpřesní široký statický typ uvnitř konkrétní větve.' },
    misconception: { en: 'A type assertion does not validate data at runtime.', cs: 'Typová aserce neověřuje data za běhu.' },
    practice: { en: [['Which operator narrows primitives?', 'typeof'], ['What identifies a discriminated union member?', 'A shared literal tag.'], ['Does `as` validate input?', 'No.']], cs: [['Který operátor zužuje primitiva?', 'typeof'], ['Co určuje člena diskriminovaného sjednocení?', 'Sdílená literální značka.'], ['Ověřuje `as` vstup?', 'Ne.']] },
  },
  {
    explanation: {"en": "Call useState at the top level of your component, then derive values such as a filtered list during rendering; when you need to subscribe to a browser event or keep another external system in sync, use an effect with cleanup so the subscription does not survive beyond the component that owns it.", "cs": "useState volej na nejvyšší úrovni komponenty a odvozené hodnoty, například filtrovaný seznam, počítej během renderování; pokud se potřebuješ přihlásit k události prohlížeče nebo synchronizovat externí systém, použij efekt s úklidem, aby odběr nepřežil komponentu, které patří."},
    example: "function Search({ items }) {\n  const [query, setQuery] = useState(\"\");\n  const visible = items.filter(item => item.includes(query));\n  return <>\n    <input aria-label=\"Search\" value={query}\n      onChange={e => setQuery(e.target.value)} />\n    <p>{visible.join(\", \")}</p>\n  </>;\n}",
    reference: "https://react.dev/learn/you-might-not-need-an-effect",
    slug: 'react-hooks', subject: 'webdev', category: 'react',
    title: { en: 'React Hooks mental model', cs: 'Mentální model React Hooks' },
    description: { en: 'Hooks expose stateful React features. Their call order stays stable, while effects synchronize React with systems outside rendering.', cs: 'Hooky zpřístupňují stavové funkce Reactu. Jejich pořadí zůstává stabilní a efekty synchronizují React s okolním světem.' },
    misconception: { en: 'Derived values usually belong in render, not in an effect.', cs: 'Odvozené hodnoty obvykle patří do renderu, ne do efektu.' },
    practice: { en: [['Why not call Hooks conditionally?', 'React associates Hook state by call order.'], ['What belongs in an effect?', 'External synchronization.'], ['Does useMemo guarantee correctness?', 'No.']], cs: [['Proč nevolat Hooky podmíněně?', 'React přiřazuje stav podle pořadí volání.'], ['Co patří do efektu?', 'Externí synchronizace.'], ['Zaručuje useMemo správnost?', 'Ne.']] },
  },
  {
    explanation: {"en": "In this query, every learner remains in the result even if they have no passed attempt, because the status condition belongs to ON; putting a.status = 'passed' in WHERE instead would discard the rows whose right-hand values are NULL, and multiple matching attempts can still produce several rows for one learner.", "cs": "V tomto dotazu zůstane ve výsledku každý student i bez úspěšného pokusu, protože podmínka status patří do ON; pokud bys a.status = 'passed' přesunul do WHERE, řádky s NULL na pravé straně by vypadly a více odpovídajících pokusů může stále vytvořit několik řádků pro jednoho studenta."},
    example: "SELECT l.id, a.id AS attempt_id\nFROM learners AS l\nLEFT JOIN attempts AS a\n  ON a.learner_id = l.id\n  AND a.status = 'passed';",
    reference: "https://www.postgresql.org/docs/current/queries-table-expressions.html",
    slug: 'sql-joins', subject: 'webdev', category: 'databases',
    title: { en: 'SQL joins without guesswork', cs: 'SQL JOIN bez hádání' },
    description: { en: 'A join combines related rows. INNER JOIN keeps matches; LEFT JOIN also keeps every row from the left side.', cs: 'JOIN spojuje související řádky. INNER JOIN zachová shody, LEFT JOIN navíc všechny řádky z levé strany.' },
    misconception: { en: 'A right-table filter in WHERE can accidentally remove unmatched LEFT JOIN rows.', cs: 'Filtr pravé tabulky ve WHERE může omylem odstranit nespárované řádky LEFT JOIN.' },
    practice: { en: [['Which join preserves every left row?', 'LEFT JOIN'], ['Where is the relationship expressed?', 'The ON clause.'], ['Can joins multiply rows?', 'Yes.']], cs: [['Který JOIN zachová všechny levé řádky?', 'LEFT JOIN'], ['Kde se zapíše vztah?', 'V klauzuli ON.'], ['Může JOIN znásobit řádky?', 'Ano.']] },
  },
  {
    explanation: {"en": "On a local feature branch, fetch the latest main and rebase your unpublished commits onto it, resolving each conflict before continuing; if the result is not what you intended, abort the operation, and coordinate before rewriting any history that another developer has already based work on.", "cs": "Na lokální pracovní větvi načti aktuální main a přehraj na něj své nezveřejněné commity, přičemž každý konflikt vyřeš před pokračováním; pokud výsledek neodpovídá záměru, operaci zruš a před přepsáním historie, ze které už někdo jiný vychází, se s ním domluv."},
    example: "git fetch origin\ngit rebase origin/main\n# After resolving a conflict:\ngit add path/to/resolved-file\ngit rebase --continue\n# To return to the state before this rebase:\ngit rebase --abort",
    reference: "https://git-scm.com/docs/git-rebase",
    slug: 'git-rebase', subject: 'webdev', category: 'git',
    title: { en: 'Git rebasing safely', cs: 'Bezpečný Git rebase' },
    description: { en: 'Rebase replays commits onto a new base and rewrites their identities, producing a linear history.', cs: 'Rebase přehraje commity na nový základ, přepíše jejich identity a vytvoří lineární historii.' },
    misconception: { en: 'Rebase does more than move a pointer: replayed commits receive new hashes.', cs: 'Rebase pouze neposune ukazatel: přehrané commity dostanou nové hashe.' },
    practice: { en: [['What does rebase rewrite?', 'Commit history.'], ['When is it safest?', 'On unpublished commits.'], ['How do you cancel it?', 'git rebase --abort']], cs: [['Co rebase přepisuje?', 'Historii commitů.'], ['Kdy je nejbezpečnější?', 'U nezveřejněných commitů.'], ['Jak ho zrušíš?', 'git rebase --abort']] },
  },
];

