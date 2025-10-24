import { GoogleGenAI } from '@google/genai';

export const ai = new GoogleGenAI({
  apiKey: process.env.GENAI_API_KEY,
});

export async function generateAnswer(context: string, question: string) {
  const FALLBACK_ANSWER = 'Not mentioned.';
  const answer = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `
            Answer the question **only** using the information below.
            If the answer cannot be found, say "${FALLBACK_ANSWER}".

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
  return answer.text ?? FALLBACK_ANSWER;
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
      outputDimensionality: parseInt(
        process.env.EMBEDDINGS_DIMENSION ?? '768',
        10,
      ),
    },
  });
  return response.embeddings?.[0].values ?? [];
}
