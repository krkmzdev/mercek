#!/usr/bin/env node
/**
 * Enforces the package boundary rule (spec §4): `@mercek/sdk` must have ZERO
 * dependency on `@mercek/core`. An external contributor should be able to
 * `npm i @mercek/sdk` and write an adapter without pulling the engine.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sdkDir = join(root, 'packages', 'sdk');
const violations = [];

// 1. package.json must not declare @mercek/core in any dependency field.
const pkg = JSON.parse(readFileSync(join(sdkDir, 'package.json'), 'utf8'));
for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
  if (pkg[field] && '@mercek/core' in pkg[field]) {
    violations.push(`package.json ${field} declares @mercek/core`);
  }
}

// 2. No source file may import from @mercek/core.
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx|mjs|js)$/.test(name)) {
      const src = readFileSync(full, 'utf8');
      if (/from\s+['"]@mercek\/core/.test(src) || /import\(['"]@mercek\/core/.test(src)) {
        violations.push(`${full.replace(root, '.')} imports @mercek/core`);
      }
    }
  }
}
walk(join(sdkDir, 'src'));

if (violations.length > 0) {
  console.error('SDK independence check FAILED (§4):');
  for (const v of violations) console.error(`  - ${v}`);
  process.exit(1);
}
console.log('SDK independence check passed: @mercek/sdk has zero dependency on @mercek/core.');
