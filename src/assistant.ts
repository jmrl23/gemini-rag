import mustache from 'mustache';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ConversationMessage, embedText, generateAnswer } from './gemini';
import { qdrant } from './qdrant';

export async function getResponse(
  chunkedContext: string[],
  history: ConversationMessage[],
  question: string,
): Promise<[ConversationMessage, ConversationMessage]> {
  const { exists: collectionExists } = await qdrant.collectionExists(
    process.env.COLLECTION_NAME || 'docs',
  );
  if (!collectionExists) {
    await qdrant.createCollection(process.env.COLLECTION_NAME || 'docs', {
      vectors: {
        size: parseInt(process.env.EMBEDDINGS_DIMENSION || '768', 10),
        distance: 'Cosine',
      },
    });
  }

  const queryEmbeddings = await embedText(question, 'RETRIEVAL_QUERY');
  await qdrant.upsert(process.env.COLLECTION_NAME || 'docs', {
    points: chunkedContext.map((text) => ({
      id: randomUUID(),
      vector: queryEmbeddings,
      payload: { text },
    })),
  });
  const search = await qdrant.search(process.env.COLLECTION_NAME || 'docs', {
    vector: queryEmbeddings,
    limit: 5,
  });
  const TEMPLATE_PATH = path.resolve(
    __dirname,
    `../templates/${process.env.PROMPT_TEMPLATE}`,
  );
  const text = mustache.render(fs.readFileSync(TEMPLATE_PATH).toString(), {
    assistant_name: process.env.ASSISTANT_NAME || 'AI Assistant',
    context: search
      .map((item) => (item.payload as unknown as { text: string }).text)
      .join('\n'),
    history: history
      .map(
        (message) =>
          `- **${
            message.role === 'user' ? 'User' : process.env.ASSISTANT_NAME
          }:** ${message.text}`,
      )
      .join('\n'),
    question,
  });
  const response = await generateAnswer([{ text }]);
  return [
    {
      role: 'user',
      text: question,
    },
    {
      role: 'model',
      text: response!,
    },
  ];
}
