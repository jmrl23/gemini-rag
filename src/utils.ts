import readline from 'node:readline/promises';
import { PDFParse } from 'pdf-parse';
import cl100k_base from 'tiktoken/encoders/cl100k_base.json';
import { Tiktoken } from 'tiktoken/lite';

export async function pdfToText(options: { text?: string; url?: string }) {
  const parser = new PDFParse(options);
  const data = await parser.getText();
  return data.text;
}

export function chunkText(text: string, chunkSize = 800, overlap = 100) {
  const tokenizer = new Tiktoken(
    cl100k_base.bpe_ranks,
    cl100k_base.special_tokens,
    cl100k_base.pat_str,
  );
  const tokens = tokenizer.encode(text);
  const decoder = new TextDecoder('utf-8');
  const chunks: string[] = [];

  for (let i = 0; i < tokens.length; i += chunkSize - overlap) {
    const chunkTokens = tokens.slice(i, i + chunkSize);
    const chunk = decoder.decode(tokenizer.decode(chunkTokens));
    chunks.push(chunk);
  }

  tokenizer.free();
  return chunks;
}

export async function input(question: string): Promise<string> {
  const readlineInterface = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answer = await readlineInterface.question(question);
  readlineInterface.close();
  return answer;
}
