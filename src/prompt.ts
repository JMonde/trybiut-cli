import readline from 'node:readline';

export function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

// Minimal hidden prompt (masks with *). Falls back to plain if not a TTY.
export function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    stdout.write(question);
    if (!stdin.isTTY) {
      // fallback
      const rl = readline.createInterface({ input: stdin, output: stdout });
      let data = '';
      stdin.on('data', (c) => (data += c));
      stdin.once('end', () => { rl.close(); resolve(data.trim().replace(/\r?\n$/, '')); });
      return;
    }
    stdin.setRawMode(true);
    stdin.resume();
    let value = '';
    const onData = (chunk: Buffer) => {
      const ch = chunk.toString('utf8');
      if (ch === '\n' || ch === '\r' || ch === '\u0004') {
        stdout.write('\n');
        cleanup();
        resolve(value);
      } else if (ch === '\u0003') {
        stdout.write('\n');
        cleanup();
        process.exit(1);
      } else if (ch === '\u007f' || ch === '\b') {
        if (value.length > 0) { value = value.slice(0, -1); stdout.write('\b \b'); }
      } else {
        value += ch;
        stdout.write('*');
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      try { stdin.setRawMode(false); } catch {}
      stdin.pause();
    };
    stdin.on('data', onData);
  });
}
