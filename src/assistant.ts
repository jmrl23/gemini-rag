import crypto from 'crypto';
import ms from 'ms';
import mustache from 'mustache';
import fs from 'node:fs';
import path from 'node:path';
import { v5 as uuidv5 } from 'uuid';
import { cache } from './cache';
import {
  ASSISTANT_NAME,
  COLLECTION_NAME,
  EMBEDDINGS_DIMENSION,
  PROMPT_TEMPLATE,
} from './env';
import { ConversationMessage, embedText, modelAnswer } from './gemini';
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
    chunkedContext.map(async (text) => {
      const chunkKey = `rag:embedding:RETRIEVAL_DOCUMENT:${crypto
        .createHash('sha256')
        .update(text)
        .digest('hex')}`;
      let embedding = await cache.get<number[]>(chunkKey);
      if (!embedding) {
        embedding = await embedText(text, 'RETRIEVAL_DOCUMENT');
        await cache.set(chunkKey, embedding, ms('30d'));
      }
      return embedding;
    }),
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

  const QUERY_EMBEDDING_CACHE_KEY = `embeddings:${question}`;
  let queryEmbeddings: number[] =
    (await cache.get(QUERY_EMBEDDING_CACHE_KEY)) ?? [];

  if (!queryEmbeddings || queryEmbeddings.length < 1) {
    queryEmbeddings = await embedText(question, 'RETRIEVAL_QUERY');
    await cache.set(QUERY_EMBEDDING_CACHE_KEY, queryEmbeddings, ms('1d'));
  }

  const SEARCH_CACHE_KEY = `search:${question}`;
  let search: Awaited<ReturnType<typeof qdrant.search>> | null =
    (await cache.get<any>(SEARCH_CACHE_KEY)) ?? null;

  try {
    if (!search || search.length < 1) {
      search = await qdrant.search(COLLECTION_NAME, {
        vector: queryEmbeddings,
        limit: 5,
      });
      await cache.set(SEARCH_CACHE_KEY, search, ms('10m'));
    }
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
  const response = await modelAnswer([{ text }]);
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
