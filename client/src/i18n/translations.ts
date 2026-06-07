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
  'auth.logIn': 'Log in',
  'auth.logOut': 'Log out',
  'auth.profile': 'Profile',
  'auth.account': 'Account',
  'auth.loadingAccount': 'Loading account',
  'auth.accountMenu': 'Account menu for {name}',

  // Quiz — setup screen
  'quiz.title': 'Web Development Quiz',
  'quiz.subtitle': '900+ questions · keyboard shortcuts supported',
  'quiz.todaysChallenge': 'Today’s challenge',
  'quiz.dailyMeta': '5 questions · same for everyone',
  'quiz.categories': 'Categories',
  'quiz.categoriesAria': 'Quiz categories',
  'quiz.selectAll': 'Select all',
  'quiz.deselectAll': 'Deselect all',
  'quiz.selectAtLeastOne': 'Select at least one category',
  'quiz.selectedCount': 'Selected ({count}/{total}):',
  'quiz.questionsLegend': 'Questions',
  'quiz.countQuestionsAria': '{count} questions',
  'quiz.difficulty': 'Difficulty',
  'quiz.difficultyAria': 'Difficulty: {label}',
  'quiz.startQuiz': 'Start quiz',
  'quiz.dailyChallenge': 'Daily challenge',
  'quiz.selectCategoryError': 'Select at least one category to start.',
  'quiz.practiceLabel': 'Practice mode',
  'quiz.practiceDesc': 'Skip stats updates this session',
  'quiz.soundLabel': 'Sound effects',
  'quiz.soundDesc': 'Subtle ticks on answer / submit',

  // Difficulty modes
  'difficulty.basics': 'Basics',
  'difficulty.easy': 'Easy',
  'difficulty.zero-to-hero': 'Zero to Hero',
  'difficulty.advanced': 'Advanced',
  'difficulty.mixed': 'Mixed',
  'difficulty.basics.tip': 'Definitions and basic terms.',
  'difficulty.easy.tip': 'Difficulty 1–2. Beginner-friendly.',
  'difficulty.zero-to-hero.tip': 'Progressive difficulty 1 → 5.',
  'difficulty.advanced.tip': 'Difficulty 3–5. Experienced devs.',
  'difficulty.mixed.tip': 'Random mix across difficulties.',

  // Quiz — in progress
  'quiz.questionOf': 'Question {current} of {total}',
  'quiz.progressAria': 'Quiz progress',
  'quiz.hint': 'Hint',
  'quiz.showHint': 'Show hint',
  'quiz.keyboardTip': 'Tip: press 1–{max} to pick, ←/→ to navigate, Enter to advance.',
  'quiz.previous': 'Previous',
  'quiz.next': 'Next',
  'quiz.exitQuiz': 'Exit quiz',
  'quiz.answerMore': 'Answer {count} more to submit',
  'quiz.submitQuiz': 'Submit quiz',
  'quiz.submitting': 'Submitting…',
  'quiz.report': 'Report a problem',
  'quiz.reportAria': 'Report this question',
  'quiz.addBookmark': 'Bookmark this question',
  'quiz.removeBookmark': 'Remove bookmark',
  'quiz.bookmarkAfterTip': 'You can bookmark this question once you see the answer',
  'quiz.bookmarkedReviewTip': 'Bookmarked — review after submitting',
  'quiz.bookmarkAfterAria': 'Bookmarking is available after submitting',
  'quiz.bookmarkedReviewAria': 'Bookmarked (review after submitting)',

  // Quiz — results
  'quiz.complete': 'Quiz complete!',
  'quiz.scoreOutOf': '{correct} out of {total} correct',
  'quiz.dailyComplete': 'Today’s challenge complete — see you tomorrow.',
  'quiz.newQuiz': 'New quiz',
  'quiz.shareResult': 'Share result',
  'quiz.reviewAnswersArrow': 'Review answers ↓',
  'quiz.reviewYourAnswers': 'Review your answers ({count})',
  'quiz.questionN': 'Question {n}',
  'quiz.correct': 'Correct',
  'quiz.incorrect': 'Incorrect',
  'quiz.yourAnswerLabel': 'Your answer:',
  'quiz.correctLabel': 'Correct:',
  'quiz.results': 'Results',
  'quiz.tryAgain': 'Try again',

  // Loading / error states
  'quiz.retry': 'Retry',
  'quiz.backToSettings': 'Back to settings',
  'error.somethingWrong': 'Something went wrong',

  // Practice / stats toasts
  'quiz.practiceMode': 'Practice mode — stats not updated',
  'quiz.reportSent': 'Thanks — report sent',
  'quiz.reportFailed': 'Could not send report',
  'quiz.streakWarning': 'We saved your score but could not update your streak.',
  'quiz.shareCopied': 'Result copied to clipboard',
  'quiz.shareFailed': 'Could not share',

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
  'auth.logIn': 'Přihlásit se',
  'auth.logOut': 'Odhlásit se',
  'auth.profile': 'Profil',
  'auth.account': 'Účet',
  'auth.loadingAccount': 'Načítání účtu',
  'auth.accountMenu': 'Menu účtu pro {name}',

  // Quiz — setup screen
  'quiz.title': 'Kvíz webového vývoje',
  'quiz.subtitle': '900+ otázek · podporovány klávesové zkratky',
  'quiz.todaysChallenge': 'Dnešní výzva',
  'quiz.dailyMeta': '5 otázek · stejné pro všechny',
  'quiz.categories': 'Kategorie',
  'quiz.categoriesAria': 'Kategorie kvízu',
  'quiz.selectAll': 'Vybrat vše',
  'quiz.deselectAll': 'Zrušit výběr',
  'quiz.selectAtLeastOne': 'Vyber alespoň jednu kategorii',
  'quiz.selectedCount': 'Vybráno ({count}/{total}):',
  'quiz.questionsLegend': 'Otázky',
  'quiz.countQuestionsAria': '{count} otázek',
  'quiz.difficulty': 'Obtížnost',
  'quiz.difficultyAria': 'Obtížnost: {label}',
  'quiz.startQuiz': 'Spustit kvíz',
  'quiz.dailyChallenge': 'Denní výzva',
  'quiz.selectCategoryError': 'Pro start vyber alespoň jednu kategorii.',
  'quiz.practiceLabel': 'Cvičný režim',
  'quiz.practiceDesc': 'Tuto relaci neaktualizovat statistiky',
  'quiz.soundLabel': 'Zvukové efekty',
  'quiz.soundDesc': 'Jemné cinknutí při odpovědi / odeslání',

  // Difficulty modes
  'difficulty.basics': 'Základy',
  'difficulty.easy': 'Lehká',
  'difficulty.zero-to-hero': 'Od nuly k mistrovi',
  'difficulty.advanced': 'Pokročilá',
  'difficulty.mixed': 'Smíšená',
  'difficulty.basics.tip': 'Definice a základní pojmy.',
  'difficulty.easy.tip': 'Obtížnost 1–2. Vhodné pro začátečníky.',
  'difficulty.zero-to-hero.tip': 'Postupná obtížnost 1 → 5.',
  'difficulty.advanced.tip': 'Obtížnost 3–5. Pro zkušené vývojáře.',
  'difficulty.mixed.tip': 'Náhodný mix napříč obtížnostmi.',

  // Quiz — in progress
  'quiz.questionOf': 'Otázka {current} z {total}',
  'quiz.progressAria': 'Průběh kvízu',
  'quiz.hint': 'Nápověda',
  'quiz.showHint': 'Zobrazit nápovědu',
  'quiz.keyboardTip': 'Tip: stiskni 1–{max} pro výběr, ←/→ pro navigaci, Enter pro pokračování.',
  'quiz.previous': 'Předchozí',
  'quiz.next': 'Další',
  'quiz.exitQuiz': 'Ukončit kvíz',
  'quiz.answerMore': 'Odpověz na další {count} pro odeslání',
  'quiz.submitQuiz': 'Odeslat kvíz',
  'quiz.submitting': 'Odesílání…',
  'quiz.report': 'Nahlásit problém',
  'quiz.reportAria': 'Nahlásit tuto otázku',
  'quiz.addBookmark': 'Přidat do záložek',
  'quiz.removeBookmark': 'Odebrat ze záložek',
  'quiz.bookmarkAfterTip': 'Tuto otázku můžeš uložit do záložek, až uvidíš odpověď',
  'quiz.bookmarkedReviewTip': 'V záložkách — projdeš po odeslání',
  'quiz.bookmarkAfterAria': 'Záložky jsou dostupné po odeslání',
  'quiz.bookmarkedReviewAria': 'V záložkách (projdeš po odeslání)',

  // Quiz — results
  'quiz.complete': 'Kvíz dokončen!',
  'quiz.scoreOutOf': '{correct} z {total} správně',
  'quiz.dailyComplete': 'Dnešní výzva splněna — uvidíme se zítra.',
  'quiz.newQuiz': 'Nový kvíz',
  'quiz.shareResult': 'Sdílet výsledek',
  'quiz.reviewAnswersArrow': 'Projít odpovědi ↓',
  'quiz.reviewYourAnswers': 'Projdi své odpovědi ({count})',
  'quiz.questionN': 'Otázka {n}',
  'quiz.correct': 'Správně',
  'quiz.incorrect': 'Špatně',
  'quiz.yourAnswerLabel': 'Tvoje odpověď:',
  'quiz.correctLabel': 'Správně:',
  'quiz.results': 'Výsledky',
  'quiz.tryAgain': 'Zkusit znovu',

  // Loading / error states
  'quiz.retry': 'Zkusit znovu',
  'quiz.backToSettings': 'Zpět na nastavení',
  'error.somethingWrong': 'Něco se pokazilo',

  // Practice / stats toasts
  'quiz.practiceMode': 'Cvičný režim — statistiky se neaktualizují',
  'quiz.reportSent': 'Díky — hlášení odesláno',
  'quiz.reportFailed': 'Hlášení se nepodařilo odeslat',
  'quiz.streakWarning': 'Skóre jsme uložili, ale nepodařilo se aktualizovat sérii.',
  'quiz.shareCopied': 'Výsledek zkopírován do schránky',
  'quiz.shareFailed': 'Nepodařilo se sdílet',

  // Generic errors
  'error.generic': 'Něco se pokazilo. Zkus to prosím znovu.',
  'error.network': 'Chyba sítě. Zkontroluj připojení a zkus to znovu.',
};

export const dictionaries = { en, cs } as const;
