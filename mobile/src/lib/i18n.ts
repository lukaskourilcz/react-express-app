// Lightweight i18n for the mobile UI (en/cs), mirroring the web app's two
// languages. The chosen language is persisted and also passed to the question
// endpoints so questions come back localized.
import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'cs';
const KEY = 'devquiz:lang';

const en = {
  'tab.learn': 'Learn', 'tab.streak': 'Streak', 'tab.quiz': 'Quiz', 'tab.play': 'Play', 'tab.ranks': 'Ranks', 'tab.account': 'Account',
  'common.retry': 'Retry', 'common.back': 'Back', 'common.close': 'Close', 'common.cancel': 'Cancel',
  'common.loading': 'Loading…', 'common.continue': 'Continue', 'common.done': 'Done', 'common.signIn': 'Sign in',
  'common.comingSoon': 'Coming soon',

  'learn.title': 'Learn', 'learn.levels': '{done}/{total} levels', 'learn.locked': 'Path locked',
  'learn.part': 'Part {n}',

  'streak.title': 'Streak', 'streak.days': 'day streak',
  'streak.todayDone': "Nice — you've practiced today! 🌱",
  'streak.todayTodo': 'Complete a lesson today to keep your streak alive.',
  'streak.garden': 'Your garden', 'streak.gardenSub': 'Each tile is a day — greener the more you learn.',
  'streak.longest': 'Longest streak', 'streak.activeDays': 'Active days',
  'streak.widgetAdd': 'Add the devShark widget to your Home Screen to watch your garden grow.',
  'streak.widgetGo': 'Home Screen widget available in the installed app (not Expo Go).',

  'lesson.correct': 'Correct', 'lesson.incorrect': 'Not quite',
  'lesson.levelComplete': 'Level complete!', 'lesson.checkpointComplete': 'Part test cleared!',
  'lesson.outOfHearts': 'Out of hearts!', 'lesson.notPassed': 'Not passed yet',
  'lesson.scoreLine': '{correct} of {total} correct', 'lesson.passNeeded': 'Score {pct}% to pass.',
  'lesson.outOfHeartsBody': 'You used all {max} hearts. Restart the level to try again.',
  'lesson.nextLevel': 'Next level', 'lesson.partTest': 'Part test',
  'lesson.tryAgain': 'Try again', 'lesson.backToPath': 'Back to path',
  'lesson.continue': 'Continue', 'lesson.finish': 'Finish', 'lesson.seeResult': 'See result',
  'lesson.checkpoint': 'Part test', 'lesson.level': 'Level {n}',

  'report.title': 'Report this question', 'report.thanks': 'Thank you!',
  'report.thanksBody': "We'll review this question soon.", 'report.submit': 'Send report',
  'report.detailPlaceholder': 'Anything else? (optional)',
  'report.reason.incorrect-answer': 'Wrong answer', 'report.reason.unclear': 'Unclear',
  'report.reason.typo': 'Typo', 'report.reason.outdated': 'Outdated',
  'report.reason.duplicate': 'Duplicate', 'report.reason.other': 'Other',

  'account.title': 'Account', 'account.signedInAs': 'Signed in as', 'account.signOut': 'Sign out',
  'account.signInGoogle': 'Continue with Google',
  'account.signInPrompt': 'Sign in to save your stats and appear on the leaderboard.',
  'account.savedCards': 'Saved cards', 'account.language': 'Language',
  'account.quizzes': 'Quizzes', 'account.accuracy': 'Accuracy', 'account.streak': 'Streak', 'account.best': 'Best streak',
  'account.tokens': 'Tokens', 'account.achievements': 'Achievements', 'account.stats': 'Statistics',
  'account.nextRank': '{xp} XP to {rank}', 'account.maxRank': 'Top rank reached',
  'account.menu.shop': 'Shop', 'account.menu.challenge': 'Daily Challenge', 'account.menu.cards': 'Saved cards',
  'account.menu.settings': 'Settings', 'account.menu.home': 'Home',

  'quiz.title': 'Quiz', 'quiz.questions': 'Questions', 'quiz.difficulty': 'Difficulty',
  'quiz.categories': 'Categories', 'quiz.start': 'Start quiz', 'quiz.selectCategories': 'Pick at least one category',
  'quiz.difficulty.basics': 'Basics', 'quiz.difficulty.easy': 'Easy', 'quiz.difficulty.zero-to-hero': 'Zero to hero',
  'quiz.difficulty.advanced': 'Advanced', 'quiz.difficulty.mixed': 'Mixed',
  'quiz.result': 'Quiz complete', 'quiz.scoreLine': '{correct} / {total} correct',
  'quiz.review': 'Review answers', 'quiz.retry': 'New quiz', 'quiz.xpEarned': '+{xp} XP',
  'quiz.challengeCta': 'Try the daily challenge', 'quiz.bookmark': 'Bookmark', 'quiz.bookmarked': 'Bookmarked',
  'quiz.yourAnswer': 'Your answer', 'quiz.correctAnswer': 'Correct answer',

  'challenge.title': 'Biggest Shark', 'challenge.subtitle': 'Answer as many as you can in 90 seconds. Three wrong and the run ends.',
  'challenge.start': 'Start run', 'challenge.tapToStart': 'Tap to start', 'challenge.timeLeft': '{s}s',
  'challenge.score': 'Score', 'challenge.gameOver': "Time's up!", 'challenge.finalScore': 'Final score',
  'challenge.playAgain': 'Play again', 'challenge.best': 'Best: {n}', 'challenge.xpEarned': '+{xp} XP',
  'challenge.correct': 'Correct answers',

  'shop.title': 'Shop', 'shop.tokens': '{n} tokens', 'shop.owned': 'Owned', 'shop.equip': 'Equip',
  'shop.equipped': 'Equipped', 'shop.buy': 'Buy', 'shop.insufficient': 'Not enough tokens',
  'shop.boosters': 'Boosters', 'shop.cosmetics': 'Cosmetics', 'shop.paths': 'Unlock paths',
  'shop.purchased': 'Purchased!', 'shop.charges': '{n} charge(s)', 'shop.unlockHint': 'Instantly open a learning path',

  'leaderboard.title': 'Leaderboard', 'leaderboard.global': 'All-time', 'leaderboard.daily': 'Today',
  'leaderboard.category': 'By topic', 'leaderboard.empty': 'No scores yet — be the first!',
  'leaderboard.correct': '{n} correct', 'leaderboard.you': 'You',

  'play.title': 'Play', 'play.joinPrompt': 'Enter a match code to join a game hosted on the web.',
  'play.code': 'Match code', 'play.join': 'Join match', 'play.waiting': 'Waiting for the host to start…',
  'play.finalScores': 'Final scores', 'play.leave': 'Leave', 'play.timeLeft': '{s}s',
  'play.you': 'You', 'play.answered': 'Answer locked in',

  'settings.title': 'Settings', 'settings.appearance': 'Appearance', 'settings.system': 'System',
  'settings.light': 'Light', 'settings.dark': 'Dark', 'settings.sound': 'Sound & haptics',
  'settings.soundDesc': 'Haptic feedback on answers.', 'settings.language': 'Language', 'settings.track': 'Learning track',
  'settings.track.none': 'None', 'settings.track.frontend': 'Frontend', 'settings.track.backend': 'Backend',
  'settings.track.fullstack': 'Full-Stack',

  'home.title': 'devShark', 'home.subtitle': 'Test your web-dev skills across 21 topics.',
  'home.cta.learn': 'Continue learning', 'home.cta.quiz': 'Quick quiz', 'home.cta.challenge': 'Daily challenge',
  'home.cta.play': 'Play with friends', 'home.free': 'Free forever. No ads.',

  'cards.title': 'Saved cards', 'cards.signIn': 'Sign in to see your saved cards.',
  'cards.empty': 'No saved cards yet. Bookmark questions to review them here.', 'cards.remove': 'Remove',

  'xp.rankUp': 'Rank up! {title}',
};

const cs: Record<keyof typeof en, string> = {
  'tab.learn': 'Učení', 'tab.streak': 'Série', 'tab.quiz': 'Kvíz', 'tab.play': 'Hra', 'tab.ranks': 'Žebříček', 'tab.account': 'Účet',
  'common.retry': 'Zkusit znovu', 'common.back': 'Zpět', 'common.close': 'Zavřít', 'common.cancel': 'Zrušit',
  'common.loading': 'Načítání…', 'common.continue': 'Pokračovat', 'common.done': 'Hotovo', 'common.signIn': 'Přihlásit se',
  'common.comingSoon': 'Již brzy',

  'learn.title': 'Učení', 'learn.levels': '{done}/{total} úrovní', 'learn.locked': 'Cesta zamčena',
  'learn.part': 'Část {n}',

  'streak.title': 'Série', 'streak.days': 'denní série',
  'streak.todayDone': 'Super — dnes jsi cvičil! 🌱',
  'streak.todayTodo': 'Dokonči dnes lekci a udrž si sérii.',
  'streak.garden': 'Tvoje zahrádka', 'streak.gardenSub': 'Každá dlaždice je den — čím víc se učíš, tím zelenější.',
  'streak.longest': 'Nejdelší série', 'streak.activeDays': 'Aktivních dní',
  'streak.widgetAdd': 'Přidej si widget devShark na plochu a sleduj, jak zahrádka roste.',
  'streak.widgetGo': 'Widget na plochu je dostupný v nainstalované aplikaci (ne v Expo Go).',

  'lesson.correct': 'Správně', 'lesson.incorrect': 'Skoro',
  'lesson.levelComplete': 'Úroveň splněna!', 'lesson.checkpointComplete': 'Test části splněn!',
  'lesson.outOfHearts': 'Došly životy!', 'lesson.notPassed': 'Zatím nesplněno',
  'lesson.scoreLine': '{correct} z {total} správně', 'lesson.passNeeded': 'K splnění potřebuješ {pct} %.',
  'lesson.outOfHeartsBody': 'Vyčerpal jsi všechny {max} životy. Zkus úroveň znovu.',
  'lesson.nextLevel': 'Další úroveň', 'lesson.partTest': 'Test části',
  'lesson.tryAgain': 'Zkusit znovu', 'lesson.backToPath': 'Zpět na cestu',
  'lesson.continue': 'Pokračovat', 'lesson.finish': 'Dokončit', 'lesson.seeResult': 'Zobrazit výsledek',
  'lesson.checkpoint': 'Test části', 'lesson.level': 'Úroveň {n}',

  'report.title': 'Nahlásit otázku', 'report.thanks': 'Děkujeme!',
  'report.thanksBody': 'Otázku brzy zkontrolujeme.', 'report.submit': 'Odeslat',
  'report.detailPlaceholder': 'Ještě něco? (nepovinné)',
  'report.reason.incorrect-answer': 'Špatná odpověď', 'report.reason.unclear': 'Nejasné',
  'report.reason.typo': 'Překlep', 'report.reason.outdated': 'Zastaralé',
  'report.reason.duplicate': 'Duplikát', 'report.reason.other': 'Jiné',

  'account.title': 'Účet', 'account.signedInAs': 'Přihlášen jako', 'account.signOut': 'Odhlásit se',
  'account.signInGoogle': 'Pokračovat přes Google',
  'account.signInPrompt': 'Přihlas se, ať se ukládají statistiky a objevíš se v žebříčku.',
  'account.savedCards': 'Uložené kartičky', 'account.language': 'Jazyk',
  'account.quizzes': 'Kvízů', 'account.accuracy': 'Úspěšnost', 'account.streak': 'Série', 'account.best': 'Nejdelší série',
  'account.tokens': 'Žetony', 'account.achievements': 'Úspěchy', 'account.stats': 'Statistiky',
  'account.nextRank': '{xp} XP do {rank}', 'account.maxRank': 'Nejvyšší hodnost dosažena',
  'account.menu.shop': 'Obchod', 'account.menu.challenge': 'Denní výzva', 'account.menu.cards': 'Uložené kartičky',
  'account.menu.settings': 'Nastavení', 'account.menu.home': 'Domů',

  'quiz.title': 'Kvíz', 'quiz.questions': 'Otázky', 'quiz.difficulty': 'Obtížnost',
  'quiz.categories': 'Kategorie', 'quiz.start': 'Spustit kvíz', 'quiz.selectCategories': 'Vyber aspoň jednu kategorii',
  'quiz.difficulty.basics': 'Základy', 'quiz.difficulty.easy': 'Lehká', 'quiz.difficulty.zero-to-hero': 'Od nuly k profíkovi',
  'quiz.difficulty.advanced': 'Pokročilá', 'quiz.difficulty.mixed': 'Smíšená',
  'quiz.result': 'Kvíz dokončen', 'quiz.scoreLine': '{correct} / {total} správně',
  'quiz.review': 'Projít odpovědi', 'quiz.retry': 'Nový kvíz', 'quiz.xpEarned': '+{xp} XP',
  'quiz.challengeCta': 'Zkus denní výzvu', 'quiz.bookmark': 'Uložit', 'quiz.bookmarked': 'Uloženo',
  'quiz.yourAnswer': 'Tvoje odpověď', 'quiz.correctAnswer': 'Správná odpověď',

  'challenge.title': 'Největší žralok', 'challenge.subtitle': 'Odpověz na co nejvíc otázek za 90 sekund. Tři chyby a konec.',
  'challenge.start': 'Spustit', 'challenge.tapToStart': 'Klepni pro start', 'challenge.timeLeft': '{s}s',
  'challenge.score': 'Skóre', 'challenge.gameOver': 'Čas vypršel!', 'challenge.finalScore': 'Konečné skóre',
  'challenge.playAgain': 'Hrát znovu', 'challenge.best': 'Nejlepší: {n}', 'challenge.xpEarned': '+{xp} XP',
  'challenge.correct': 'Správných odpovědí',

  'shop.title': 'Obchod', 'shop.tokens': '{n} žetonů', 'shop.owned': 'Vlastněno', 'shop.equip': 'Nasadit',
  'shop.equipped': 'Nasazeno', 'shop.buy': 'Koupit', 'shop.insufficient': 'Nedostatek žetonů',
  'shop.boosters': 'Vylepšení', 'shop.cosmetics': 'Ozdoby', 'shop.paths': 'Odemknout cesty',
  'shop.purchased': 'Zakoupeno!', 'shop.charges': '{n} nábojů', 'shop.unlockHint': 'Okamžitě otevře cestu učení',

  'leaderboard.title': 'Žebříček', 'leaderboard.global': 'Celkově', 'leaderboard.daily': 'Dnes',
  'leaderboard.category': 'Podle tématu', 'leaderboard.empty': 'Zatím žádné skóre — buď první!',
  'leaderboard.correct': '{n} správně', 'leaderboard.you': 'Ty',

  'play.title': 'Hra', 'play.joinPrompt': 'Zadej kód zápasu a připoj se ke hře hostované na webu.',
  'play.code': 'Kód zápasu', 'play.join': 'Připojit se', 'play.waiting': 'Čekání, až hostitel spustí hru…',
  'play.finalScores': 'Konečné skóre', 'play.leave': 'Opustit', 'play.timeLeft': '{s}s',
  'play.you': 'Ty', 'play.answered': 'Odpověď uložena',

  'settings.title': 'Nastavení', 'settings.appearance': 'Vzhled', 'settings.system': 'Systém',
  'settings.light': 'Světlý', 'settings.dark': 'Tmavý', 'settings.sound': 'Zvuk a haptika',
  'settings.soundDesc': 'Haptická odezva u odpovědí.', 'settings.language': 'Jazyk', 'settings.track': 'Zaměření',
  'settings.track.none': 'Žádné', 'settings.track.frontend': 'Frontend', 'settings.track.backend': 'Backend',
  'settings.track.fullstack': 'Full-Stack',

  'home.title': 'devShark', 'home.subtitle': 'Otestuj své web-dev znalosti napříč 21 tématy.',
  'home.cta.learn': 'Pokračovat v učení', 'home.cta.quiz': 'Rychlý kvíz', 'home.cta.challenge': 'Denní výzva',
  'home.cta.play': 'Hrát s přáteli', 'home.free': 'Zdarma navždy. Bez reklam.',

  'cards.title': 'Uložené kartičky', 'cards.signIn': 'Přihlas se, ať vidíš uložené kartičky.',
  'cards.empty': 'Zatím žádné kartičky. Ulož si otázky a vrať se k nim tady.', 'cards.remove': 'Odebrat',

  'xp.rankUp': 'Postup! {title}',
};

export type TKey = keyof typeof en;
const DICTS: Record<Lang, Record<string, string>> = { en, cs };

let lang: Lang = 'en';
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadLang(): Promise<void> {
  const v = await AsyncStorage.getItem(KEY);
  if (v === 'cs' || v === 'en') {
    lang = v;
    emit();
  }
}
export function getLang(): Lang {
  return lang;
}
export async function setLang(l: Lang): Promise<void> {
  lang = l;
  await AsyncStorage.setItem(KEY, l);
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function translate(l: Lang, key: TKey, vars?: Record<string, string | number>): string {
  let s = DICTS[l][key] ?? DICTS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export type TFn = (key: TKey, vars?: Record<string, string | number>) => string;

/** Reactive translator + current language. */
export function useT(): { t: TFn; lang: Lang } {
  useEffect(() => {
    void loadLang();
  }, []);
  const current = useSyncExternalStore(subscribe, () => lang);
  return { t: (key, vars) => translate(current, key, vars), lang: current };
}
