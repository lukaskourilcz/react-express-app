import type { VercelRequest, VercelResponse } from '@vercel/node';
import { questions, shuffleArray, encodeSession, type DifficultyMode, type CategoryType } from './data.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Get count from query parameter, default to 10, max 50
  const countParam = parseInt(req.query.count as string) || 10;
  const count = Math.min(Math.max(countParam, 1), 50);

  // Get difficulty mode from query parameter
  const difficultyMode = (req.query.difficulty as DifficultyMode) || 'zero-to-hero';

  // Get categories from query parameter
  const categoriesParam = req.query.categories as string || '';
  const selectedCategories: CategoryType[] = categoriesParam
    ? (categoriesParam.split(',') as CategoryType[])
    : ['javascript', 'typescript', 'react', 'git', 'nodejs', 'frontend'];

  // First filter by selected categories
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
  } else if (difficultyMode === 'terminology') {
    // Terminology mode: only questions with "Terminology" tag
    const terminologyQuestions = categoryFiltered.filter(q => q.tags.includes('Terminology'));
    const shuffled = shuffleArray(terminologyQuestions);
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

    // Take exactly the count needed, maintaining order (easy to hard)
    selected = selectedByDifficulty.slice(0, count);
  }

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

  // Encode session data into a signed token
  const sessionId = encodeSession(sessionData);

  res.json({
    sessionId,
    questions: questionsWithShuffledOptions,
  });
}
