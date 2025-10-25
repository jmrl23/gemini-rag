import { getResponse } from './assistant';
import { ConversationMessage } from './gemini';
import { chunkText, input, pdfToText } from './utils';

async function main() {
  const history: ConversationMessage[] = [];
  const fullContext = await pdfToText({
    url: process.env.PDF_RESOURCE_URL,
  });
  const chunkedContext = chunkText(fullContext);

  await ask(chunkedContext, 'Hello, who are you?', history, false);

  while (true) {
    const question = await input('Question: ');
    if (question === 'exit' || question === 'quit') break;
    if (!question) throw new Error('Question is required');
    await ask(chunkedContext, question, history);
  }
}

void main();

async function ask(
  chunkedContext: string[],
  question: string,
  history: ConversationMessage[],
  pushHistory = true,
) {
  const [userMessage, assistantResponse] = await getResponse(
    chunkedContext,
    history.slice(-5),
    question,
  );
  if (pushHistory) history.push(userMessage, assistantResponse);
  console.log('Answer:', assistantResponse.text);
}
