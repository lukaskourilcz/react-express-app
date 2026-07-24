import type { QuestionTranslation } from './quiz-data';

// Czech (cs) translations for the devShark "Fix the failing test" set
// (testfix-1..24, category `testing`). Only the prose is translated: the code
// blocks and the option strings stay byte-identical to the English source so
// the code under test, the failure, and the stored correctAnswer index remain
// valid. Merged into the webdev translation bundle by question-bank-loader.ts.
export const fixTheTestTranslationsCs: Record<string, QuestionTranslation> = {
  'testfix-1': {
    introduction: 'Funkce a její test se liší o malou hodnotu. Porovnej, co funkce spočítá, s tím, co očekává aserce.',
    question: `Pomocná funkce sčítá dvě čísla, ale její test selhává.

\`\`\`js
function add(a, b) {
  return a + b + 1;
}

// FAILS: expect(add(2, 3)).toBe(5)  ->  Received: 6
\`\`\`

Která změna zajistí, že test projde?`,
    options: ['return a + b;', 'return a + b + 2;', 'return a * b;', 'return a - b;'],
    explanation: 'Implementace přičítá přebytečnou `+ 1`, takže `add(2, 3)` vrací 6 místo 5. Vrácení `a + b` dá součet, který test očekává. Ostatní možnosti dají 7, 6 a -1.',
  },
  'testfix-2': {
    introduction: 'Aserce dostává `undefined`. Zamysli se nad tím, co funkce vrací volajícímu.',
    question: `Tahle funkce něco spočítá, ale aserce dostane \`undefined\`.

\`\`\`js
function double(n) {
  n * 2;
}

// FAILS: expect(double(4)).toBe(8)  ->  Received: undefined
\`\`\`

Která změna zajistí, že test projde?`,
    options: ['n = n * 2;', 'return n * 2;', 'return n + 2;', 'console.log(n * 2);'],
    explanation: 'Funkce vyhodnotí `n * 2`, ale nikdy ho nevrátí, takže `double(4)` je `undefined`. Přidání `return` vrátí 8. Přiřazení do `n`, výpis ani vrácení `n + 2` zdvojnásobenou hodnotu nevrátí.',
  },
  'testfix-3': {
    introduction: 'Dva objekty mají stejný obsah, ale matcher přesto selhává. Připomeň si rozdíl mezi identitou a strukturální rovností.',
    question: `Dva objekty mají stejný obsah, přesto je matcher označí za různé.

\`\`\`js
function makeUser(name) {
  return { name };
}

// FAILS: expect(makeUser('Ada')).toBe({ name: 'Ada' })
// toBe compares identity, not structure
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      "expect(makeUser('Ada')).toBe({ name: 'Ada' });",
      "expect(makeUser('Ada')).toContain({ name: 'Ada' });",
      "expect(makeUser('Ada')).toEqual({ name: 'Ada' });",
      "expect(makeUser('Ada')).toEqual({ name: 'Ada', id: 1 });",
    ],
    explanation: '`toBe` používá `Object.is` (identitu reference) a dva samostatné objektové literály nikdy nejsou stejná reference, takže selže i při shodném tvaru. `toEqual` porovnává rekurzivně podle hodnoty a projde. `toContain` je pro pole a řetězce a čtyřpoložkový objekt očekává `id`, které výsledek nemá.',
  },
  'testfix-4': {
    introduction: 'Vrácená hodnota je řetězec, ne číslo. Podívej se, jak se obě hodnoty spojují.',
    question: `Funkce pro součet vrací řetězec tam, kde se čeká číslo.

\`\`\`js
function total(a, b) {
  return '' + a + b;
}

// FAILS: expect(total(2, 3)).toBe(5)  ->  Received: '23'
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      'return String(a) + String(b);',
      'return String(a + b);',
      'return a.toString() + b;',
      'return a + b;',
    ],
    explanation: "Prefix `''` převede čísla na řetězce, takže `2` a `3` se spojí do `'23'`. Vrácení `a + b` je ponechá číselné a dá `5`. `String(a) + String(b)` i `a.toString() + b` také spojují řetězce a `String(a + b)` vrací řetězec `'5'`, který neprojde striktní číselnou `toBe(5)`.",
  },
  'testfix-5': {
    introduction: 'Výsledek se liší o nepatrný zlomek. Zamysli se, jak se mají porovnávat čísla s pohyblivou řádovou čárkou.',
    question: `Součet v pohyblivé řádové čárce se porovnává na přesnou rovnost.

\`\`\`js
// FAILS: expect(0.1 + 0.2).toBe(0.3)
// Received: 0.30000000000000004
\`\`\`

Která změna nechá aserci projít beze změny výpočtu?`,
    options: [
      'expect(0.1 + 0.2).toBeCloseTo(0.3);',
      'expect(0.1 + 0.2).toBe(0.3);',
      'expect(0.1 + 0.2).toBeLessThan(0.3);',
      'expect(Math.round(0.1 + 0.2)).toBe(0.3);',
    ],
    explanation: 'Binární pohyblivá řádová čárka nedokáže `0.1 + 0.2` vyjádřit přesně; rovná se 0.30000000000000004, takže striktní `toBe(0.3)` selže. `toBeCloseTo(0.3)` porovnává s malou přesností a projde. Součet není menší než 0.3 a jeho zaokrouhlení dá 0, ne 0.3.',
  },
  'testfix-6': {
    introduction: 'Aserce dostala Promise místo hodnoty. Zvaž, jak test čeká na asynchronní práci.',
    question: `Asynchronní funkce se porovnává přímo se svou vyřešenou hodnotou.

\`\`\`js
async function getValue() {
  return 42;
}

test('returns 42', () => {
  expect(getValue()).toBe(42); // Received: Promise {}
});
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      "test('returns 42', () => { expect(getValue()).toEqual(42); });",
      "test('returns 42', async () => { expect(await getValue()).toBe(42); });",
      "test('returns 42', () => { expect(getValue().value).toBe(42); });",
      "test('returns 42', async () => { expect(getValue()).toBe(42); });",
    ],
    explanation: '`async` funkce vrací Promise, takže její přímé porovnání se 42 selže. Když je callback `async` a volání se `await`uje, rozbalí se vyřešená hodnota 42. `toEqual`, čtení `.value` i přidání `async` bez `await` stále porovnávají samotný Promise.',
  },
  'testfix-7': {
    introduction: 'Chyba je vyhozena dřív, než ji matcher stihne zachytit. Zamysli se, co `toThrow` potřebuje dostat.',
    question: `Test chce ověřit, že volání vyhodí výjimku, jenže chyba unikne dřív, než matcher poběží.

\`\`\`js
function parseAge(input) {
  const n = Number(input);
  if (Number.isNaN(n)) throw new Error('not a number');
  return n;
}

// FAILS: expect(parseAge('abc')).toThrow()
// parseAge('abc') throws before expect() is reached
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      "expect(parseAge('abc')).toThrow();",
      "expect(parseAge).toThrow('abc');",
      "expect(() => parseAge('abc')).toThrow();",
      "expect(await parseAge('abc')).toThrow();",
    ],
    explanation: "Zápis `parseAge('abc')` funkci zavolá okamžitě, takže vyhodí výjimku dřív, než ji `expect` zachytí. Obalení volání do šipkové funkce umožní Jestu zavolat ho uvnitř `toThrow` a chybu zachytit. Předání holé funkce ji zavolá s `undefined` a `await` synchronní vyhození neodloží.",
  },
  'testfix-8': {
    introduction: 'Stav z prvního testu prosakuje do druhého. Zamysli se nad izolací testů mezi sebou.',
    question: `Dva testy sdílejí jeden mock a druhý vidí volání zbylá po prvním.

\`\`\`js
const send = jest.fn();

test('first', () => { send('a'); expect(send).toHaveBeenCalledTimes(1); });
test('second', () => { send('b'); expect(send).toHaveBeenCalledTimes(1); });
// 'second' FAILS: Expected: 1, Received: 2
\`\`\`

Které přidání nechá projít oba testy?`,
    options: [
      'afterAll(() => send.mockClear());',
      'beforeAll(() => send.mockClear());',
      'afterEach(() => send.mockReturnValue(undefined));',
      'afterEach(() => send.mockClear());',
    ],
    explanation: 'Sdílený `jest.fn()` si drží historii volání napříč testy, takže do druhého testu už byl zavolán dvakrát. Vyčištění po každém testu (`mockClear` v `afterEach`) počítadlo resetuje. `afterAll` a `beforeAll` běží jen jednou a `mockReturnValue` mění návratovou hodnotu, ale volání nevyčistí.',
  },
  'testfix-9': {
    introduction: 'Pole se vrací v řetězcovém pořadí. Připomeň si, jak `sort` prvky ve výchozím stavu porovnává.',
    question: `Sestupné řazení vrací pole ve špatném pořadí.

\`\`\`js
function sortDesc(nums) {
  return nums.sort();
}

// FAILS: expect(sortDesc([1, 10, 2])).toEqual([10, 2, 1])
// Received: [1, 10, 2]
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      'return nums.sort((a, b) => b - a);',
      'return nums.sort().reverse();',
      'return nums.sort((a, b) => a - b);',
      'return nums.reverse();',
    ],
    explanation: '`Array.sort` bez komparátoru řadí podle řetězcového pořadí, takže `[1, 10, 2]` zůstane `[1, 10, 2]`. Číselný sestupný komparátor `(a, b) => b - a` dá `[10, 2, 1]`. Výchozí řazení obrácené dá `[2, 10, 1]`, vzestupné dá `[1, 2, 10]` a obrácení vstupu dá `[2, 10, 1]`.',
  },
  'testfix-10': {
    introduction: 'Zalogovaný řetězec je skoro správně. Porovnej ho znak po znaku s tím, co spy očekává.',
    question: `Logovací pomocník vytvoří zprávu, která se o jeden znak liší od toho, co spy očekává.

\`\`\`js
function greet(logger, name) {
  logger('Hi ' + name);
}

const logger = jest.fn();
greet(logger, 'Ada');

// FAILS: expect(logger).toHaveBeenCalledWith('Hi, Ada')
// Received: 'Hi Ada'
\`\`\`

Která změna funkce \`greet\` zajistí, že test projde?`,
    options: [
      "logger('Hi ' + name + '!');",
      "logger('Hi, ' + name);",
      "logger('Hi', name);",
      "logger('hi, ' + name);",
    ],
    explanation: "Aserce očekává přesný řetězec `'Hi, Ada'` (s čárkou), ale kód loguje `'Hi Ada'`. Přidání čárky odpovídá. Ostatní přidají vykřičník, rozdělí se na dva argumenty nebo změní velikost písmen, takže se očekávanému volání nerovnají.",
  },
  'testfix-11': {
    introduction: 'Callback časovače neproběhl. Zamysli se, jak falešné časovače posouvají virtuální čas dopředu.',
    question: `Se zapnutými falešnými časovači se ověřuje naplánovaný callback, který ale neproběhl.

\`\`\`js
jest.useFakeTimers();
const cb = jest.fn();
setTimeout(cb, 1000);

// FAILS: expect(cb).toHaveBeenCalledTimes(1)
// Received: 0
\`\`\`

Který řádek přidaný před aserci zajistí, že test projde?`,
    options: [
      'jest.clearAllTimers();',
      'jest.useRealTimers();',
      'jest.advanceTimersByTime(1000);',
      'await Promise.resolve();',
    ],
    explanation: 'S falešnými časovači naplánované callbacky neproběhnou, dokud neposuneš virtuální hodiny. `advanceTimersByTime(1000)` spustí čekající `setTimeout`, takže `cb` je zavolán jednou. Vyčištění časovačů ho zruší, přepnutí na reálné časovače už naplánovaný falešný časovač nespustí a vyprázdnění mikrotasku časovače neposune.',
  },
  'testfix-12': {
    introduction: 'Funkce místo synchronního vyhození Promise odmítne. Připomeň si, jak ověřit odmítnutý Promise.',
    question: `Asynchronní funkce hlásí neplatné id odmítnutím, ale test očekává synchronní vyhození.

\`\`\`js
async function loadUser(id) {
  if (id < 0) throw new Error('invalid id');
  return { id };
}

// FAILS: expect(loadUser(-1)).toThrow('invalid id')
// loadUser(-1) returns a rejected Promise
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      "expect(() => loadUser(-1)).toThrow('invalid id');",
      "await expect(loadUser(-1)).resolves.toThrow('invalid id');",
      "expect(await loadUser(-1)).toThrow('invalid id');",
      "await expect(loadUser(-1)).rejects.toThrow('invalid id');",
    ],
    explanation: "`async` funkce hlásí chyby odmítnutím svého Promise, ne synchronním vyhozením, takže `toThrow` na vráceném Promise selže. `await expect(promise).rejects.toThrow('invalid id')` počká na odmítnutí a ověří zprávu. Šipkový obal stále nevyhodí synchronně, `.resolves` očekává úspěch a `await` volání vyhodí dřív, než `expect` proběhne.",
  },
  'testfix-13': {
    introduction: 'Druhý test vidí data zanechaná prvním. Zamysli se, kdy se má sdílená příprava spouštět.',
    question: `Sdílený fixture se vytvoří jen jednou, takže stav z prvního testu prosakuje do druhého.

\`\`\`js
let cart;
beforeAll(() => { cart = []; });

test('adds one', () => { cart.push('a'); expect(cart).toHaveLength(1); });
test('starts empty', () => { expect(cart).toHaveLength(0); });
// 'starts empty' FAILS: Expected length: 0, Received length: 1
\`\`\`

Který hook má nahradit ten stávající, aby prošly oba testy?`,
    options: [
      'beforeEach(() => { cart = []; });',
      'afterEach(() => { cart = []; });',
      'beforeAll(() => { cart = null; });',
      'afterAll(() => { cart = []; });',
    ],
    explanation: '`beforeAll` inicializuje `cart` jen jednou, takže položka přidaná prvním testem tam pro druhý test zůstane. `beforeEach` vytvoří prázdné pole znovu před každým testem a testy izoluje. `afterEach` nebo odstranění časné přípravy nechá `cart` při běhu prvního testu nenastavený a `null` není pole, do kterého by šlo přidávat.',
  },
  'testfix-14': {
    introduction: 'Tvary sedí, ale matcher přesto selhává. Připomeň si, co `toStrictEqual` kontroluje nad rámec hodnot vlastností.',
    question: `Továrna vrací obyčejný objekt tam, kde test očekává instanci třídy.

\`\`\`js
class Point {
  constructor(x, y) { this.x = x; this.y = y; }
}
function makePoint(x, y) {
  return { x, y };
}

// FAILS: expect(makePoint(1, 2)).toStrictEqual(new Point(1, 2))
// Same fields, but the received value is not a Point
\`\`\`

Která změna funkce \`makePoint\` zajistí, že test projde?`,
    options: [
      'return Object.assign({}, { x, y });',
      'return new Point(x, y);',
      'return [x, y];',
      'return { x: x, y: y };',
    ],
    explanation: '`toStrictEqual` kontroluje strukturální rovnost a to, že obě hodnoty sdílejí stejný typ (konstruktor). Obyčejný `{ x, y }` není `Point`, takže selže. Vrácení `new Point(x, y)` vytvoří skutečnou instanci. `Object.assign` a `{ x: x, y: y }` zůstávají obyčejné objekty a `[x, y]` je pole.',
  },
  'testfix-15': {
    introduction: 'Kód `await`uje nebo řetězí Promise, ale mock vrací něco jiného. Slaď návratový typ mocku s tím, jak se hodnota používá.',
    question: `Kód volá \`.then\` na zamockovaném volání, ale mock vrací obyčejný objekt.

\`\`\`js
function getName(api) {
  return api.fetchUser().then((res) => res.name);
}

const api = { fetchUser: jest.fn() };
// FAILS: await expect(getName(api)).resolves.toBe('Ada')
// api.fetchUser(...).then is not a function
\`\`\`

Které nastavení mocku zajistí, že test projde?`,
    options: [
      "api.fetchUser.mockReturnValue({ name: 'Ada' });",
      'api.fetchUser.mockReturnValue(Promise.resolve());',
      "api.fetchUser.mockResolvedValue({ name: 'Ada' });",
      "api.fetchUser.mockImplementation(() => ({ name: 'Ada' }));",
    ],
    explanation: "Kód volá `.then` na návratové hodnotě mocku, takže mock musí vracet Promise. `mockResolvedValue({ name: 'Ada' })` vrací Promise, který se vyřeší na daný objekt. Obyčejný objekt z `mockReturnValue` nemá `.then`, vyřešení bez hodnoty udělá z `res.name` `undefined` a implementace stále vrací ne-Promise.",
  },
  'testfix-16': {
    introduction: 'Výsledek závisí na dni v kalendáři, kdy test běží. Zamysli se, jak tuhle závislost odstranit pevným vstupem.',
    question: `Kontrola víkendu projde jen v některé dny, protože čte skutečný kalendář.

\`\`\`js
function isWeekend(date = new Date()) {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

// FLAKY: expect(isWeekend()).toBe(true) depends on the run day
\`\`\`

Která změna zajistí, že test spolehlivě projde?`,
    options: [
      "expect(isWeekend(new Date('2026-07-24'))).toBe(true);",
      'expect(isWeekend()).toBe(true);',
      'expect(isWeekend(Date.now())).toBe(true);',
      "expect(isWeekend(new Date('2026-07-25'))).toBe(true);",
    ],
    explanation: 'Volání `isWeekend()` bez argumentu závisí na dni, kdy test běží, takže je nestabilní. Předání pevné soboty (`2026-07-25`, UTC den 6) ho udělá deterministickým a pravdivým. `2026-07-24` je pátek (den 5), volání bez argumentu zůstává závislé na datu a `Date.now()` vrací číslo bez `getUTCDay`.',
  },
  'testfix-17': {
    introduction: 'Výsledek má víc polí, než aserce vyjmenovává. Zamysli se nad matcherem, který kontroluje podmnožinu vlastností.',
    question: `Výsledek nese navíc pole s časovým razítkem, které aserce neuvádí.

\`\`\`js
function createOrder(id) {
  return { id, status: 'new', createdAt: Date.now() };
}

// FAILS: expect(createOrder(7)).toEqual({ id: 7, status: 'new' })
// Received has an extra createdAt property
\`\`\`

Která změna nechá test projít a zároveň ponechá \`createdAt\` ve výsledku?`,
    options: [
      "expect(createOrder(7)).toMatchObject({ id: 7, status: 'new' });",
      "expect(createOrder(7)).toEqual({ id: 7, status: 'new' });",
      "expect(createOrder(7)).toContain({ id: 7, status: 'new' });",
      "expect(createOrder(7)).toStrictEqual({ id: 7, status: 'new' });",
    ],
    explanation: '`toEqual` vyžaduje stejnou sadu vlastností, ale výsledek má navíc `createdAt`, takže selže. `toMatchObject` kontroluje, že přijatý objekt obsahuje alespoň očekávané vlastnosti, a přebytky ignoruje, takže projde. `toContain` je pro pole a řetězce a `toStrictEqual` je striktnější než `toEqual`.',
  },
  'testfix-18': {
    introduction: 'Spy z prvního testu stále přepisuje metodu ve druhém. Připomeň si, jak vrátit původní implementaci zpět.',
    question: `Spy nastavený v jednom testu stále přepisuje metodu v dalším.

\`\`\`js
const config = { mode: () => 'live' };

test('mocked mode', () => {
  jest.spyOn(config, 'mode').mockReturnValue('test');
  expect(config.mode()).toBe('test');
});
test('real mode', () => {
  expect(config.mode()).toBe('live'); // Received: 'test'
});
\`\`\`

Které přidání nechá projít oba testy?`,
    options: [
      'afterEach(() => jest.clearAllMocks());',
      'afterEach(() => jest.restoreAllMocks());',
      'beforeAll(() => jest.restoreAllMocks());',
      'afterAll(() => jest.restoreAllMocks());',
    ],
    explanation: "`jest.spyOn(...).mockReturnValue('test')` nahradí skutečnou metodu a tato náhrada přetrvá do dalšího testu, takže `config.mode()` stále vrací `'test'`. `restoreAllMocks` v `afterEach` vrátí původní metodu zpět. `clearAllMocks` resetuje jen data o voláních (návratová hodnota zůstává) a hooky spouštěné jednou mezi oběma testy nic neobnoví.",
  },
  'testfix-19': {
    introduction: 'Prvek se objeví až po asynchronní práci, ale dotaz proběhne okamžitě. Zamysli se nad dotazem, který počká.',
    question: `Komponenta zobrazí text až po asynchronním načtení, ale dotaz proběhne okamžitě.

\`\`\`jsx
render(<Profile />); // fetches, then renders the name

// FAILS: expect(screen.getByText('Ada')).toBeInTheDocument()
// Unable to find an element with the text: Ada
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      "expect(screen.queryByText('Ada')).toBeInTheDocument();",
      "expect(screen.getByText('Ada')).toBeVisible();",
      "expect(await screen.findByText('Ada')).toBeInTheDocument();",
      "expect(screen.getAllByText('Ada')).toBeInTheDocument();",
    ],
    explanation: 'Jméno se objeví až po asynchronním načtení, takže synchronní `getByText` proběhne příliš brzy a nic nenajde. `findByText` vrací Promise, který zkouší znovu, dokud se prvek neobjeví, takže jeho `await` projde. `queryByText` okamžitě vrátí null, `getAllByText` stále nic nenajde a změna matcheru na prvek nepočká.',
  },
  'testfix-20': {
    introduction: 'Callback se ještě nespustil, když aserce běží. Zamysli se nad opakováním aserce, dokud podmínka neplatí.',
    question: `Callback se spustí až po několika asynchronních taktech, ale aserce ho kontroluje příliš brzy.

\`\`\`js
const onReady = jest.fn();
startPolling(onReady); // invokes onReady after some async work

// FAILS: expect(onReady).toHaveBeenCalled()
// Received number of calls: 0
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      'expect(onReady).toHaveBeenCalled();',
      'setTimeout(() => expect(onReady).toHaveBeenCalled(), 0);',
      'await Promise.resolve(); expect(onReady).toHaveBeenCalled();',
      'await waitFor(() => expect(onReady).toHaveBeenCalled());',
    ],
    explanation: 'Callback se spustí až po několika asynchronních taktech, takže okamžitá aserce vidí nula volání. `waitFor` opakuje aserci, dokud neprojde nebo nevyprší čas. Odpojený callback `setTimeout` běží až po skončení testu a vyprázdnění jediného mikrotasku nezaručí pokrytí veškeré čekající asynchronní práce.',
  },
  'testfix-21': {
    introduction: 'Stav na úrovni modulu přechází mezi testy. Zamysli se, jak je registr modulů cachovaný.',
    question: `Zacachovaný modul si mezi testy drží své počítadlo.

\`\`\`js
// counter.js:  let count = 0; module.exports = () => ++count;
let next = require('./counter');

test('starts at 1', () => { expect(next()).toBe(1); });
test('also starts at 1', () => { expect(next()).toBe(1); });
// second test FAILS: Expected: 1, Received: 2
\`\`\`

Které nastavení zajistí, že projdou oba testy?`,
    options: [
      "beforeEach(() => { jest.resetModules(); next = require('./counter'); });",
      'beforeEach(() => { jest.clearAllMocks(); });',
      'beforeEach(() => { jest.restoreAllMocks(); });',
      "beforeEach(() => { next = require('./counter'); });",
    ],
    explanation: '`require` modul cachuje, takže `count` si drží hodnotu napříč testy a druhé volání vrátí 2. `jest.resetModules()` vyčistí registr a opětovné `require` vrátí čerstvý modul s `count` zpět na 0. Pomocníci pro čištění mocků se skutečného stavu modulu nedotknou a opětovné `require` bez resetu vrátí stejnou zacachovanou instanci.',
  },
  'testfix-22': {
    introduction: 'Jedno pole se generuje náhodně a nejde ho porovnat přesně. Připomeň si matchery, které ověřují typ hodnoty místo přesné hodnoty.',
    question: `Jedno pole se generuje náhodně, takže se nikdy neshoduje s pevnou očekávanou hodnotou.

\`\`\`js
function event(type) {
  return { type, id: Math.random().toString(36).slice(2) };
}

// FAILS: expect(event('click')).toEqual({ type: 'click', id: 'abc123' })
// id is random and differs every run
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      "expect(event('click')).toEqual({ type: 'click', id: 'abc123' });",
      "expect(event('click')).toEqual({ type: 'click', id: expect.any(String) });",
      "expect(event('click')).toEqual({ type: 'click', id: expect.any(Number) });",
      "expect(event('click')).toEqual({ type: expect.any(String) });",
    ],
    explanation: '`id` se generuje náhodně, takže jeho porovnání s pevným řetězcem vždy selže. Asymetrický matcher `expect.any(String)` přijme libovolné řetězcové id a přitom stále kontroluje `type`. `any(Number)` řetězcové id odmítne a vypuštění `id` z očekávaného objektu selže, protože výsledek nese vlastnost navíc.',
  },
  'testfix-23': {
    introduction: 'Funkce výjimku vyhodí, ale očekávaný typ chyby je špatný. Porovnej třídu vyhozené chyby s tou očekávanou.',
    question: `Funkce vyhodí vlastní chybu, ale test očekává špatný typ chyby.

\`\`\`js
class ValidationError extends Error {}
function check(n) {
  if (n < 0) throw new ValidationError('negative');
  return n;
}

// FAILS: expect(() => check(-1)).toThrow(TypeError)
// Thrown error is a ValidationError, not a TypeError
\`\`\`

Která změna zajistí, že test projde?`,
    options: [
      'expect(() => check(-1)).toThrow(RangeError);',
      'expect(() => check(-1)).not.toThrow();',
      'expect(() => check(-1)).toThrow(ValidationError);',
      'expect(() => check(1)).toThrow(ValidationError);',
    ],
    explanation: 'Kód vyhodí `ValidationError`, ale test očekává `TypeError`, takže kontrola konstruktoru selže. Ověření skutečného typu `ValidationError` projde. `RangeError` je stále špatný typ, `not.toThrow` je v rozporu s vyhozenou chybou a `check(1)` nevyhodí vůbec.',
  },
  'testfix-24': {
    introduction: 'Vrácený součet je prázdný, protože smyčka nečeká na asynchronní práci. Připomeň si, které smyčkové konstrukty respektují `await`.',
    question: `Asynchronní akumulátor se vrátí dřív, než jeho smyčka dokončí přičítání hodnot.

\`\`\`js
async function sumDoubled(items, dbl) {
  let sum = 0;
  items.forEach(async (n) => { sum += await dbl(n); });
  return sum;
}
const dbl = (n) => Promise.resolve(n * 2);

// FAILS: expect(await sumDoubled([1, 2, 3], dbl)).toBe(12)
// Received: 0
\`\`\`

Která změna smyčky zajistí, že test projde?`,
    options: [
      'items.map(async (n) => { sum += await dbl(n); });',
      'items.forEach((n) => { sum += dbl(n); });',
      'sum = await Promise.all(items.map((n) => dbl(n)));',
      'for (const n of items) { sum += await dbl(n); }',
    ],
    explanation: '`forEach` na svůj asynchronní callback nečeká, takže `sumDoubled` vrátí `sum` (stále 0) dřív, než proběhne jakékoli přičtení. Smyčka `for...of` s `await` každou zdvojnásobenou hodnotu přičte před návratem a dá 12. `map` bez `Promise.all` se také nečeká, samotný `forEach` přičítá objekty Promise místo čísel a přiřazení `Promise.all(...)` udělá ze `sum` pole `[2, 4, 6]` místo jejich součtu.',
  },
};
