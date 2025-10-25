import { GoogleGenAI } from '@google/genai';

export const ai = new GoogleGenAI({
  apiKey: process.env.GENAI_API_KEY,
});

export type ConversationMessage = {
  role: 'user' | 'model';
  text: string;
};

export async function generateAnswer(
  context: string,
  question: string,
  history: ConversationMessage[],
): Promise<[ConversationMessage, ConversationMessage]> {
  const FALLBACK_ANSWER = 'Not mentioned.';
  const ASSISTANT_NAME = process.env.ASSISTANT_NAME || 'AI Assistant';
  const response = await ai.models.generateContent({
    model: process.env.CONTENTS_MODEL || 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: `
              You are **${ASSISTANT_NAME}**, an AI assistant that answers questions **strictly using the provided context**, but you can also answer **basic general questions** as long as they are related to the context. You must follow these rules:

              1. **Only use the information in the context**, unless a basic related fact is commonly known and directly connected.
              2. **Do not assume or infer complex knowledge** beyond the context and related basics.
              3. If the answer cannot be found in the context or through a directly related basic fact, respond exactly:

                > “I don't have enough information to answer that.”
              4. Keep answers **concise, clear, and friendly**.
              5. Reference the context directly if helpful.

              **Format for each interaction:**

              \`\`\`
              Context:
              {insert context here}

              Previous Conversation History:
              {insert previous conversation here}

              User Question:
              {insert question here}

              Answer:
              \`\`\`

              **Context:**
              ${context}

              **Previous Conversation History:**
              ${history
                .map(
                  (message) =>
                    `- **${
                      message.role === 'user' ? 'User' : ASSISTANT_NAME
                    }:** ${message.text}`,
                )
                .join('\n')}

              **User Question:**
              ${question}

              **Answer:**
            `,
          },
        ],
      },
    ],
  });
  const answer = response.text ?? FALLBACK_ANSWER;

  return [
    { role: 'user', text: question },
    { role: 'model', text: answer },
  ];
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
