/** Worked examples and diagrams for Learn lessons.
 *
 * Every figure here is authored, deterministic and checked. There is no
 * generated imagery anywhere in this file and there must never be: a diagram of
 * a box model, an execution order or a join is a claim about behaviour, and a
 * picture that merely looks like one is worse than no picture.
 *
 * Four rules the shapes below exist to enforce.
 *
 * **One objective per figure.** A figure belongs to one level of one topic and
 * illustrates that level's objective. A diagram that explains three things
 * explains none of them.
 *
 * **The text is not a label, it is the figure.** `alt` is the whole content in
 * words — the numbers, the order, the result — not "a diagram showing the box
 * model". Someone reading it instead of looking at it gets the same lesson, and
 * that is what makes the figure safe to lose to a narrow screen, a stylesheet
 * that did not load, or a screen reader.
 *
 * **Assumptions are stated.** A trace of execution order depends on a runtime;
 * a `fr` track depends on a container width. Where the answer would change if
 * the reader assumed something else, the figure says what to assume.
 *
 * **Nothing is decorative.** A figure is added where a relationship or a change
 * over time is clearer shown than told. Where prose is clearer, there is no
 * figure, and the coverage matrix in docs/lesson-figures.md records the
 * omissions rather than hiding them.
 *
 * A figure marked `afterSubmission` is held back until the level is finished,
 * for the case where showing it first would answer the question being asked.
 * None of the figures below is marked today; the flag exists so that an author
 * who needs it does not have to choose between the diagram and the assessment. */

export interface FigureText {
  en: string;
  cs: string;
}

/** A chain of labelled steps with what happens between them. Used for request
 * flows, data flow, and any "A, then B, then C" relationship. */
export interface FlowBody {
  kind: 'flow';
  nodes: { id: string; label: FigureText; note?: FigureText }[];
  /** Each edge names what travels along it, so an arrow never means "somehow". */
  edges: { from: string; to: string; label: FigureText }[];
}

/** Boxes inside boxes, outermost first. Box model, landmarks, stacking. */
export interface NestedBody {
  kind: 'nested';
  layers: { label: FigureText; value?: string; note?: FigureText }[];
}

/** A small table. Fixture rows for a join, a growth comparison, grid tracks. */
export interface TableBody {
  kind: 'table';
  columns: FigureText[];
  rows: string[][];
  /** Rows to mark, and the word that says why — never a colour alone. */
  marks?: { row: number; role: FigureText }[];
}

/** A sequence the learner steps through. Same shape as the learning-path trace
 * player: cells, a note per frame, and an optional running counter. */
export interface StepsBody {
  kind: 'steps';
  /** A word above each cell — "index 0", "acc", "top". */
  legend?: FigureText[];
  frames: {
    cells: string[];
    /** Marked cells carry a word, so the mark is never only a colour. */
    marks?: { index: number; role: FigureText }[];
    note: FigureText;
    counter?: { label: FigureText; value: string };
  }[];
}

export type FigureBody = FlowBody | NestedBody | TableBody | StepsBody;

export interface LessonFigure {
  id: string;
  topic: string;
  /** The level whose objective this figure serves. */
  level: number;
  title: FigureText;
  /** The figure, in words. The content, not a description of the picture. */
  alt: FigureText;
  /** A runtime, a version, a container width — anything the reader would
   * otherwise have to guess, where guessing differently changes the answer. */
  assumes?: FigureText;
  /** Held until the level is finished. See the note at the top of the file. */
  afterSubmission?: boolean;
  body: FigureBody;
}

const T = (en: string, cs: string): FigureText => ({ en, cs });

export const LESSON_FIGURES: readonly LessonFigure[] = [
  /* ── HTML ────────────────────────────────────────────────────────────── */
  {
    id: 'html-landmarks',
    topic: 'html',
    level: 1,
    title: T('What a screen reader hears', 'Co slyší čtečka obrazovky'),
    alt: T(
      'The page is a body containing five landmarks in order: header (announced as "banner"), nav (announced as "navigation"), main (announced as "main"), aside (announced as "complementary") and footer (announced as "content information"). A div in any of these positions is announced as nothing at all, which is why a landmark cannot be replaced by a class name.',
      'Stránka je body s pěti orientačními body v pořadí: header (ohlášeno jako „banner“), nav („navigace“), main („hlavní obsah“), aside („doplňkový obsah“) a footer („informace o obsahu“). Div na kterémkoli z těchto míst se neohlásí nijak — proto název třídy orientační bod nenahradí.',
    ),
    body: {
      kind: 'nested',
      layers: [
        { label: T('body', 'body'), note: T('the document', 'dokument') },
        { label: T('header → “banner”', 'header → „banner“') },
        { label: T('nav → “navigation”', 'nav → „navigace“') },
        { label: T('main → “main”', 'main → „hlavní obsah“'), value: 'one per page' },
        { label: T('aside → “complementary”', 'aside → „doplňkový obsah“') },
        { label: T('footer → “content information”', 'footer → „informace o obsahu“') },
      ],
    },
  },
  {
    id: 'html-label-input',
    topic: 'html',
    level: 3,
    title: T('What connects a label to its field', 'Co spojuje popisek s polem'),
    alt: T(
      'A label with for="email" points at an input with id="email". That connection does two things: clicking the label focuses the field, and a screen reader announces "Email" when the field takes focus. The input also carries name="email", which is what the form submits under — an input without a name is not sent at all. Adjacency and a matching class connect nothing.',
      'Popisek s for="email" ukazuje na input s id="email". To spojení dělá dvě věci: kliknutí na popisek zaměří pole a čtečka při zaměření ohlásí „Email“. Input navíc nese name="email" — pod tím se odesílá; input bez name se neodešle vůbec. Sousedství ani stejná třída nespojují nic.',
    ),
    body: {
      kind: 'flow',
      nodes: [
        { id: 'label', label: T('label for="email"', 'label for="email"') },
        { id: 'input', label: T('input id="email"', 'input id="email"') },
        { id: 'form', label: T('form submission', 'odeslání formuláře') },
      ],
      edges: [
        { from: 'label', to: 'input', label: T('for → id: focus and accessible name', 'for → id: zaměření a přístupný název') },
        { from: 'input', to: 'form', label: T('name="email" → the value is sent', 'name="email" → hodnota se odešle') },
      ],
    },
  },

  /* ── CSS ─────────────────────────────────────────────────────────────── */
  {
    id: 'css-box-model',
    topic: 'css',
    level: 2,
    title: T('Where the 300 pixels went', 'Kam se podělo 300 pixelů'),
    alt: T(
      'An element with width: 300px, padding: 20px, border: 2px and margin: 16px. Under the default box-sizing: content-box the content box is 300px, so the visible box is 300 + 20 + 20 + 2 + 2 = 344px, and the space it occupies including margins is 376px. Set box-sizing: border-box and the 300px becomes the visible box instead: content shrinks to 256px and nothing else moves.',
      'Prvek s width: 300px, padding: 20px, border: 2px a margin: 16px. Ve výchozím box-sizing: content-box je obsahový box 300px, takže viditelný box měří 300 + 20 + 20 + 2 + 2 = 344px a s okraji zabírá 376px. S box-sizing: border-box se 300px stane viditelným boxem: obsah se zmenší na 256px a nic jiného se neposune.',
    ),
    assumes: T('box-sizing: content-box, the browser default.', 'box-sizing: content-box, výchozí hodnota prohlížeče.'),
    body: {
      kind: 'nested',
      layers: [
        { label: T('margin 16px', 'margin 16px'), value: '376px', note: T('space around it', 'prostor okolo') },
        { label: T('border 2px', 'border 2px'), value: '344px', note: T('the visible edge', 'viditelná hrana') },
        { label: T('padding 20px', 'padding 20px'), value: '340px' },
        { label: T('content', 'obsah'), value: '300px', note: T('what width sets', 'to, co nastavuje width') },
      ],
    },
  },
  {
    id: 'css-flex-axes',
    topic: 'css',
    level: 3,
    title: T('The two axes, and which property moves which', 'Dvě osy a která vlastnost hýbe kterou'),
    alt: T(
      'With flex-direction: row the main axis runs left to right and the cross axis runs top to bottom. justify-content moves items along the main axis; align-items moves them along the cross axis. Change flex-direction to column and the axes swap: justify-content now moves items vertically and align-items horizontally. The property names do not change — what they mean does.',
      'Při flex-direction: row vede hlavní osa zleva doprava a příčná shora dolů. justify-content posouvá položky po hlavní ose, align-items po příčné. Změň flex-direction na column a osy se prohodí: justify-content teď posouvá svisle a align-items vodorovně. Názvy vlastností se nemění — mění se jejich význam.',
    ),
    body: {
      kind: 'flow',
      nodes: [
        { id: 'row', label: T('flex-direction: row', 'flex-direction: row'), note: T('main axis →, cross axis ↓', 'hlavní osa →, příčná ↓') },
        { id: 'justify', label: T('justify-content', 'justify-content'), note: T('along the main axis', 'po hlavní ose') },
        { id: 'align', label: T('align-items', 'align-items'), note: T('along the cross axis', 'po příčné ose') },
        { id: 'column', label: T('flex-direction: column', 'flex-direction: column'), note: T('main axis ↓, cross axis →', 'hlavní osa ↓, příčná →') },
      ],
      edges: [
        { from: 'row', to: 'justify', label: T('moves items left/right', 'posouvá vlevo/vpravo') },
        { from: 'row', to: 'align', label: T('moves items up/down', 'posouvá nahoru/dolů') },
        { from: 'column', to: 'justify', label: T('now moves items up/down', 'teď posouvá nahoru/dolů') },
        { from: 'column', to: 'align', label: T('now moves items left/right', 'teď posouvá vlevo/vpravo') },
      ],
    },
  },
  {
    id: 'css-grid-tracks',
    topic: 'css',
    level: 4,
    title: T('What a fraction is a fraction of', 'Čeho je zlomek zlomkem'),
    alt: T(
      'A 900px container with grid-template-columns: 200px 1fr 2fr and no gap. The fixed track takes 200px first. The remaining 700px is then divided into three parts, because 1fr + 2fr is three: the 1fr track gets 233.33px and the 2fr track gets 466.67px. A fraction is a share of what is left after the fixed tracks, never a share of the container.',
      'Kontejner 900px s grid-template-columns: 200px 1fr 2fr a bez mezer. Pevná dráha si nejdřív vezme 200px. Zbývajících 700px se pak dělí na tři díly, protože 1fr + 2fr jsou tři: dráha 1fr dostane 233,33px a dráha 2fr 466,67px. Zlomek je podíl toho, co zbylo po pevných dráhách — ne podíl kontejneru.',
    ),
    assumes: T('A 900px container with gap: 0.', 'Kontejner 900px a gap: 0.'),
    body: {
      kind: 'table',
      columns: [T('Track', 'Dráha'), T('Declared', 'Zadáno'), T('Computed', 'Vypočteno')],
      rows: [
        ['1', '200px', '200px'],
        ['2', '1fr', '233.33px'],
        ['3', '2fr', '466.67px'],
        ['—', '900px', '900px'],
      ],
      marks: [{ row: 3, role: T('total', 'celkem') }],
    },
  },
  {
    id: 'css-stacking',
    topic: 'css',
    level: 5,
    title: T('Why z-index: 9999 lost', 'Proč z-index: 9999 prohrál'),
    alt: T(
      'A dialog with z-index: 9999 sits inside a card with opacity: 0.99. The opacity created a stacking context, so the dialog is stacked inside the card and its 9999 only competes with the card\'s other children. The card itself has z-index: 1, and the header beside it has z-index: 2 — so the header covers the whole card, dialog included. Raising 9999 higher changes nothing; removing the opacity does.',
      'Dialog se z-index: 9999 je uvnitř karty s opacity: 0.99. Ta průhlednost vytvořila kontext vrstvení, takže se dialog vrství uvnitř karty a jeho 9999 soupeří jen s ostatními potomky karty. Karta sama má z-index: 1 a hlavička vedle ní z-index: 2 — hlavička tedy překrývá celou kartu i s dialogem. Zvyšovat 9999 nepomůže; odebrat průhlednost ano.',
    ),
    body: {
      kind: 'nested',
      layers: [
        { label: T('root stacking context', 'kořenový kontext vrstvení') },
        { label: T('header — z-index: 2', 'hlavička — z-index: 2'), note: T('wins', 'vyhrává') },
        { label: T('card — z-index: 1, opacity: 0.99', 'karta — z-index: 1, opacity: 0.99'), note: T('creates a stacking context', 'vytváří kontext vrstvení') },
        { label: T('dialog — z-index: 9999', 'dialog — z-index: 9999'), note: T('trapped inside the card', 'uvězněn uvnitř karty') },
      ],
    },
  },

  /* ── JavaScript ──────────────────────────────────────────────────────── */
  {
    id: 'js-map-trace',
    topic: 'javascript',
    level: 6,
    title: T('map keeps the length', 'map zachovává délku'),
    alt: T(
      'Running [3, 1, 4].map(n => n * 2). Step 1: 3 becomes 6. Step 2: 1 becomes 2. Step 3: 4 becomes 8. The result is [6, 2, 8] — three in, three out. map always returns an array the same length as the one it walked, whatever the callback returns.',
      'Průběh [3, 1, 4].map(n => n * 2). Krok 1: z 3 je 6. Krok 2: z 1 je 2. Krok 3: ze 4 je 8. Výsledek je [6, 2, 8] — tři dovnitř, tři ven. map vrací pole vždy stejně dlouhé jako to, které prošel, ať callback vrátí cokoli.',
    ),
    body: {
      kind: 'steps',
      legend: [T('index 0', 'index 0'), T('index 1', 'index 1'), T('index 2', 'index 2')],
      frames: [
        { cells: ['3', '1', '4'], note: T('The array before anything runs.', 'Pole před spuštěním.') },
        { cells: ['6', '1', '4'], marks: [{ index: 0, role: T('changed', 'změněno') }], note: T('3 × 2 = 6.', '3 × 2 = 6.') },
        { cells: ['6', '2', '4'], marks: [{ index: 1, role: T('changed', 'změněno') }], note: T('1 × 2 = 2.', '1 × 2 = 2.') },
        { cells: ['6', '2', '8'], marks: [{ index: 2, role: T('changed', 'změněno') }], note: T('4 × 2 = 8. Three in, three out.', '4 × 2 = 8. Tři dovnitř, tři ven.') },
      ],
    },
  },
  {
    id: 'js-filter-trace',
    topic: 'javascript',
    level: 7,
    title: T('filter keeps the values', 'filter zachovává hodnoty'),
    alt: T(
      'Running [3, 1, 4].filter(n => n > 2). 3 is kept because 3 > 2. 1 is dropped because 1 is not greater than 2. 4 is kept. The result is [3, 4]: the values are unchanged and only the length differs. That is the opposite of map, which keeps the length and changes the values.',
      'Průběh [3, 1, 4].filter(n => n > 2). 3 zůstává, protože 3 > 2. 1 vypadne, protože není větší než 2. 4 zůstává. Výsledek je [3, 4]: hodnoty jsou beze změny a liší se jen délka. To je opak map, která zachová délku a mění hodnoty.',
    ),
    body: {
      kind: 'steps',
      legend: [T('index 0', 'index 0'), T('index 1', 'index 1'), T('index 2', 'index 2')],
      frames: [
        { cells: ['3', '1', '4'], note: T('The array before anything runs.', 'Pole před spuštěním.') },
        { cells: ['3', '1', '4'], marks: [{ index: 0, role: T('kept', 'zůstává') }], note: T('3 > 2 is true.', '3 > 2 platí.') },
        { cells: ['3', '1', '4'], marks: [{ index: 1, role: T('dropped', 'vypadá') }], note: T('1 > 2 is false.', '1 > 2 neplatí.') },
        { cells: ['3', '4'], marks: [{ index: 1, role: T('kept', 'zůstává') }], note: T('4 > 2 is true. Result: [3, 4].', '4 > 2 platí. Výsledek: [3, 4].') },
      ],
    },
  },
  {
    id: 'js-reduce-trace',
    topic: 'javascript',
    level: 8,
    title: T('reduce carries one value along', 'reduce nese jednu hodnotu s sebou'),
    alt: T(
      'Running [3, 1, 4].reduce((acc, n) => acc + n, 0). The accumulator starts at 0, the initial value. After the first element it is 3, after the second 4, after the third 8. The result is the number 8 — not an array. reduce is the one that can change the shape entirely, which is why the initial value decides what shape you get.',
      'Průběh [3, 1, 4].reduce((acc, n) => acc + n, 0). Akumulátor začíná na 0, což je počáteční hodnota. Po prvním prvku je 3, po druhém 4, po třetím 8. Výsledek je číslo 8 — ne pole. reduce jako jediný může úplně změnit tvar, a proto o výsledném tvaru rozhoduje počáteční hodnota.',
    ),
    body: {
      kind: 'steps',
      legend: [T('index 0', 'index 0'), T('index 1', 'index 1'), T('index 2', 'index 2')],
      frames: [
        { cells: ['3', '1', '4'], note: T('The accumulator starts at the initial value.', 'Akumulátor začíná na počáteční hodnotě.'), counter: { label: T('acc', 'acc'), value: '0' } },
        { cells: ['3', '1', '4'], marks: [{ index: 0, role: T('reading', 'čte se') }], note: T('0 + 3.', '0 + 3.'), counter: { label: T('acc', 'acc'), value: '3' } },
        { cells: ['3', '1', '4'], marks: [{ index: 1, role: T('reading', 'čte se') }], note: T('3 + 1.', '3 + 1.'), counter: { label: T('acc', 'acc'), value: '4' } },
        { cells: ['3', '1', '4'], marks: [{ index: 2, role: T('reading', 'čte se') }], note: T('4 + 4. The result is a number, not an array.', '4 + 4. Výsledek je číslo, ne pole.'), counter: { label: T('acc', 'acc'), value: '8' } },
      ],
    },
  },
  {
    id: 'js-reference',
    topic: 'javascript',
    level: 5,
    title: T('Two names, one object', 'Dvě jména, jeden objekt'),
    alt: T(
      'const a = { n: 1 }; const b = a; b.n = 2. There is one object and two names pointing at it, so a.n is now 2 as well. const stopped the name being reassigned; it did nothing to the object. Copying with { ...a } instead makes a second object, and changing one then leaves the other alone.',
      'const a = { n: 1 }; const b = a; b.n = 2. Existuje jeden objekt a dvě jména, která na něj ukazují, takže a.n je teď taky 2. const zabránil přepsání jména; s objektem neudělal nic. Kopie přes { ...a } vytvoří druhý objekt a změna jednoho pak druhý nechá být.',
    ),
    body: {
      kind: 'flow',
      nodes: [
        { id: 'a', label: T('const a', 'const a') },
        { id: 'b', label: T('const b = a', 'const b = a') },
        { id: 'obj', label: T('{ n: 2 }', '{ n: 2 }'), note: T('one object in memory', 'jeden objekt v paměti') },
        { id: 'copy', label: T('const c = { ...a }', 'const c = { ...a }') },
        { id: 'obj2', label: T('{ n: 1 }', '{ n: 1 }'), note: T('a second object', 'druhý objekt') },
      ],
      edges: [
        { from: 'a', to: 'obj', label: T('points at', 'ukazuje na') },
        { from: 'b', to: 'obj', label: T('points at the same one', 'ukazuje na ten samý') },
        { from: 'copy', to: 'obj2', label: T('points at its own', 'ukazuje na vlastní') },
      ],
    },
  },
  {
    id: 'js-async-order',
    topic: 'javascript',
    level: 22,
    title: T('The order the lines actually run in', 'V jakém pořadí se řádky opravdu spustí'),
    alt: T(
      'Given: console.log("A"); setTimeout(() => console.log("D"), 0); Promise.resolve().then(() => console.log("C")); console.log("B"). The output is A, B, C, D. A and B are synchronous and run first, in order. C is a promise callback and runs as soon as the synchronous work finishes. D was queued with a timer and runs after that, even at zero milliseconds — zero means "as soon as possible", not "now".',
      'Zadání: console.log("A"); setTimeout(() => console.log("D"), 0); Promise.resolve().then(() => console.log("C")); console.log("B"). Výstup je A, B, C, D. A a B jsou synchronní a běží první, v pořadí. C je callback promisu a spustí se hned po dokončení synchronní práce. D bylo zařazeno časovačem a běží až potom, i při nule milisekund — nula znamená „co nejdřív“, ne „teď“.',
    ),
    assumes: T('One JavaScript runtime, nothing else queued.', 'Jeden běh JavaScriptu, nic dalšího ve frontě.'),
    body: {
      kind: 'steps',
      legend: [T('output', 'výstup')],
      frames: [
        { cells: ['A'], note: T('Synchronous. Runs where it is written.', 'Synchronní. Běží tam, kde stojí.') },
        { cells: ['A', 'B'], marks: [{ index: 1, role: T('synchronous', 'synchronní') }], note: T('Also synchronous — the two calls above it only queued work.', 'Taky synchronní — dvě volání nad ním práci jen zařadila.') },
        { cells: ['A', 'B', 'C'], marks: [{ index: 2, role: T('promise callback', 'callback promisu') }], note: T('The promise callback runs as soon as the synchronous work is done.', 'Callback promisu běží hned po dokončení synchronní práce.') },
        { cells: ['A', 'B', 'C', 'D'], marks: [{ index: 3, role: T('timer', 'časovač') }], note: T('The timer callback runs last, even at 0 ms.', 'Callback časovače běží poslední, i při 0 ms.') },
      ],
    },
  },

  /* ── TypeScript ──────────────────────────────────────────────────────── */
  {
    id: 'ts-narrowing',
    topic: 'typescript',
    level: 11,
    title: T('What the compiler knows in each branch', 'Co kompilátor ví v které větvi'),
    alt: T(
      'A value typed string | number | null. Inside if (value === null) it is null. Inside else if (typeof value === "string") it is string, so .toUpperCase() is allowed. In the final else it is number, because nothing else is left — the compiler narrowed it by elimination, without being told. Outside all three branches it is still string | number | null, and none of those methods are available.',
      'Hodnota typu string | number | null. Uvnitř if (value === null) je null. Uvnitř else if (typeof value === "string") je string, takže .toUpperCase() projde. V posledním else je number, protože nic jiného nezbývá — kompilátor to zúžil vyloučením, aniž by mu to někdo řekl. Mimo všechny tři větve je pořád string | number | null a žádná z těch metod není dostupná.',
    ),
    body: {
      kind: 'flow',
      nodes: [
        { id: 'start', label: T('string | number | null', 'string | number | null') },
        { id: 'null', label: T('value === null', 'value === null'), note: T('here it is null', 'tady je null') },
        { id: 'str', label: T('typeof value === "string"', 'typeof value === "string"'), note: T('here it is string', 'tady je string') },
        { id: 'num', label: T('else', 'else'), note: T('here it is number, by elimination', 'tady je number, vyloučením') },
      ],
      edges: [
        { from: 'start', to: 'null', label: T('first branch', 'první větev') },
        { from: 'start', to: 'str', label: T('second branch', 'druhá větev') },
        { from: 'start', to: 'num', label: T('everything left', 'všechno, co zbývá') },
      ],
    },
  },

  /* ── React ───────────────────────────────────────────────────────────── */
  {
    id: 'react-data-flow',
    topic: 'react',
    level: 3,
    title: T('Data goes down, events come up', 'Data dolů, události nahoru'),
    alt: T(
      'A parent holds the state and passes two props to a child: the value, and a function to call. The child renders the value and calls the function when the user acts. The child never changes the value itself — it reports what happened, and the parent decides what the new state is. That is why two children can stay in step: they read from the same place.',
      'Rodič drží stav a předává potomkovi dvě props: hodnotu a funkci k zavolání. Potomek hodnotu vykreslí a při akci uživatele funkci zavolá. Sám hodnotu nikdy nemění — jen ohlásí, co se stalo, a rodič rozhodne, jaký bude nový stav. Proto můžou dva potomci zůstat v souladu: čtou ze stejného místa.',
    ),
    body: {
      kind: 'flow',
      nodes: [
        { id: 'parent', label: T('Parent — holds the state', 'Rodič — drží stav') },
        { id: 'child', label: T('Child — renders it', 'Potomek — vykresluje') },
      ],
      edges: [
        { from: 'parent', to: 'child', label: T('props: the value', 'props: hodnota') },
        { from: 'parent', to: 'child', label: T('props: a function to call', 'props: funkce k zavolání') },
        { from: 'child', to: 'parent', label: T('calls it — “the user did this”', 'zavolá ji — „uživatel udělal tohle“') },
      ],
    },
  },
  {
    id: 'react-state-updates',
    topic: 'react',
    level: 8,
    title: T('Why two increments added one', 'Proč dvě zvýšení přidala jedna'),
    alt: T(
      'count is 0. A handler calls setCount(count + 1) twice. Both calls read the same count for this render, which is 0, so both schedule "set it to 1" and the result is 1. Written as setCount(c => c + 1) twice, each call receives the value the previous one produced, so the result is 2. The difference is whether the update reads a captured value or the latest one.',
      'count je 0. Obsluha zavolá setCount(count + 1) dvakrát. Obě volání čtou stejný count pro tento render, tedy 0, takže obě naplánují „nastav na 1“ a výsledek je 1. Zapsáno jako setCount(c => c + 1) dvakrát dostane každé volání hodnotu, kterou vytvořilo předchozí, takže výsledek je 2. Rozdíl je v tom, jestli aktualizace čte zachycenou hodnotu, nebo tu poslední.',
    ),
    body: {
      kind: 'steps',
      legend: [T('count', 'count')],
      frames: [
        { cells: ['0'], note: T('Before the handler runs.', 'Před spuštěním obsluhy.') },
        { cells: ['0'], marks: [{ index: 0, role: T('read as 0', 'přečteno jako 0') }], note: T('setCount(count + 1) — count is 0 for this render, so this schedules 1.', 'setCount(count + 1) — count je pro tento render 0, plánuje se tedy 1.') },
        { cells: ['0'], marks: [{ index: 0, role: T('read as 0 again', 'znovu přečteno jako 0') }], note: T('The second call reads the same 0 and schedules 1 as well.', 'Druhé volání čte stejnou 0 a plánuje taky 1.') },
        { cells: ['1'], marks: [{ index: 0, role: T('result', 'výsledek') }], note: T('One increment took effect. With c => c + 1 both would, giving 2.', 'Projevilo se jedno zvýšení. S c => c + 1 by se projevila obě a vyšlo by 2.') },
      ],
    },
  },

  /* ── Databases ───────────────────────────────────────────────────────── */
  {
    id: 'db-join',
    topic: 'databases',
    level: 6,
    title: T('The same query, two joins', 'Stejný dotaz, dva joiny'),
    alt: T(
      'Two fixture tables. users: (1, Ada), (2, Bo), (3, Cy). orders: (10, user 1), (11, user 1), (12, user 2). An INNER JOIN on user id returns three rows — Ada twice and Bo once — and Cy does not appear at all, because Cy has no order. A LEFT JOIN returns four rows: the same three, plus Cy with NULL for every order column. Ada appearing twice is not a bug; it is one row per match.',
      'Dvě ukázkové tabulky. users: (1, Ada), (2, Bo), (3, Cy). orders: (10, uživatel 1), (11, uživatel 1), (12, uživatel 2). INNER JOIN podle id uživatele vrátí tři řádky — Adu dvakrát a Boa jednou — a Cy se neobjeví vůbec, protože nemá objednávku. LEFT JOIN vrátí čtyři řádky: ty samé tři a navíc Cy s NULL ve všech sloupcích objednávky. To, že je Ada dvakrát, není chyba; je to jeden řádek na každou shodu.',
    ),
    body: {
      kind: 'table',
      columns: [T('user', 'uživatel'), T('order (INNER)', 'objednávka (INNER)'), T('order (LEFT)', 'objednávka (LEFT)')],
      rows: [
        ['Ada', '10', '10'],
        ['Ada', '11', '11'],
        ['Bo', '12', '12'],
        ['Cy', '—', 'NULL'],
      ],
      marks: [{ row: 3, role: T('only in the LEFT JOIN', 'jen v LEFT JOINu') }],
    },
  },

  /* ── DSA ─────────────────────────────────────────────────────────────── */
  {
    id: 'dsa-stack',
    topic: 'dsa',
    level: 6,
    title: T('A stack: last in, first out', 'Zásobník: poslední dovnitř, první ven'),
    alt: T(
      'Push A, push B, push C, then pop. The stack after each step: [A], [A B], [A B C], then [A B] with C returned. The pop returns C, the most recent thing pushed, because both operations work on the same end. That end is the only one a stack lets you touch, which is what makes both operations constant time.',
      'Push A, push B, push C, pak pop. Zásobník po jednotlivých krocích: [A], [A B], [A B C], pak [A B] a vrácené C. Pop vrátí C, tedy poslední vloženou položku, protože obě operace pracují na stejném konci. Ten konec je jediný, ke kterému zásobník pouští, a proto jsou obě operace v konstantním čase.',
    ),
    body: {
      kind: 'steps',
      legend: [T('bottom', 'dno')],
      frames: [
        { cells: ['A'], marks: [{ index: 0, role: T('top', 'vrchol') }], note: T('push A.', 'push A.') },
        { cells: ['A', 'B'], marks: [{ index: 1, role: T('top', 'vrchol') }], note: T('push B.', 'push B.') },
        { cells: ['A', 'B', 'C'], marks: [{ index: 2, role: T('top', 'vrchol') }], note: T('push C.', 'push C.') },
        { cells: ['A', 'B'], marks: [{ index: 1, role: T('top', 'vrchol') }], note: T('pop returns C — the last one in.', 'pop vrátí C — to poslední vložené.') },
      ],
    },
  },
  {
    id: 'dsa-queue',
    topic: 'dsa',
    level: 7,
    title: T('A queue: first in, first out', 'Fronta: první dovnitř, první ven'),
    alt: T(
      'Enqueue A, enqueue B, enqueue C, then dequeue. The queue after each step: [A], [A B], [A B C], then [B C] with A returned. The dequeue returns A, the oldest item, because a queue adds at one end and removes at the other. Same storage as a stack, opposite discipline — and the discipline is what the structure is for.',
      'Enqueue A, enqueue B, enqueue C, pak dequeue. Fronta po krocích: [A], [A B], [A B C], pak [B C] a vrácené A. Dequeue vrátí A, tedy nejstarší položku, protože fronta přidává na jednom konci a odebírá na druhém. Stejné úložiště jako zásobník, opačná disciplína — a právě o tu disciplínu ve struktuře jde.',
    ),
    body: {
      kind: 'steps',
      legend: [T('front', 'začátek')],
      frames: [
        { cells: ['A'], marks: [{ index: 0, role: T('front', 'začátek') }], note: T('enqueue A.', 'enqueue A.') },
        { cells: ['A', 'B'], marks: [{ index: 0, role: T('front', 'začátek') }], note: T('enqueue B — it joins the back.', 'enqueue B — řadí se na konec.') },
        { cells: ['A', 'B', 'C'], marks: [{ index: 0, role: T('front', 'začátek') }], note: T('enqueue C.', 'enqueue C.') },
        { cells: ['B', 'C'], marks: [{ index: 0, role: T('front', 'začátek') }], note: T('dequeue returns A — the first one in.', 'dequeue vrátí A — to první vložené.') },
      ],
    },
  },
  {
    id: 'dsa-binary-search',
    topic: 'dsa',
    level: 11,
    title: T('Halving a sorted array', 'Půlení seřazeného pole'),
    alt: T(
      'Searching for 23 in [2, 5, 8, 12, 16, 23, 38, 56] — eight sorted values, taking the lower middle when the window has an even length. Step 1: the middle is 12 at index 3, which is less than 23, so the whole left half and 12 itself are discarded. Step 2: the window is [16, 23, 38, 56] and its middle is 23 — found, in two comparisons. Scanning from the left would have taken six, because 23 is the sixth value. Sorted order is the precondition: on an unsorted array this finds nothing.',
      'Hledáme 23 v [2, 5, 8, 12, 16, 23, 38, 56] — osm seřazených hodnot, u sudého okna bereme nižší prostřední. Krok 1: prostřední je 12 na indexu 3, což je méně než 23, takže padá celá levá polovina i samotná 12. Krok 2: oknem je [16, 23, 38, 56] a jeho prostřední je 23 — nalezeno, na dvě porovnání. Průchod zleva by potřeboval šest, protože 23 je šestá hodnota. Předpokladem je seřazení: v neseřazeném poli tohle nenajde nic.',
    ),
    assumes: T('The array is sorted ascending; the lower middle is taken when the window has an even length.', 'Pole je seřazené vzestupně; u sudého okna se bere nižší prostřední.'),
    body: {
      kind: 'steps',
      legend: [T('sorted values', 'seřazené hodnoty')],
      frames: [
        { cells: ['2', '5', '8', '12', '16', '23', '38', '56'], marks: [{ index: 3, role: T('middle', 'prostřední') }], note: T('The middle is 12, and 12 < 23 — so the left half and 12 itself are gone.', 'Prostřední je 12 a 12 < 23 — levá polovina i samotná 12 padají.') },
        { cells: ['16', '23', '38', '56'], marks: [{ index: 1, role: T('middle', 'prostřední') }], note: T('Four values left; the lower middle is 23.', 'Zbývají čtyři hodnoty; nižší prostřední je 23.') },
        { cells: ['16', '23', '38', '56'], marks: [{ index: 1, role: T('found', 'nalezeno') }], note: T('Found in two comparisons. Scanning from the left would have taken six.', 'Nalezeno na dvě porovnání. Průchod zleva by potřeboval šest.') },
      ],
    },
  },
  {
    id: 'dsa-growth',
    topic: 'dsa',
    level: 2,
    title: T('What the notation is actually saying', 'Co ten zápis vlastně říká'),
    alt: T(
      'Rough operation counts as the input grows. At n = 10: constant 1, logarithmic 3, linear 10, linearithmic 33, quadratic 100. At n = 1000: constant 1, logarithmic 10, linear 1000, linearithmic 9966, quadratic 1000000. The point is not the exact numbers — it is that the gap between the rows widens with n, which is why the shape of the growth matters more than the speed of any one step.',
      'Přibližný počet operací s rostoucím vstupem. Při n = 10: konstantní 1, logaritmický 3, lineární 10, linearitmický 33, kvadratický 100. Při n = 1000: konstantní 1, logaritmický 10, lineární 1000, linearitmický 9966, kvadratický 1000000. Nejde o přesná čísla — jde o to, že se rozestup mezi řádky s rostoucím n zvětšuje, a proto na tvaru růstu záleží víc než na rychlosti jednoho kroku.',
    ),
    body: {
      kind: 'table',
      columns: [T('Growth', 'Růst'), T('n = 10', 'n = 10'), T('n = 1000', 'n = 1000')],
      rows: [
        ['O(1)', '1', '1'],
        ['O(log n)', '3', '10'],
        ['O(n)', '10', '1 000'],
        ['O(n log n)', '33', '9 966'],
        ['O(n²)', '100', '1 000 000'],
      ],
      marks: [{ row: 4, role: T('grows fastest', 'roste nejrychleji') }],
    },
  },

  /* ── General ─────────────────────────────────────────────────────────── */
  {
    id: 'general-request',
    topic: 'general',
    level: 2,
    title: T('One click, end to end', 'Jedno kliknutí od začátku do konce'),
    alt: T(
      'A click becomes a request: the browser resolves the domain to an address, opens a connection, and sends an HTTP request. A server receives it, usually reads or writes a database, and sends back a status and a body. The browser then renders the result. Every step can fail on its own, which is why a status code tells you which one did.',
      'Z kliknutí se stane požadavek: prohlížeč přeloží doménu na adresu, otevře spojení a pošle HTTP požadavek. Server ho přijme, obvykle něco přečte nebo zapíše do databáze, a pošle zpět stavový kód a tělo odpovědi. Prohlížeč pak výsledek vykreslí. Každý krok může selhat samostatně — proto stavový kód říká, který to byl.',
    ),
    body: {
      kind: 'flow',
      nodes: [
        { id: 'browser', label: T('Browser', 'Prohlížeč') },
        { id: 'dns', label: T('Domain lookup', 'Překlad domény'), note: T('name → address', 'jméno → adresa') },
        { id: 'server', label: T('Server', 'Server') },
        { id: 'db', label: T('Database', 'Databáze') },
      ],
      edges: [
        { from: 'browser', to: 'dns', label: T('where is example.com?', 'kde je example.com?') },
        { from: 'browser', to: 'server', label: T('GET /page — an HTTP request', 'GET /page — HTTP požadavek') },
        { from: 'server', to: 'db', label: T('read or write', 'čtení nebo zápis') },
        { from: 'server', to: 'browser', label: T('200 and a body, or an error status', '200 a tělo, nebo chybový stav') },
      ],
    },
  },
  {
    id: 'general-test-scope',
    topic: 'general',
    level: 16,
    title: T('What each kind of test can prove', 'Co který druh testu dokáže'),
    alt: T(
      'Three scopes, and the question each one can answer. A unit test runs one function and answers "does this function do what it says?" — fast, and blind to how the pieces fit together. An integration test runs several pieces together and answers "do these agree on the contract between them?" — slower, and blind to the browser. An end-to-end test drives the real thing and answers "can a person do this?" — slowest, most fragile, and the only one that catches a broken button. None of them proves the change is safe; each proves the checks that ran passed.',
      'Tři rozsahy a otázka, na kterou každý umí odpovědět. Jednotkový test spustí jednu funkci a odpoví na „dělá tahle funkce, co slibuje?“ — rychle, a nevidí, jak do sebe díly zapadají. Integrační test spustí několik dílů dohromady a odpoví na „shodnou se na smlouvě mezi sebou?“ — pomaleji, a nevidí prohlížeč. End-to-end test řídí skutečnou aplikaci a odpoví na „zvládne to člověk?“ — nejpomaleji, nejkřehčeji, a jako jediný odhalí rozbité tlačítko. Žádný z nich nedokazuje, že je změna bezpečná; každý dokazuje, že kontroly, které proběhly, prošly.',
    ),
    body: {
      kind: 'table',
      columns: [T('Scope', 'Rozsah'), T('Answers', 'Odpovídá na'), T('Blind to', 'Nevidí')],
      rows: [
        ['Unit', 'Does this function do what it says?', 'How the pieces fit together'],
        ['Integration', 'Do these pieces agree on their contract?', 'The browser and the user'],
        ['End-to-end', 'Can a person actually do this?', 'Nothing — but it is slow and fragile'],
      ],
    },
  },

  /* ── Node ────────────────────────────────────────────────────────────── */
  {
    id: 'node-streams',
    topic: 'nodejs',
    level: 10,
    title: T('Why a stream reads a 2 GB file on a 512 MB box', 'Proč stream přečte 2GB soubor na stroji s 512 MB'),
    alt: T(
      'Reading a file whole loads all of it into memory before anything can use it, so a 2 GB file needs 2 GB of memory. Reading it as a stream delivers it in chunks — 64 KB at a time by default — and each chunk can be processed and released before the next arrives, so the memory needed is one chunk rather than one file. The total work is the same; what changes is how much of it exists at once.',
      'Načtení souboru najednou dostane celý soubor do paměti, než s ním jde cokoli dělat, takže 2GB soubor potřebuje 2 GB paměti. Čtení streamem ho doručuje po částech — ve výchozím nastavení po 64 kB — a každá část se dá zpracovat a uvolnit dřív, než dorazí další, takže paměti je potřeba na jednu část, ne na celý soubor. Práce je stejná; mění se to, kolik z ní existuje naráz.',
    ),
    assumes: T('Default highWaterMark of 64 KB for a file stream.', 'Výchozí highWaterMark 64 kB pro souborový stream.'),
    body: {
      kind: 'flow',
      nodes: [
        { id: 'file', label: T('A 2 GB file', 'Soubor 2 GB') },
        { id: 'whole', label: T('readFile', 'readFile'), note: T('needs 2 GB of memory', 'potřebuje 2 GB paměti') },
        { id: 'stream', label: T('createReadStream', 'createReadStream'), note: T('needs one chunk', 'potřebuje jednu část') },
        { id: 'out', label: T('Your code', 'Tvůj kód') },
      ],
      edges: [
        { from: 'file', to: 'whole', label: T('all of it, then start', 'celý, pak začít') },
        { from: 'file', to: 'stream', label: T('64 KB at a time', 'po 64 kB') },
        { from: 'whole', to: 'out', label: T('one very large value', 'jedna velmi velká hodnota') },
        { from: 'stream', to: 'out', label: T('a chunk, released, repeat', 'část, uvolnit, znovu') },
      ],
    },
  },

  /* ── System design ───────────────────────────────────────────────────── */
  {
    id: 'sd-load-balancing',
    topic: 'system-design',
    level: 4,
    title: T('What a load balancer has to know', 'Co musí load balancer vědět'),
    alt: T(
      'One address in front of three servers. The balancer sends each request to one of them and stops sending to any server that fails its health check. Two things this only works with: the servers must be interchangeable, so a request can go to any of them, and session state must not live in a server\'s memory, or a learner signed in on server 1 is signed out the moment they land on server 2. Sticky routing hides that problem rather than fixing it.',
      'Jedna adresa před třemi servery. Balancer posílá každý požadavek jednomu z nich a přestane posílat tomu, který neprojde kontrolou stavu. Dvě podmínky, bez kterých to nefunguje: servery musí být zaměnitelné, aby požadavek mohl jít kterémukoli, a stav relace nesmí žít v paměti serveru — jinak je uživatel přihlášený na serveru 1 odhlášený, jakmile dopadne na server 2. Lepivé směrování ten problém schová, neopraví.',
    ),
    body: {
      kind: 'flow',
      nodes: [
        { id: 'client', label: T('Clients', 'Klienti') },
        { id: 'lb', label: T('Load balancer', 'Load balancer'), note: T('one address', 'jedna adresa') },
        { id: 's1', label: T('Server 1', 'Server 1') },
        { id: 's2', label: T('Server 2', 'Server 2') },
        { id: 's3', label: T('Server 3', 'Server 3'), note: T('failing its health check', 'neprochází kontrolou stavu') },
        { id: 'store', label: T('Shared session store', 'Sdílené úložiště relací') },
      ],
      edges: [
        { from: 'client', to: 'lb', label: T('every request', 'každý požadavek') },
        { from: 'lb', to: 's1', label: T('forwarded', 'přeposláno') },
        { from: 'lb', to: 's2', label: T('forwarded', 'přeposláno') },
        { from: 'lb', to: 's3', label: T('skipped while unhealthy', 'přeskočeno, dokud je nezdravý') },
        { from: 's1', to: 'store', label: T('session read from here, not memory', 'relace se čte odsud, ne z paměti') },
        { from: 's2', to: 'store', label: T('so any server can serve anyone', 'aby mohl obsloužit kdokoli') },
      ],
    },
  },
];

/* ── lookup and validation ─────────────────────────────────────────────── */

const BY_LEVEL = new Map<string, LessonFigure[]>();
for (const figure of LESSON_FIGURES) {
  const key = `${figure.topic}:${figure.level}`;
  BY_LEVEL.set(key, [...(BY_LEVEL.get(key) ?? []), figure]);
}

/**
 * The figures for one level.
 *
 * `phase` decides whether the ones held back until after the assessment are
 * included. Before submission the learner sees neutral context only; a figure
 * that would answer the question is not shown early and then apologised for.
 */
export function figuresFor(
  topic: string,
  level: number,
  phase: 'before' | 'after' = 'before',
): LessonFigure[] {
  return visibleFigures(BY_LEVEL.get(`${topic}:${level}`) ?? [], phase);
}

/** The phase filter on its own, so the rule can be checked against a figure
 * that is marked — none of the authored ones is today, and the mechanism has to
 * work the first time an author needs it. */
export const visibleFigures = (
  figures: readonly LessonFigure[],
  phase: 'before' | 'after',
): LessonFigure[] =>
  phase === 'after' ? [...figures] : figures.filter((figure) => !figure.afterSubmission);

/** Structural problems an authoring mistake would introduce. Empty is correct. */
export function validateFigures(levelCount: (topic: string) => number): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const figure of LESSON_FIGURES) {
    if (seen.has(figure.id)) problems.push(`duplicate figure ${figure.id}`);
    seen.add(figure.id);

    const levels = levelCount(figure.topic);
    if (levels === 0) problems.push(`${figure.id} names an unknown topic ${figure.topic}`);
    else if (figure.level < 1 || figure.level > levels) {
      problems.push(`${figure.id} names level ${figure.level}, outside ${figure.topic}'s 1-${levels}`);
    }

    for (const [field, text] of [['title', figure.title], ['alt', figure.alt]] as const) {
      if (!text.en.trim()) problems.push(`${figure.id} has no English ${field}`);
      if (!text.cs.trim()) problems.push(`${figure.id} has no Czech ${field}`);
    }
    // The alt text is the figure, not a caption for it. A short one is a label
    // that has been mistaken for content.
    if (figure.alt.en.length < 120) problems.push(`${figure.id}'s alt text is too short to replace the figure`);
    if (figure.alt.cs.length < 120) problems.push(`${figure.id}'s Czech alt text is too short to replace the figure`);
    if (/^(a |an |the )?(diagram|image|illustration|picture|figure)\b/i.test(figure.alt.en)) {
      problems.push(`${figure.id}'s alt text describes the picture instead of carrying its content`);
    }

    const body = figure.body;
    if (body.kind === 'flow') {
      const ids = new Set(body.nodes.map((node) => node.id));
      if (body.nodes.length === 0) problems.push(`${figure.id} has no nodes`);
      for (const edge of body.edges) {
        if (!ids.has(edge.from) || !ids.has(edge.to)) {
          problems.push(`${figure.id} has an edge between nodes that do not exist`);
        }
        // An unlabelled arrow means "somehow", which is the thing a diagram is
        // supposed to replace.
        if (!edge.label.en.trim() || !edge.label.cs.trim()) {
          problems.push(`${figure.id} has an unlabelled arrow`);
        }
      }
    } else if (body.kind === 'nested') {
      if (body.layers.length < 2) problems.push(`${figure.id} has nothing nested`);
    } else if (body.kind === 'table') {
      for (const row of body.rows) {
        if (row.length !== body.columns.length) problems.push(`${figure.id} has a row of the wrong width`);
      }
      for (const mark of body.marks ?? []) {
        if (mark.row < 0 || mark.row >= body.rows.length) problems.push(`${figure.id} marks a row that is not there`);
        // A mark carries a word, so it is never colour alone.
        if (!mark.role.en.trim() || !mark.role.cs.trim()) problems.push(`${figure.id} has a wordless mark`);
      }
    } else {
      if (body.frames.length < 2) problems.push(`${figure.id} is a sequence with nothing happening`);
      for (const frame of body.frames) {
        if (!frame.note.en.trim() || !frame.note.cs.trim()) problems.push(`${figure.id} has a frame with no description`);
        for (const mark of frame.marks ?? []) {
          if (mark.index < 0 || mark.index >= frame.cells.length) {
            problems.push(`${figure.id} marks a cell that is not in the frame`);
          }
          if (!mark.role.en.trim() || !mark.role.cs.trim()) problems.push(`${figure.id} has a wordless mark`);
        }
      }
    }
  }
  return problems;
}
