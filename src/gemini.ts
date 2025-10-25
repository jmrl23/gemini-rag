import { GoogleGenAI, Part } from '@google/genai';

export const ai = new GoogleGenAI({
  apiKey: process.env.GENAI_API_KEY,
});

export type ConversationMessage = {
  role: 'user' | 'model';
  text: string;
};

export async function generateAnswer(parts: Part[]) {
  const response = await ai.models.generateContent({
    model: process.env.CONTENTS_MODEL || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
  });
  const answer = response.text;
  return answer;
}

export async function embedText(
  text: string,
  taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT',
) {
  const response = await ai.models.embedContent({
    model: process.env.EMBEDDINGS_MODEL || 'gemini-embedding-001',
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
