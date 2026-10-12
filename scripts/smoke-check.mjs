// Minimal dependency-free syntax check of the preserved standalone prototype.
// This does not exercise interactive behavior. Use a browser for UX smoke testing.
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const html = readFileSync(new URL('../prototype-v2/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length, 1, 'Expected one inline JavaScript entrypoint');
assert.match(html, /TA\s*\/\s*Content Studio/i, 'Baseline UI title missing');
assert.match(html, /window\.__TA_STUDIO__/, 'Expected prototype API missing');
new Script(scripts[0][1], { filename: 'prototype-v2/index.html' });
console.log('PASS: Prototype 02 script parses; baseline UI and API markers exist.');
