/** Czech copy for the Forward Deployed Engineer path. Module overlays live
 * beside their English sources; this file carries the path-level copy.
 *
 * "Forward Deployed Engineer" stays in English because that is the name of
 * the role a Czech reader will meet in a job posting; the summary explains
 * what it means rather than inventing a Czech title nobody uses. */

import type { PathCs } from '../types';
import { FDE_DIAGNOSTIC_CS } from './fde/diagnostic.cs';
import { FDE_BRIDGES_CS } from './fde/bridges.cs';
import { FDE_M01_CS } from './fde/m01.cs';
import { FDE_M02_CS } from './fde/m02.cs';
import { FDE_M03_CS } from './fde/m03.cs';
import { FDE_M04_CS } from './fde/m04.cs';
import { FDE_M05_CS } from './fde/m05.cs';
import { FDE_M06_CS } from './fde/m06.cs';
import { FDE_M07_CS } from './fde/m07.cs';
import { FDE_M08_CS } from './fde/m08.cs';
import { FDE_M09_CS } from './fde/m09.cs';
import { FDE_M10_CS } from './fde/m10.cs';
import { FDE_C01_CS } from './fde/c01.cs';

export const FDE_PATH_CS: PathCs = {
  title: 'Forward Deployed Engineer',
  summary:
    'Deset modulů a etapový závěrečný projekt o práci mezi zákazníkovým nepřehledným problémem a systémem, který přežije kontakt s ním: vymezení zadání, integrace, ohraničené AI, vyhodnocení, bezpečnost, provoz a předání. Počítá s tím, že software už umíš stavět, a hodnotí úsudek, ne syntaxi. („Forward deployed“ je inženýr nasazený přímo u zákazníka.)',
  outcomes: [
    'Proměnit nejednoznačný požadavek zákazníka v zadání s výchozím měřením, měřitelnou podmínkou úspěchu a uvedenými hranicemi.',
    'Napojit se na reálně vypadající externí systém: špinavé záznamy, stránkování, omezování požadavků, opakované doručení a hranice identit.',
    'Rozhodnout, kde je správnou odpovědí deterministický kód a kde si model své místo zaslouží — a pak ohraničit, co model smí.',
    'Vyhodnotit řešení proti odložené sadě případů, odlišit selhání vyhledání od selhání generování a kvalitu od ceny a latence.',
    'Zvládnout nasazení, incident a předání, aniž by sis vymýšlel jistotu, kterou nemáš.',
  ],
  nonGoals: [
    'Certifikace. Dokončení vytvoří záznam o tom, co jsi v těchto cvičeních prošel, nic víc.',
    'Doklad o produkční praxi nebo jakékoli tvrzení o zaměstnání. Dokončení říká, co jsi udělal tady.',
    'Kurz jednoho dodavatele. Není potřeba žádný účet, placené API ani konkrétní framework a žádný se tu neučí jako odpověď.',
    'Serverem ověřené spouštění Pythonu. Python se tu čte; cokoli spustíš lokálně, je vlastní revize.',
    'Kurz psaní promptů. Samotná formulace promptu tady žádné bezpečnostní ani vyhodnocovací cvičení neprojde.',
  ],
  entryRequirement:
    'Měl bys umět stavět a dodávat software aspoň v jedné z cest Fullstack, Frontend nebo Backend: HTTP, databázi nebo API, které jsi napojoval, a JavaScript či TypeScript, který umíš odladit. Volitelná diagnostika změří zbytek a doporučí mosty; nic neblokuje a sama o sobě neuděluje žádnou výjimku.',
  completionLabel: 'Vedená cesta FDE dokončena',
  competencies: {
    discovery: {
      title: 'Zjišťování u zákazníka',
      summary: 'Proměnit mlhavý požadavek ve vymezený problém s výchozím měřením a podmínkami přijetí.',
    },
    integration: {
      title: 'Integrace a data',
      summary: 'Konzumovat externí systém, jehož data jsou neúplná, zdvojená, stránkovaná a omezovaná.',
    },
    boundaries: {
      title: 'Podnikové hranice',
      summary: 'Udržet oddělené nájemce, identity, oprávnění a životní cyklus dat i pod tlakem.',
    },
    'ai-architecture': {
      title: 'Volby v systémech s AI',
      summary: 'Vybrat mezi deterministickým kódem, jedním voláním modelu, workflow a agentem za daných omezení.',
    },
    retrieval: {
      title: 'Vyhledávání a opora v datech',
      summary: 'Opřít odpověď o vyhledané podklady, vynutit filtry přístupu a odmítnout odpověď, když pro ni podklad není.',
    },
    tools: {
      title: 'Nástroje a jejich hranice',
      summary: 'Dát modelu nástroje s kontrolovanými argumenty, omezeným rozsahem, rozpočtem na opakování a krokem schválení.',
    },
    evaluation: {
      title: 'Vyhodnocení',
      summary: 'Změřit změnu proti výchozímu stavu na odložených případech a všimnout si, když průměr zakrývá selhání.',
    },
    'ai-security': {
      title: 'Bezpečnost AI',
      summary: 'Brát vyhledaný i vygenerovaný obsah jako nedůvěryhodný a držet pravomoc ohraničenou, i když ti lže.',
    },
    operations: {
      title: 'Produkční dodávka',
      summary: 'Nasadit, sledovat, diagnostikovat z trasování a vrátit změnu zpět bez hádání.',
    },
    handoff: {
      title: 'Přijetí a předání',
      summary: 'Dostat operátora k tomu, aby to přijal, a nechat po sobě to, co bude potřebovat další člověk.',
    },
    'python-reading': {
      title: 'Čtení Pythonu',
      summary: 'Číst typovaný a asynchronní Python a kód API klientů natolik, abys mohl pracovat s datovým týmem.',
    },
  },
  modules: {
    'fde-v1-diagnostic': FDE_DIAGNOSTIC_CS,
    'fde-v1-bridges': FDE_BRIDGES_CS,
    'fde-v1-m01': FDE_M01_CS,
    'fde-v1-m02': FDE_M02_CS,
    'fde-v1-m03': FDE_M03_CS,
    'fde-v1-m04': FDE_M04_CS,
    'fde-v1-m05': FDE_M05_CS,
    'fde-v1-m06': FDE_M06_CS,
    'fde-v1-m07': FDE_M07_CS,
    'fde-v1-m08': FDE_M08_CS,
    'fde-v1-m09': FDE_M09_CS,
    'fde-v1-m10': FDE_M10_CS,
    'fde-v1-c01': FDE_C01_CS,
  },
  bridges: {
    'fde-bridge-backend-data': {
      title: 'Backend a data',
      summary:
        'Pro inženýry, kteří pracovali hlavně v prohlížeči. Projít autentizovaný požadavek od začátku do konce, validovat vstup na hranici, přetvarovat špinavá data a vědět, co vlastně slibuje join, transakce a idempotentní zápis.',
      referenceLabels: [
        'Node.js, úrovně Learn: moduly, async, HTTP',
        'Databáze, úrovně Learn: schéma, indexy, transakce',
        'Cvičení mostu: namapuj špinavý payload na validovaný záznam',
        'MDN — stavové kódy odpovědí HTTP',
      ],
    },
    'fde-bridge-operator-interface': {
      title: 'Rozhraní pro operátora',
      summary:
        'Pro inženýry, kteří pracovali hlavně za API. Obrazovka, na které operátor práci schvaluje, má stavy, jaké demo šťastné cesty nikdy neukáže: načítání, částečné selhání, opakování, citace, kterou si může ověřit, a zrušení, které práci opravdu zastaví.',
      referenceLabels: [
        'React, úrovně Learn: stav, efekty, vykreslování',
        'Testování, úrovně Learn: co na UI tvrdit',
        'Cvičení mostu: stavový automat schvalování operátorem',
        'MDN — aria-live pro stav, který se mění před očima',
      ],
    },
    'fde-bridge-delivery-operations': {
      title: 'Provoz dodávky',
      summary:
        'Pro každého, koho tu diagnostika nezměřila. Prostředí a tajemství, co vlastně CI chrání, rozdíl mezi logy, metrikami a trasováním a co stojí návrat změny, když se mezitím pohnulo schéma.',
      referenceLabels: [
        'DevOps, úrovně Learn: CI/CD, kontejnery, pozorovatelnost',
        'Bezpečnost, úrovně Learn: tajemství a bezpečné výchozí nastavení',
        'Případ mostu: přečti incident z jeho trasování',
      ],
    },
    'fde-bridge-python': {
      title: 'Souhra s Pythonem',
      summary:
        'Pro každého, kdo Python nečte denně. Datový tým ti podá notebooky a API klienty; potřebuješ číst typové anotace, asynchronní funkce, přetvarování JSONu a práci s prostředím natolik, abys s nimi mohl pracovat. Hodnotí se tu čtení. Cokoli spustíš lokálně, je tvoje vlastní poznámka zaznamenaná jako vlastní revize.',
      referenceLabels: [
        'Kontrola mostu: čti typovaný a asynchronní Python',
        'Dokumentace Pythonu — typing',
        'Dokumentace Pythonu — úlohy a korutiny v asyncio',
      ],
    },
  },
  rubric: {
    'problem-framing': {
      title: 'Vymezení problému',
      levels: {
        missing: 'Zopakuje požadavek, aniž by určil, kdo tu práci dnes dělá a co ho stojí.',
        partial: 'Pojmenuje operátora a bolest, ale nemá měřitelný výchozí stav ani uvedenou hranici.',
        adequate: 'Určí operátora, dnešní bolest, měřitelný výchozí stav, co je mimo zadání a podmínku, která by znamenala úspěch.',
        strong: 'Jako „dostatečné“ a navíc kompromis, který je obhájený, ne jen tvrzený, a souvislá reakce na změněný požadavek.',
      },
    },
    'technical-correctness': {
      title: 'Technická správnost',
      levels: {
        missing: 'Popsaný postup nemůže tak, jak je zadaný, fungovat.',
        partial: 'Funguje na šťastné cestě; jeden ze způsobů selhání uvedených v zadání není ošetřený.',
        adequate: 'Ošetřuje každý způsob selhání, který zadání jmenuje, a u každého je uvedené chování.',
        strong: 'Jako „dostatečné“ a navíc způsob selhání, který zadání nejmenovalo a který jsi našel z fixtur.',
      },
    },
    'integration-data-quality': {
      title: 'Integrace a kvalita dat',
      levels: {
        missing: 'Předpokládá čisté, úplné a jedinečné záznamy.',
        partial: 'Ošetřuje chybějící pole, ale ne duplicity, stránkování nebo opakované doručení.',
        adequate: 'Ošetřuje chybějící pole, duplicity, stránkování, omezování i opakované doručení a říká, co udělá se záznamem, který použít nelze.',
        strong: 'Jako „dostatečné“ a navíc je slučování idempotentní při přehrání v libovolném pořadí.',
      },
    },
    evaluation: {
      title: 'Vyhodnocení',
      levels: {
        missing: 'Žádné měření, nebo demo vydávané za důkaz.',
        partial: 'Jediné souhrnné číslo přes případy, proti kterým se návrh stavěl.',
        adequate: 'Odložená sada, výchozí stav k porovnání a kvalita uváděná odděleně od ceny a latence.',
        strong: 'Jako „dostatečné“ a navíc řez, ve kterém průměr zakrývá selhání, a míra odmítnutí uvedená vedle přesnosti.',
      },
    },
    security: {
      title: 'Bezpečnost',
      levels: {
        missing: 'Vyhledaný nebo vygenerovaný obsah se bere jako důvěryhodný vstup.',
        partial: 'Injektáž je zmíněná, ale volání nástroje pořád může jednat na základě neověřeného obsahu.',
        adequate: 'Nedůvěryhodný obsah nemůže autorizovat akci, překročit hranici nájemce ani rozšířit oprávnění, a kontrola je v kódu, ne ve formulaci.',
        strong: 'Jako „dostatečné“ a navíc nepřátelský případ, který zadání nedodalo, a uvedený dosah nejhoršího scénáře.',
      },
    },
    operability: {
      title: 'Provozovatelnost',
      levels: {
        missing: 'Žádný signál ke sledování a žádná cesta zpátky.',
        partial: 'Loguje, ale nic z toho by selhání neukázalo dřív než zákazník.',
        adequate: 'Signál, který by uvedené selhání zachytil, návrat změny, který je bezpečné spustit, a vlastník služby.',
        strong: 'Jako „dostatečné“ a navíc co návrat změny vzít zpátky neumí a jak se sladí stav, který po něm zůstane.',
      },
    },
    communication: {
      title: 'Komunikace',
      levels: {
        missing: 'Čtenář nepozná, co se rozhodlo ani proč.',
        partial: 'Rozhodnutí jsou vyjmenovaná; úvaha za nimi ne.',
        adequate: 'Rozhodnutí, důvod ke každému, otevřené otázky a co má čtenář udělat dál.',
        strong: 'Jako „dostatečné“, psané pro konkrétní adresáty, s nejistotou řečenou nahlas místo zahlazenou.',
      },
    },
  },
};
