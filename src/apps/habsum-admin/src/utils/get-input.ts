import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

export default async function getInput(question: string): Promise<string> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return await readline.question(question);
  } finally {
    readline.close();
  }
}
