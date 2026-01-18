import { Router } from 'express';
import { questions } from '../data/questions.js';

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
quizRouter.get('/questions', (_req, res) => {
  // Shuffle and select 20 questions
  const shuffledQuestions = shuffleArray(questions);
  const selected = shuffledQuestions.slice(0, 20);

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
      question: question.question,
      options: shuffledOptions,
      category: question.category,
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
    const isCorrect = questionData?.correctAnswer === selectedIndex;
    if (isCorrect) correct++;

    return {
      questionId,
      selectedIndex,
      correctAnswer: questionData?.correctAnswer,
      isCorrect,
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
