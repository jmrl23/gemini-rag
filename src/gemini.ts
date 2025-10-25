import { GoogleGenAI, Part } from '@google/genai';
import {
  CONTENTS_MODEL,
  EMBEDDINGS_DIMENSION,
  EMBEDDINGS_MODEL,
  GENAI_API_KEY,
} from './env';

export const ai = new GoogleGenAI({
  apiKey: GENAI_API_KEY,
});

export type ConversationMessage = {
  role: 'user' | 'model';
  text: string;
};

export async function modelAnswer(parts: Part[]) {
  const response = await ai.models.generateContent({
    model: CONTENTS_MODEL,
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
    model: EMBEDDINGS_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: EMBEDDINGS_DIMENSION,
    },
  });
  return response.embeddings?.[0].values ?? [];
}
