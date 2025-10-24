import dotenv from 'dotenv';
import { embedText, generateAnswer } from './gemini';
import { chunkText, getBestMatch, input, pdfToText } from './utils';

async function main() {
  const question = await input('Question: ');
  if (!question) throw new Error('Question is required');

  const docsTexts = await pdfToText({
    url: process.env.PDF_RESOURCE_URL,
  });
  const chunkedDocs = chunkText(docsTexts);
  const contextEmbeddings = await Promise.all(
    chunkedDocs.map((chunk) => embedText(chunk, 'RETRIEVAL_DOCUMENT')),
  );
  const queryEmbeddings = await embedText(question, 'RETRIEVAL_QUERY');
  const bestMatch = await getBestMatch(
    chunkedDocs,
    contextEmbeddings,
    queryEmbeddings,
  );
  const answer = await generateAnswer(bestMatch, question);

  console.log('Answer:', answer);
}

void main();
