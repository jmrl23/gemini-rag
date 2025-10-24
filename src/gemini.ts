import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

export const ai = new GoogleGenAI({
  apiKey: process.env.GENAI_API_KEY,
});

export async function generateAnswer(context: string, question: string) {
  const answer = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `
            Answer the question **only** using the information below.
            If the answer cannot be found, say "Not mentioned."

            Context:
            ${context}

            Question:
            ${question}

            Answer:
            `,
          },
        ],
      },
    ],
  });
  return answer.text;
}

export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT',
) {
  const response = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: text,
    config: {
      taskType,
      outputDimensionality: 768,
    },
  });
  return response.embeddings?.[0].values ?? [];
}
