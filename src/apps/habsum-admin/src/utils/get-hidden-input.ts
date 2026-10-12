import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';

class HiddenOutput extends Writable {
  private hidden = false;

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
  }

  override _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (!this.hidden) stdout.write(chunk);
    callback();
  }
}

export default async function getHiddenInput(question: string): Promise<string> {
  if (!stdin.isTTY || !stdout.isTTY) {
    const readline = createInterface({ input: stdin, output: stdout });
    try {
      return await readline.question(question);
    } finally {
      readline.close();
    }
  }

  const hiddenOutput = new HiddenOutput();
  const readline = createInterface({ input: stdin, output: hiddenOutput, terminal: true });
  stdout.write(question);
  hiddenOutput.setHidden(true);

  try {
    return await readline.question('');
  } finally {
    hiddenOutput.setHidden(false);
    stdout.write('\n');
    readline.close();
  }
}
