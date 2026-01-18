import type { VercelRequest, VercelResponse } from '@vercel/node';
import { decodeSession, questions } from './data.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, answers } = req.body as {
    sessionId: string;
    answers: Record<string, number>;
  };

  const sessionData = decodeSession(sessionId);

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

  res.json({
    totalQuestions: Object.keys(answers).length,
    correctAnswers: correct,
    percentage: Math.round((correct / Object.keys(answers).length) * 100),
    results,
  });
}
