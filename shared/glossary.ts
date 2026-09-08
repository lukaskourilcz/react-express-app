/** The reviewed abbreviation glossary.
 *
 * devShark used to teach abbreviations as a subject: fifteen levels of what
 * letters stand for. That tests recall of expansions, which is not the thing
 * that stops a learner reading a sentence. What stops them is meeting `CORS` in
 * the middle of an explanation and not knowing what it does — and the answer to
 * that is help where the word is, not a path taken in advance.
 *
 * So the path is retired and this replaces it. Every entry is authored: the
 * expansion, one plain sentence about what it means *here*, and the domains it
 * belongs to, because plenty of these mean different things in different
 * places. Nothing is guessed, nothing is generated, and a term nobody has
 * written a definition for simply gets no help rather than an invented one.
 *
 * Two rules the matcher below enforces rather than assumes:
 *
 *   - **Word boundaries and case.** `API` matches `API`, and never the `api`
 *     inside `rapid` or a lowercase variable name.
 *   - **Not everything capitalised is an acronym.** `npm` is a name, not
 *     initials, and inventing an expansion for it would be worse than silence.
 *     The `expansion` field is optional for exactly this reason. */

import type { Localized } from './coding-catalog';

/** Where a term means what the entry says it means. A term with more than one
 * sense carries one entry per domain, and the surrounding content decides. */
export const GLOSSARY_DOMAINS = [
  'web', 'javascript', 'typescript', 'react', 'nodejs', 'databases',
  'security', 'devops', 'ai', 'dsa', 'general',
] as const;
export type GlossaryDomain = (typeof GLOSSARY_DOMAINS)[number];

export interface GlossaryEntry {
  /** The abbreviation exactly as it is written in content. */
  term: string;
  /** What the letters stand for. Absent when the term is a name rather than
   * initials — `npm` has no expansion, and pretending otherwise is a mistake. */
  expansion?: Localized;
  /** One sentence on what it means and why it matters here. */
  meaning: Localized;
  /** The domains this sense belongs to. A term with two senses has two
   * entries with different domains, and the content's own topic picks. */
  domains: readonly GlossaryDomain[];
  /** ISO date this entry was last reviewed. */
  reviewed: string;
}

const R = '2026-09-08';

export const GLOSSARY: readonly GlossaryEntry[] = [
  {
    term: 'API',
    expansion: { en: 'Application Programming Interface', cs: 'Application Programming Interface' },
    meaning: {
      en: 'The agreed set of calls one piece of software offers another — the promise about what you may ask for and what comes back.',
      cs: 'Dohodnutá sada volání, kterou jeden software nabízí druhému — slib o tom, co se smíš zeptat a co se vrátí.',
    },
    domains: ['web', 'javascript', 'nodejs', 'general', 'ai'],
    reviewed: R,
  },
  {
    term: 'HTTP',
    expansion: { en: 'HyperText Transfer Protocol', cs: 'HyperText Transfer Protocol' },
    meaning: {
      en: 'The request-and-response protocol the web runs on: a method, a URL, headers, and a status code coming back.',
      cs: 'Protokol dotazů a odpovědí, na kterém běží web: metoda, URL, hlavičky a stavový kód zpátky.',
    },
    domains: ['web', 'general', 'nodejs'],
    reviewed: R,
  },
  {
    term: 'HTTPS',
    expansion: { en: 'HTTP Secure', cs: 'HTTP Secure' },
    meaning: {
      en: 'HTTP carried over TLS, so the connection is encrypted, the server is authenticated, and nothing in between can alter it.',
      cs: 'HTTP přenášené přes TLS, takže je spojení šifrované, server ověřený a nic po cestě do něj nemůže zasáhnout.',
    },
    domains: ['web', 'security', 'general'],
    reviewed: R,
  },
  {
    term: 'URL',
    expansion: { en: 'Uniform Resource Locator', cs: 'Uniform Resource Locator' },
    meaning: {
      en: 'The address of a resource: scheme, host, path, and optionally a query string and a fragment.',
      cs: 'Adresa zdroje: schéma, host, cesta a případně dotaz a fragment.',
    },
    domains: ['web', 'general'],
    reviewed: R,
  },
  {
    term: 'DNS',
    expansion: { en: 'Domain Name System', cs: 'Domain Name System' },
    meaning: {
      en: 'The lookup that turns a hostname into an IP address before a connection can be opened.',
      cs: 'Vyhledání, které převede hostname na IP adresu, ještě než se dá otevřít spojení.',
    },
    domains: ['web', 'devops', 'general'],
    reviewed: R,
  },
  {
    term: 'CORS',
    expansion: { en: 'Cross-Origin Resource Sharing', cs: 'Cross-Origin Resource Sharing' },
    meaning: {
      en: 'The headers by which a server tells the browser which other origins may read its responses — a relaxation of the same-origin rule, granted by the target.',
      cs: 'Hlavičky, kterými server prohlížeči řekne, které jiné originy smí číst jeho odpovědi — uvolnění pravidla stejného originu, které uděluje cíl.',
    },
    domains: ['web', 'security', 'javascript'],
    reviewed: R,
  },
  {
    term: 'DOM',
    expansion: { en: 'Document Object Model', cs: 'Document Object Model' },
    meaning: {
      en: 'The live tree of objects a browser builds from HTML, and the thing scripts read and change.',
      cs: 'Živý strom objektů, který prohlížeč postaví z HTML a který skripty čtou a mění.',
    },
    domains: ['web', 'javascript', 'react'],
    reviewed: R,
  },
  {
    term: 'JSON',
    expansion: { en: 'JavaScript Object Notation', cs: 'JavaScript Object Notation' },
    meaning: {
      en: 'A text format for objects, arrays, strings, numbers, booleans and null — and nothing else, which is why dates and undefined do not survive it.',
      cs: 'Textový formát pro objekty, pole, řetězce, čísla, booleany a null — a nic jiného, proto ho data a undefined nepřežijí.',
    },
    domains: ['web', 'javascript', 'general'],
    reviewed: R,
  },
  {
    term: 'CSS',
    expansion: { en: 'Cascading Style Sheets', cs: 'Cascading Style Sheets' },
    meaning: {
      en: 'The language that describes how markup is presented, and the cascade that decides which rule wins when several apply.',
      cs: 'Jazyk, který popisuje, jak se značky zobrazí, a kaskáda, která rozhoduje, které pravidlo vyhraje, když jich platí víc.',
    },
    domains: ['web', 'general'],
    reviewed: R,
  },
  {
    term: 'HTML',
    expansion: { en: 'HyperText Markup Language', cs: 'HyperText Markup Language' },
    meaning: {
      en: 'The markup that gives a document its structure and meaning — headings, lists, links, form controls — before any styling.',
      cs: 'Značkovací jazyk, který dává dokumentu strukturu a význam — nadpisy, seznamy, odkazy, formulářové prvky — ještě před stylováním.',
    },
    domains: ['web', 'general'],
    reviewed: R,
  },
  {
    term: 'SPA',
    expansion: { en: 'Single-Page Application', cs: 'Single-Page Application' },
    meaning: {
      en: 'An app that loads one shell and then builds and changes the interface in the browser instead of fetching a new document per view.',
      cs: 'Aplikace, která načte jednu skořápku a pak rozhraní staví a mění v prohlížeči, místo aby pro každý pohled stahovala nový dokument.',
    },
    domains: ['web', 'react', 'general'],
    reviewed: R,
  },
  {
    term: 'SSR',
    expansion: { en: 'Server-Side Rendering', cs: 'Server-Side Rendering' },
    meaning: {
      en: 'Building the HTML on the server so the first response already contains the page, rather than a shell the browser has to fill in.',
      cs: 'Sestavení HTML na serveru, takže první odpověď už obsahuje stránku, ne skořápku, kterou musí doplnit prohlížeč.',
    },
    domains: ['react', 'web'],
    reviewed: R,
  },
  {
    term: 'JSX',
    meaning: {
      en: 'React’s syntax for describing elements in JavaScript. It is compiled to function calls — it is not HTML, and its attribute names differ in places.',
      cs: 'Syntaxe Reactu pro popis prvků v JavaScriptu. Kompiluje se na volání funkcí — není to HTML a názvy atributů se místy liší.',
    },
    domains: ['react'],
    reviewed: R,
  },
  {
    term: 'SQL',
    expansion: { en: 'Structured Query Language', cs: 'Structured Query Language' },
    meaning: {
      en: 'The language for querying and changing relational data: what to select, from where, filtered how, grouped by what.',
      cs: 'Jazyk pro dotazování a změny relačních dat: co vybrat, odkud, jak filtrovat, podle čeho seskupit.',
    },
    domains: ['databases', 'general'],
    reviewed: R,
  },
  {
    term: 'ORM',
    expansion: { en: 'Object-Relational Mapping', cs: 'Object-Relational Mapping' },
    meaning: {
      en: 'A layer that presents rows as objects. It saves boilerplate and hides the query, which is fine until the query is the problem.',
      cs: 'Vrstva, která prezentuje řádky jako objekty. Ušetří opakovaný kód a skryje dotaz, což je v pořádku, dokud není problémem právě ten dotaz.',
    },
    domains: ['databases', 'nodejs'],
    reviewed: R,
  },
  {
    term: 'ACID',
    expansion: { en: 'Atomicity, Consistency, Isolation, Durability', cs: 'Atomicity, Consistency, Isolation, Durability' },
    meaning: {
      en: 'The four guarantees a transactional database offers: all-or-nothing, valid state, non-interference, and surviving a crash.',
      cs: 'Čtyři záruky transakční databáze: všechno nebo nic, platný stav, nerušení se navzájem a přežití pádu.',
    },
    domains: ['databases'],
    reviewed: R,
  },
  {
    term: 'JWT',
    expansion: { en: 'JSON Web Token', cs: 'JSON Web Token' },
    meaning: {
      en: 'A signed token carrying claims. The signature proves who issued it; it is not encrypted, so anything inside it is readable.',
      cs: 'Podepsaný token nesoucí tvrzení. Podpis dokazuje, kdo ho vydal; není šifrovaný, takže cokoli uvnitř je čitelné.',
    },
    domains: ['security', 'web', 'nodejs'],
    reviewed: R,
  },
  {
    term: 'XSS',
    expansion: { en: 'Cross-Site Scripting', cs: 'Cross-Site Scripting' },
    meaning: {
      en: 'Getting your script to run in someone else’s page, usually by way of content the page rendered without escaping it.',
      cs: 'Dostat svůj skript do cizí stránky, obvykle přes obsah, který stránka vykreslila bez ošetření.',
    },
    domains: ['security', 'web'],
    reviewed: R,
  },
  {
    term: 'CSRF',
    expansion: { en: 'Cross-Site Request Forgery', cs: 'Cross-Site Request Forgery' },
    meaning: {
      en: 'Making a signed-in browser send a request it did not intend, using the credentials it already carries.',
      cs: 'Přimět přihlášený prohlížeč odeslat požadavek, který nechtěl, s pověřeními, která už nese.',
    },
    domains: ['security', 'web'],
    reviewed: R,
  },
  {
    term: 'RBAC',
    expansion: { en: 'Role-Based Access Control', cs: 'Role-Based Access Control' },
    meaning: {
      en: 'Deciding what someone may do from the role they hold, rather than from a list attached to each person.',
      cs: 'Rozhodování, co kdo smí, podle role, kterou má, místo podle seznamu připojeného ke každému člověku.',
    },
    domains: ['security', 'databases'],
    reviewed: R,
  },
  {
    term: 'RLS',
    expansion: { en: 'Row-Level Security', cs: 'Row-Level Security' },
    meaning: {
      en: 'Rules the database itself applies to decide which rows a caller may see, so a forgotten filter in the application is not the only defence.',
      cs: 'Pravidla, která si databáze uplatňuje sama, aby rozhodla, které řádky volající vidí — aby zapomenutý filtr v aplikaci nebyl jedinou obranou.',
    },
    domains: ['databases', 'security'],
    reviewed: R,
  },
  {
    term: 'CI',
    expansion: { en: 'Continuous Integration', cs: 'Continuous Integration' },
    meaning: {
      en: 'Merging work frequently and running the checks automatically on every change, so problems are found small.',
      cs: 'Časté slučování práce a automatické spouštění kontrol na každou změnu, aby se problémy našly, dokud jsou malé.',
    },
    domains: ['devops', 'general'],
    reviewed: R,
  },
  {
    term: 'CD',
    expansion: { en: 'Continuous Delivery', cs: 'Continuous Delivery' },
    meaning: {
      en: 'Keeping the main branch releasable at all times, so shipping is a decision rather than a project.',
      cs: 'Držet hlavní větev vždy vydatelnou, aby nasazení bylo rozhodnutí, ne projekt.',
    },
    domains: ['devops'],
    reviewed: R,
  },
  {
    term: 'CDN',
    expansion: { en: 'Content Delivery Network', cs: 'Content Delivery Network' },
    meaning: {
      en: 'Servers near the user that hold copies of your static responses, so the distance a byte travels is shorter.',
      cs: 'Servery blízko uživatele, které drží kopie statických odpovědí, aby bajt cestoval kratší vzdálenost.',
    },
    domains: ['devops', 'web'],
    reviewed: R,
  },
  {
    term: 'TTL',
    expansion: { en: 'Time To Live', cs: 'Time To Live' },
    meaning: {
      en: 'How long a cached or stored value may be used before it must be fetched or checked again.',
      cs: 'Jak dlouho se smí uložená hodnota používat, než se musí znovu načíst nebo ověřit.',
    },
    domains: ['devops', 'databases', 'web'],
    reviewed: R,
  },
  {
    term: 'LLM',
    expansion: { en: 'Large Language Model', cs: 'Large Language Model' },
    meaning: {
      en: 'A model that predicts text. Useful where a plausible answer is checkable; unreliable wherever the answer has to be exactly right and nothing verifies it.',
      cs: 'Model, který předpovídá text. Užitečný tam, kde se pravděpodobná odpověď dá ověřit; nespolehlivý všude, kde musí být přesná a nic ji nekontroluje.',
    },
    domains: ['ai'],
    reviewed: R,
  },
  {
    term: 'RAG',
    expansion: { en: 'Retrieval-Augmented Generation', cs: 'Retrieval-Augmented Generation' },
    meaning: {
      en: 'Fetching relevant documents first and giving them to the model, so its answer is grounded in something you can cite and check.',
      cs: 'Nejdřív najít relevantní dokumenty a dát je modelu, aby odpověď stála na něčem, co jde citovat a ověřit.',
    },
    domains: ['ai'],
    reviewed: R,
  },
  {
    term: 'MCP',
    expansion: { en: 'Model Context Protocol', cs: 'Model Context Protocol' },
    meaning: {
      en: 'A protocol for exposing tools and data to a model through a declared interface, rather than by pasting them into a prompt.',
      cs: 'Protokol pro zpřístupnění nástrojů a dat modelu přes deklarované rozhraní, místo vkládání do promptu.',
    },
    domains: ['ai'],
    reviewed: R,
  },
  {
    term: 'DSA',
    expansion: { en: 'Data Structures and Algorithms', cs: 'Datové struktury a algoritmy' },
    meaning: {
      en: 'How data is arranged and what that arrangement costs — the arrays, maps, stacks, queues, trees and the operations over them.',
      cs: 'Jak jsou data uspořádaná a co to uspořádání stojí — pole, mapy, zásobníky, fronty, stromy a operace nad nimi.',
    },
    domains: ['dsa', 'general'],
    reviewed: R,
  },
  {
    term: 'TDD',
    expansion: { en: 'Test-Driven Development', cs: 'Test-Driven Development' },
    meaning: {
      en: 'Writing the failing test before the code that satisfies it. A way of working, not a requirement for a test to count.',
      cs: 'Napsat selhávající test dřív než kód, který ho splní. Způsob práce, ne podmínka, aby test platil.',
    },
    domains: ['general', 'devops'],
    reviewed: R,
  },
  {
    term: 'npm',
    // No expansion on purpose: it is a name, not initials. Inventing one would
    // be worse than saying nothing.
    meaning: {
      en: 'The default package registry and command-line tool for Node projects. The name is not an acronym.',
      cs: 'Výchozí registr balíčků a nástroj příkazové řádky pro projekty v Node. Název není zkratka.',
    },
    domains: ['nodejs', 'javascript', 'devops'],
    reviewed: R,
  },
  {
    term: 'ARIA',
    expansion: { en: 'Accessible Rich Internet Applications', cs: 'Accessible Rich Internet Applications' },
    meaning: {
      en: 'Attributes that describe roles, states and properties to assistive technology — for use when a native element cannot say it already.',
      cs: 'Atributy, které popisují role, stavy a vlastnosti asistivním technologiím — pro případy, kdy to nativní prvek neřekne sám.',
    },
    domains: ['web', 'react'],
    reviewed: R,
  },
];

/* ── matching ──────────────────────────────────────────────────────────── */

const BY_TERM = new Map<string, GlossaryEntry[]>();
for (const entry of GLOSSARY) {
  const list = BY_TERM.get(entry.term) ?? [];
  list.push(entry);
  BY_TERM.set(entry.term, list);
}

/** Every distinct term, longest first, so a longer match wins over a shorter
 * one that is a prefix of it. */
const TERMS = [...BY_TERM.keys()].sort((a, b) => b.length - a.length);

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The glossary entries a block of text actually contains, in the order the
 * terms first appear.
 *
 * Matching is exact-case and boundary-aware: `API` matches `API` and never the
 * `api` inside `rapid` or a lowercase identifier. When a term has more than one
 * sense, `domain` picks; without a hint every sense is returned, so a learner
 * sees that the word is ambiguous rather than being told the wrong one.
 */
export function termsIn(text: string, domain?: GlossaryDomain): GlossaryEntry[] {
  if (!text) return [];
  const found: GlossaryEntry[] = [];
  const seen = new Set<string>();
  for (const term of TERMS) {
    // A boundary on each side that is not a word character, so `API` inside
    // `APIs` still matches (plural) but `rapid` does not.
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escapeForRegExp(term)}(s?)($|[^A-Za-z0-9_])`);
    if (!pattern.test(text)) continue;
    const senses = BY_TERM.get(term) ?? [];
    const scoped = domain ? senses.filter((entry) => entry.domains.includes(domain)) : senses;
    for (const entry of scoped.length > 0 ? scoped : senses) {
      const key = `${entry.term}|${entry.domains.join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.push(entry);
    }
  }
  // Order by where each term first appears, so the list reads with the text.
  return found.sort((a, b) => text.indexOf(a.term) - text.indexOf(b.term));
}

/** Terms across several blocks — a question with its options and explanation —
 * de-duplicated, so one control covers the whole item. */
export function termsInAll(texts: readonly (string | undefined)[], domain?: GlossaryDomain): GlossaryEntry[] {
  const joined = texts.filter((one): one is string => typeof one === 'string' && one.length > 0).join('\n');
  return termsIn(joined, domain);
}

export const isGlossaryDomain = (value: unknown): value is GlossaryDomain =>
  typeof value === 'string' && (GLOSSARY_DOMAINS as readonly string[]).includes(value);
