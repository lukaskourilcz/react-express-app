// UI string translations for the app shell and quiz flow.
//
// `en` is the source of truth; its keys define the TranslationKey type, so
// `cs` is required to provide every key (the compiler enforces parity).
// Interpolation: use {name} placeholders and pass vars to t(key, vars).

export const en = {
  // App shell / navigation
  'nav.quiz': 'Quiz',
  'nav.play': 'Play',
  'nav.leaderboard': 'Leaderboard',
  'nav.sandbox': 'Sandbox',
  'nav.profile': 'Profile',
  'nav.home': 'DevQuiz home',
  'common.skipToContent': 'Skip to content',
  'common.loading': 'Loading…',
  'common.darkMode': 'Switch to dark mode',
  'common.lightMode': 'Switch to light mode',
  'lang.label': 'Language',
  'lang.english': 'English',
  'lang.czech': 'Čeština',
  'lang.switchToCzech': 'Přepnout do češtiny',
  'lang.switchToEnglish': 'Switch to English',

  // Auth
  'auth.signIn': 'Sign in',
  'auth.signOut': 'Sign out',
  'auth.signingIn': 'Signing in…',

  // Quiz — setup screen
  'quiz.title': 'Web Development Quiz',
  'quiz.subtitle': '900+ questions · keyboard shortcuts supported',
  'quiz.categories': 'Categories',
  'quiz.selectAll': 'Select all',
  'quiz.clearAll': 'Clear all',
  'quiz.difficulty': 'Difficulty',
  'quiz.questionCount': 'Number of questions',
  'quiz.startQuiz': 'Start quiz',
  'quiz.dailyChallenge': 'Daily challenge',
  'quiz.selectCategoryError': 'Select at least one category to start.',

  // Difficulty modes
  'difficulty.basics': 'Basics',
  'difficulty.easy': 'Easy',
  'difficulty.zero-to-hero': 'Zero to hero',
  'difficulty.advanced': 'Advanced',
  'difficulty.mixed': 'Mixed',

  // Quiz — in progress
  'quiz.questionOf': 'Question {current} of {total}',
  'quiz.hint': 'Hint',
  'quiz.previous': 'Previous',
  'quiz.next': 'Next',
  'quiz.submitQuiz': 'Submit quiz',
  'quiz.submitting': 'Submitting…',
  'quiz.report': 'Report a problem',

  // Quiz — results
  'quiz.results': 'Results',
  'quiz.score': 'You scored {correct} / {total} ({percentage}%)',
  'quiz.yourAnswer': 'Your answer',
  'quiz.correctAnswer': 'Correct',
  'quiz.tryAgain': 'Try again',
  'quiz.backToStart': 'Back to start',
  'quiz.reviewAnswers': 'Review answers',

  // Practice / stats toasts
  'quiz.practiceMode': 'Practice mode — stats not updated',
  'quiz.reportSent': 'Thanks — report sent',
  'quiz.reportFailed': 'Could not send report',

  // Generic errors
  'error.generic': 'Something went wrong. Please try again.',
  'error.network': 'Network error. Check your connection and try again.',
} as const;

export type TranslationKey = keyof typeof en;

export const cs: Record<TranslationKey, string> = {
  // App shell / navigation
  'nav.quiz': 'Kvíz',
  'nav.play': 'Hrát',
  'nav.leaderboard': 'Žebříček',
  'nav.sandbox': 'Hřiště',
  'nav.profile': 'Profil',
  'nav.home': 'Domů DevQuiz',
  'common.skipToContent': 'Přeskočit na obsah',
  'common.loading': 'Načítání…',
  'common.darkMode': 'Přepnout na tmavý režim',
  'common.lightMode': 'Přepnout na světlý režim',
  'lang.label': 'Jazyk',
  'lang.english': 'English',
  'lang.czech': 'Čeština',
  'lang.switchToCzech': 'Přepnout do češtiny',
  'lang.switchToEnglish': 'Switch to English',

  // Auth
  'auth.signIn': 'Přihlásit se',
  'auth.signOut': 'Odhlásit se',
  'auth.signingIn': 'Přihlašování…',

  // Quiz — setup screen
  'quiz.title': 'Kvíz webového vývoje',
  'quiz.subtitle': '900+ otázek · podporovány klávesové zkratky',
  'quiz.categories': 'Kategorie',
  'quiz.selectAll': 'Vybrat vše',
  'quiz.clearAll': 'Zrušit výběr',
  'quiz.difficulty': 'Obtížnost',
  'quiz.questionCount': 'Počet otázek',
  'quiz.startQuiz': 'Spustit kvíz',
  'quiz.dailyChallenge': 'Denní výzva',
  'quiz.selectCategoryError': 'Pro start vyber alespoň jednu kategorii.',

  // Difficulty modes
  'difficulty.basics': 'Základy',
  'difficulty.easy': 'Lehká',
  'difficulty.zero-to-hero': 'Od nuly k mistrovi',
  'difficulty.advanced': 'Pokročilá',
  'difficulty.mixed': 'Smíšená',

  // Quiz — in progress
  'quiz.questionOf': 'Otázka {current} z {total}',
  'quiz.hint': 'Nápověda',
  'quiz.previous': 'Předchozí',
  'quiz.next': 'Další',
  'quiz.submitQuiz': 'Odeslat kvíz',
  'quiz.submitting': 'Odesílání…',
  'quiz.report': 'Nahlásit problém',

  // Quiz — results
  'quiz.results': 'Výsledky',
  'quiz.score': 'Získal jsi {correct} / {total} ({percentage} %)',
  'quiz.yourAnswer': 'Tvoje odpověď',
  'quiz.correctAnswer': 'Správně',
  'quiz.tryAgain': 'Zkusit znovu',
  'quiz.backToStart': 'Zpět na začátek',
  'quiz.reviewAnswers': 'Projít odpovědi',

  // Practice / stats toasts
  'quiz.practiceMode': 'Cvičný režim — statistiky se neaktualizují',
  'quiz.reportSent': 'Díky — hlášení odesláno',
  'quiz.reportFailed': 'Hlášení se nepodařilo odeslat',

  // Generic errors
  'error.generic': 'Něco se pokazilo. Zkus to prosím znovu.',
  'error.network': 'Chyba sítě. Zkontroluj připojení a zkus to znovu.',
};

export const dictionaries = { en, cs } as const;
