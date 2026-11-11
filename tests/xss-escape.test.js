// Regresión de seguridad: los datos tecleados, pegados o importados se escapan antes de insertarse como HTML.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('el fragmento de evidencia y la regla del analizador se escapan', () => {
  const src = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  assert.match(src, /escapeHtml\(x\.fragment\)/);
  assert.match(src, /escapeHtml\(x\.rule\)/);
  assert.doesNotMatch(src, /\$\{x\.fragment\}/);
});
