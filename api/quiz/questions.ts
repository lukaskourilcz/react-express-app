import type { VercelRequest, VercelResponse } from '@vercel/node';
import { questions, shuffleArray, encodeSession } from './data.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  // Shuffle and select 20 questions
  const shuffledQuestions = shuffleArray(questions);
  const selected = shuffledQuestions.slice(0, 20);

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

  // Encode session data into a signed token
  const sessionId = encodeSession(sessionData);

  res.json({
    sessionId,
    questions: questionsWithShuffledOptions,
  });
}
