import { Router } from 'express';
import { questions, type DifficultyMode, type CategoryType } from '../data/questions.js';

export const quizRouter = Router();

// Store active quiz sessions (in production, use Redis or similar)
const quizSessions = new Map<string, { questionId: string; correctAnswer: number }[]>();

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get all questions (shuffled questions and shuffled answers)
quizRouter.get('/questions', (req, res) => {
  // Get count from query parameter, default to 10, max 50
  const countParam = parseInt(req.query.count as string) || 10;
  const count = Math.min(Math.max(countParam, 1), 50);

  // Get difficulty mode from query parameter
  const difficultyMode = (req.query.difficulty as DifficultyMode) || 'zero-to-hero';

  // Get categories from query parameter
  const categoriesParam = req.query.categories as string || '';
  const selectedCategories: CategoryType[] = categoriesParam
    ? (categoriesParam.split(',') as CategoryType[])
    : ['html', 'css', 'javascript', 'typescript', 'react', 'git', 'nodejs', 'dev-world'];

  // Filter questions by selected categories
  const categoryFiltered = questions.filter(q => selectedCategories.includes(q.category));

  // Filter and select questions based on difficulty mode
  let selected: typeof questions;

  if (difficultyMode === 'easy') {
    // Easy mode: only difficulty 1-2
    const easyQuestions = categoryFiltered.filter(q => q.difficulty <= 2);
    const shuffled = shuffleArray(easyQuestions);
    selected = shuffled.slice(0, count);
  } else if (difficultyMode === 'advanced') {
    // Advanced mode: only difficulty 3-5
    const advancedQuestions = categoryFiltered.filter(q => q.difficulty >= 3);
    const shuffled = shuffleArray(advancedQuestions);
    selected = shuffled.slice(0, count);
  } else if (difficultyMode === 'basics') {
    // Basics mode: only questions with "Terminology" tag
    const basicsQuestions = categoryFiltered.filter(q => q.tags.includes('Terminology'));
    const shuffled = shuffleArray(basicsQuestions);
    selected = shuffled.slice(0, count);
  } else {
    // Zero to hero mode: progressive difficulty 1 → 5
    // Distribute questions evenly across difficulty levels
    const questionsPerDifficulty = Math.ceil(count / 5);
    const selectedByDifficulty: typeof questions = [];

    for (let diff = 1; diff <= 5; diff++) {
      const questionsAtDifficulty = categoryFiltered.filter(q => q.difficulty === diff);
      const shuffled = shuffleArray(questionsAtDifficulty);
      selectedByDifficulty.push(...shuffled.slice(0, questionsPerDifficulty));
    }

    // If we don't have enough questions from progressive selection,
    // fill remaining slots from shuffled pool of all filtered questions
    if (selectedByDifficulty.length < count) {
      const selectedIds = new Set(selectedByDifficulty.map(q => q.id));
      const remaining = categoryFiltered.filter(q => !selectedIds.has(q.id));
      const shuffledRemaining = shuffleArray(remaining);
      selectedByDifficulty.push(...shuffledRemaining.slice(0, count - selectedByDifficulty.length));
    }

    // Take exactly the count needed
    selected = selectedByDifficulty.slice(0, count);
  }

  // Generate a session ID
  const sessionId = Math.random().toString(36).substring(2, 15);

  // Shuffle options for each question and track correct answers
  const sessionData: { questionId: string; correctAnswer: number }[] = [];

  const questionsWithShuffledOptions = selected.map((question) => {
    // Get the correct answer text before shuffling
    const correctAnswerText = question.options[question.correctAnswer];

    // Shuffle the options
    const shuffledOptions = shuffleArray(question.options);

    // Find the new index of the correct answer
    const newCorrectIndex = shuffledOptions.indexOf(correctAnswerText);

    // Store the correct answer for this session
    sessionData.push({
      questionId: question.id,
      correctAnswer: newCorrectIndex,
    });

    // Return question without the correct answer
    return {
      id: question.id,
      tags: question.tags,
      introduction: question.introduction,
      question: question.question,
      options: shuffledOptions,
      category: question.category,
      difficulty: question.difficulty,
    };
  });

  // Store session data
  quizSessions.set(sessionId, sessionData);

  // Clean up old sessions after 1 hour
  setTimeout(() => {
    quizSessions.delete(sessionId);
  }, 60 * 60 * 1000);

  res.json({
    sessionId,
    questions: questionsWithShuffledOptions,
  });
});

// Submit answers and get results
quizRouter.post('/submit', (req, res) => {
  const { sessionId, answers } = req.body as {
    sessionId: string;
    answers: Record<string, number>;
  };

  const sessionData = quizSessions.get(sessionId);

  if (!sessionData) {
    return res.status(400).json({ error: 'Invalid or expired session' });
  }

  let correct = 0;
  const results = Object.entries(answers).map(([questionId, selectedIndex]) => {
    const questionData = sessionData.find((q) => q.questionId === questionId);
    const question = questions.find((q) => q.id === questionId);
    const isCorrect = questionData?.correctAnswer === selectedIndex;
    if (isCorrect) correct++;

    return {
      questionId,
      selectedIndex,
      correctAnswer: questionData?.correctAnswer,
      isCorrect,
      explanation: question?.explanation || '',
    };
  });

  // Clean up session after submission
  quizSessions.delete(sessionId);

  res.json({
    totalQuestions: Object.keys(answers).length,
    correctAnswers: correct,
    percentage: Math.round((correct / Object.keys(answers).length) * 100),
    results,
  });
});
