import mustache from 'mustache';
import fs from 'node:fs';
import path from 'node:path';
import { v5 as uuidv5 } from 'uuid';
import {
  ASSISTANT_NAME,
  COLLECTION_NAME,
  EMBEDDINGS_DIMENSION,
  PROMPT_TEMPLATE,
} from './env';
import { ConversationMessage, embedText, generateAnswer } from './gemini';
import { qdrant } from './qdrant';

export async function getResponse(
  chunkedContext: string[],
  history: ConversationMessage[],
  question: string,
): Promise<[ConversationMessage, ConversationMessage]> {
  const { exists: collectionExists } = await qdrant.collectionExists(
    COLLECTION_NAME,
  );
  if (!collectionExists) {
    try {
      await qdrant.createCollection(COLLECTION_NAME, {
        vectors: {
          size: EMBEDDINGS_DIMENSION,
          distance: 'Cosine',
        },
      });
    } catch (error) {
      console.error('Error creating Qdrant collection:', error);
      process.exit(1);
    }
  }

  const chunkedEmbeddings = await Promise.all(
    chunkedContext.map((text) => embedText(text, 'RETRIEVAL_DOCUMENT')),
  );

  try {
    const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    await qdrant.upsert(COLLECTION_NAME, {
      points: chunkedContext.map((text, index) => ({
        id: uuidv5(text, UUID_NAMESPACE),
        vector: chunkedEmbeddings[index],
        payload: { text },
      })),
    });
  } catch (error) {
    console.error('Error upserting points to Qdrant:', error);
    process.exit(1);
  }

  const queryEmbeddings = await embedText(question, 'RETRIEVAL_QUERY');

  let search: Awaited<ReturnType<typeof qdrant.search>> | null = null;
  try {
    search = await qdrant.search(COLLECTION_NAME, {
      vector: queryEmbeddings,
      limit: 5,
    });
  } catch (error) {
    console.error('Error searching Qdrant collection:', error);
    process.exit(1);
  }

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
      .map(({ payload }) => {
        if (!payload || typeof payload.text !== 'string') {
          throw new Error('Invalid payload text in Qdrant search result');
        }
        return payload.text;
      })
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
      text: response ?? '',
    },
  ];
}
