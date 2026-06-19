// Lightweight i18n for the mobile UI (en/cs), mirroring the web app's two
// languages. The chosen language is persisted and also passed to the question
// endpoints so questions come back localized.
import { useEffect } from 'react';
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Lang = 'en' | 'cs';
const KEY = 'devquiz:lang';

const en = {
  'tab.learn': 'Learn', 'tab.streak': 'Streak', 'tab.quiz': 'Quiz', 'tab.ranks': 'Ranks', 'tab.account': 'Account',
  'common.retry': 'Retry', 'common.back': 'Back',
  'learn.title': 'Learn', 'learn.levels': '{done}/{total} levels',
  'streak.title': 'Streak', 'streak.days': 'day streak',
  'streak.todayDone': "Nice — you've practiced today! 🌱",
  'streak.todayTodo': 'Complete a lesson today to keep your streak alive.',
  'streak.garden': 'Your garden', 'streak.gardenSub': 'Each tile is a day — greener the more you learn.',
  'streak.longest': 'Longest streak', 'streak.activeDays': 'Active days',
  'streak.widgetAdd': 'Add the DevQuiz widget to your Home Screen to watch your garden grow.',
  'streak.widgetGo': 'Home Screen widget available in the installed app (not Expo Go).',
  'lesson.correct': 'Correct', 'lesson.incorrect': 'Not quite',
  'lesson.levelComplete': 'Level complete!', 'lesson.checkpointComplete': 'Checkpoint cleared!',
  'lesson.outOfHearts': 'Out of hearts!', 'lesson.notPassed': 'Not passed yet',
  'lesson.scoreLine': '{correct} of {total} correct', 'lesson.passNeeded': 'Score {pct}% to pass.',
  'lesson.outOfHeartsBody': 'You used all {max} hearts. Restart the level to try again.',
  'lesson.nextLevel': 'Next level', 'lesson.checkpointExam': 'Checkpoint exam',
  'lesson.tryAgain': 'Try again', 'lesson.backToPath': 'Back to path',
  'lesson.continue': 'Continue', 'lesson.finish': 'Finish', 'lesson.seeResult': 'See result',
  'lesson.checkpoint': 'Checkpoint', 'lesson.level': 'Level {n}',
  'account.title': 'Account', 'account.signedInAs': 'Signed in as', 'account.signOut': 'Sign out',
  'account.signInGoogle': 'Continue with Google',
  'account.signInPrompt': 'Sign in to save your stats and appear on the leaderboard.',
  'account.savedCards': 'Saved cards', 'account.language': 'Language',
  'account.quizzes': 'Quizzes', 'account.accuracy': 'Accuracy', 'account.streak': 'Streak', 'account.best': 'Best streak',
  'cards.title': 'Saved cards', 'cards.signIn': 'Sign in to see your saved cards.',
  'cards.empty': 'No saved cards yet. Bookmark questions to review them here.', 'cards.remove': 'Remove',
};

const cs: Record<keyof typeof en, string> = {
  'tab.learn': 'Učení', 'tab.streak': 'Série', 'tab.quiz': 'Kvíz', 'tab.ranks': 'Žebříček', 'tab.account': 'Účet',
  'common.retry': 'Zkusit znovu', 'common.back': 'Zpět',
  'learn.title': 'Učení', 'learn.levels': '{done}/{total} úrovní',
  'streak.title': 'Série', 'streak.days': 'denní série',
  'streak.todayDone': 'Super — dnes jsi cvičil! 🌱',
  'streak.todayTodo': 'Dokonči dnes lekci a udrž si sérii.',
  'streak.garden': 'Tvoje zahrádka', 'streak.gardenSub': 'Každá dlaždice je den — čím víc se učíš, tím zelenější.',
  'streak.longest': 'Nejdelší série', 'streak.activeDays': 'Aktivních dní',
  'streak.widgetAdd': 'Přidej si widget DevQuiz na plochu a sleduj, jak zahrádka roste.',
  'streak.widgetGo': 'Widget na plochu je dostupný v nainstalované aplikaci (ne v Expo Go).',
  'lesson.correct': 'Správně', 'lesson.incorrect': 'Skoro',
  'lesson.levelComplete': 'Úroveň splněna!', 'lesson.checkpointComplete': 'Kontrolní test splněn!',
  'lesson.outOfHearts': 'Došly životy!', 'lesson.notPassed': 'Zatím nesplněno',
  'lesson.scoreLine': '{correct} z {total} správně', 'lesson.passNeeded': 'K splnění potřebuješ {pct} %.',
  'lesson.outOfHeartsBody': 'Vyčerpal jsi všechny {max} životy. Zkus úroveň znovu.',
  'lesson.nextLevel': 'Další úroveň', 'lesson.checkpointExam': 'Kontrolní test',
  'lesson.tryAgain': 'Zkusit znovu', 'lesson.backToPath': 'Zpět na cestu',
  'lesson.continue': 'Pokračovat', 'lesson.finish': 'Dokončit', 'lesson.seeResult': 'Zobrazit výsledek',
  'lesson.checkpoint': 'Kontrolní test', 'lesson.level': 'Úroveň {n}',
  'account.title': 'Účet', 'account.signedInAs': 'Přihlášen jako', 'account.signOut': 'Odhlásit se',
  'account.signInGoogle': 'Pokračovat přes Google',
  'account.signInPrompt': 'Přihlas se, ať se ukládají statistiky a objevíš se v žebříčku.',
  'account.savedCards': 'Uložené kartičky', 'account.language': 'Jazyk',
  'account.quizzes': 'Kvízů', 'account.accuracy': 'Úspěšnost', 'account.streak': 'Série', 'account.best': 'Nejdelší série',
  'cards.title': 'Uložené kartičky', 'cards.signIn': 'Přihlas se, ať vidíš uložené kartičky.',
  'cards.empty': 'Zatím žádné kartičky. Ulož si otázky a vrať se k nim tady.', 'cards.remove': 'Odebrat',
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
