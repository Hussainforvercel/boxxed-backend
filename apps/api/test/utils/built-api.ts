import { execFileSync, spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import type { ChildProcess } from 'node:child_process';

const API_ROOT = resolve(__dirname, '../..');
const MAIN = join(API_ROOT, 'dist/main.js');

/** Builds apps/api (and @boxxed/shared) so tests can run the real `node dist/main.js`. */
export function buildApi(): void {
  execFileSync('pnpm', ['--filter', '@boxxed/api', 'build'], { cwd: API_ROOT, stdio: 'ignore' });
}

export async function freePort(): Promise<number> {
  return new Promise((done, fail) => {
    const server = createServer();
    server.once('error', fail);
    server.listen(0, () => {
      const address = server.address();
      server.close(() => done(typeof address === 'object' && address ? address.port : 0));
    });
  });
}

export interface RunningApi {
  child: ChildProcess;
  /** Everything the process wrote to stdout and stderr so far. */
  output: () => string;
  exited: Promise<number | null>;
}

/**
 * Starts the built API as a real process. It runs in an empty temp dir so no `.env` file is
 * picked up: the given env is exactly what it sees.
 */
export function startApi(env: Record<string, string | undefined>): RunningApi {
  const chunks: string[] = [];
  const child = spawn(process.execPath, [MAIN], {
    cwd: mkdtempSync(join(tmpdir(), 'boxxed-api-')),
    env: { PATH: process.env['PATH'], ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout?.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
  child.stderr?.on('data', (chunk: Buffer) => chunks.push(chunk.toString()));
  const exited = new Promise<number | null>((done) => child.once('exit', (code) => done(code)));
  return { child, output: () => chunks.join(''), exited };
}

/** The variables of apps/api/.env (loaded into process.env by load-env.ts) as a plain map. */
export function currentEnv(): Record<string, string | undefined> {
  return { ...process.env };
}

export async function waitUntilReady(baseUrl: string, api: RunningApi): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (api.child.exitCode !== null) throw new Error(`API exited early:\n${api.output()}`);
    const ready = await fetch(`${baseUrl}/health/ready`).then(
      (response) => response.ok,
      () => false,
    );
    if (ready) return;
    await new Promise((done) => setTimeout(done, 200));
  }
  throw new Error(`API not ready in time:\n${api.output()}`);
}
