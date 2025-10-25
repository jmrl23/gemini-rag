import { getResponse } from './assistant';
import { PDF_RESOURCE_URL } from './env';
import { ConversationMessage } from './gemini';
import { chunkText, input, pdfToText } from './utils';

async function main() {
  const history: ConversationMessage[] = [];
  const fullContext = await pdfToText({
    url: PDF_RESOURCE_URL,
  });
  const chunkedContext = chunkText(fullContext);

  console.log('Answer:', await ask(chunkedContext, 'Introduce yourself'));

  while (true) {
    const question = await input('Question: ');
    if (question === 'exit' || question === 'quit') break;
    if (!question) throw new Error('Question is required');
    const answer = await ask(chunkedContext, question, history);
    console.log('Answer:', answer);
  }
}

void main();

async function ask(
  chunkedContext: string[],
  question: string,
  history?: ConversationMessage[],
) {
  const [userMessage, assistantResponse] = await getResponse(
    chunkedContext,
    history ? history.slice(-5) : [],
    question,
  );
  history?.push(userMessage, assistantResponse);
  return assistantResponse.text;
}
