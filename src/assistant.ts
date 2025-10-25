import mustache from 'mustache';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ConversationMessage, embedText, generateAnswer } from './gemini';
import { qdrant } from './qdrant';
import {
  ASSISTANT_NAME,
  COLLECTION_NAME,
  EMBEDDINGS_DIMENSION,
  PROMPT_TEMPLATE,
} from './env';

export async function getResponse(
  chunkedContext: string[],
  history: ConversationMessage[],
  question: string,
): Promise<[ConversationMessage, ConversationMessage]> {
  const { exists: collectionExists } = await qdrant.collectionExists(
    COLLECTION_NAME,
  );
  if (!collectionExists) {
    await qdrant.createCollection(COLLECTION_NAME, {
      vectors: {
        size: EMBEDDINGS_DIMENSION,
        distance: 'Cosine',
      },
    });
  }

  const queryEmbeddings = await embedText(question, 'RETRIEVAL_QUERY');
  await qdrant.upsert(COLLECTION_NAME, {
    points: chunkedContext.map((text) => ({
      id: randomUUID(),
      vector: queryEmbeddings,
      payload: { text },
    })),
  });
  const search = await qdrant.search(COLLECTION_NAME, {
    vector: queryEmbeddings,
    limit: 5,
  });
  const TEMPLATE_PATH = path.resolve(
    __dirname,
    `../templates/${PROMPT_TEMPLATE}`,
  );
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Prompt template not found: ${TEMPLATE_PATH}`);
  }
  const text = mustache.render(fs.readFileSync(TEMPLATE_PATH).toString(), {
    assistant_name: ASSISTANT_NAME,
    context: search
      .map((item) => (item.payload as unknown as { text: string }).text)
      .join('\n'),
    history: history
      .map(
        (message) =>
          `- **${message.role === 'user' ? 'User' : ASSISTANT_NAME}:** ${
            message.text
          }`,
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
