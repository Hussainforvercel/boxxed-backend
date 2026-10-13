import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

// Local runs read apps/api/.env; CI injects the variables directly (and they win).
// Assign into this test file's `process.env`: Jest sandboxes it, so `process.loadEnvFile`
// (which writes the real process env) would not be visible to the tests.
const file = resolve(__dirname, '../../.env');
if (existsSync(file)) {
  for (const [name, value] of Object.entries(parseEnv(readFileSync(file, 'utf8')))) {
    if (process.env[name] === undefined) process.env[name] = value;
  }
}
