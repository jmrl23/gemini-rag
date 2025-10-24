import { randomUUID } from 'node:crypto';
import { embedText, generateAnswer } from './gemini';
import { qdrant } from './qdrant';
import { chunkText, input, pdfToText } from './utils';

async function main() {
  while (true) {
    const question = await input('Question: ');
    if (question === 'exit' || question === 'quit') break;
    if (!question) throw new Error('Question is required');
    const answer = await ask(question);
    console.log('Answer:', answer);
  }
}

void main();

async function ask(question: string): Promise<string> {
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

  const docsTexts = await pdfToText({
    url: process.env.PDF_RESOURCE_URL,
  });
  const chunkedDocs = chunkText(docsTexts);
  const queryEmbeddings = await embedText(question, 'RETRIEVAL_QUERY');
  await qdrant.upsert(process.env.COLLECTION_NAME || 'docs', {
    points: chunkedDocs.map((text) => ({
      id: randomUUID(),
      vector: queryEmbeddings,
      payload: { text },
    })),
  });
  const search = await qdrant.search(process.env.COLLECTION_NAME || 'docs', {
    vector: queryEmbeddings,
    limit: 5,
  });
  const answer = await generateAnswer(
    search
      .map((item) => (item.payload as unknown as { text: string }).text)
      .join('\n'),
    question,
  );

  return answer;
}
