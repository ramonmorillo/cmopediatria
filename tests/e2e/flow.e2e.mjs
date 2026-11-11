// Recorrido extremo a extremo de SIAF-CMO Pediatría en Chromium (Playwright). Datos ficticios.
//   npm run test:e2e            (requiere Playwright con Chromium; reconstruye dist/)
//   AXE_PATH=<axe.min.js>       añade la auditoría WCAG A/AA
//   E2E_OUT=<carpeta>           guarda PDF, texto y capturas
import test, {before, after} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {execSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {VARIABLES} from '../../src/clinical.js';
import * as A from '../../src/assessment.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); } catch { try { ({chromium} = await import('playwright')); } catch { chromium = null; } }
const repo = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIST = path.join(repo, 'dist');
const BASE_PATH = '/cmopediatria/';
const OUT = process.env.E2E_OUT;
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.md': 'text/markdown'};
let server, browser, origin;
const external = [];

before(async () => {
  if (!chromium) return;
  execSync('node scripts/build.js', {cwd: repo, stdio: 'ignore'});
  server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (!url.startsWith(BASE_PATH)) { res.writeHead(404); res.end(); return; }
    let file = path.join(DIST, url.slice(BASE_PATH.length));
    if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
    if (file.endsWith(path.sep) || file === DIST) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); res.end(); return; } res.writeHead(200, {'content-type': TYPES[path.extname(file)] || 'application/octet-stream'}); res.end(data); });
  });
  await new Promise(r => server.listen(0, r));
  origin = `http://localhost:${server.address().port}`;
  browser = await chromium.launch();
  if (OUT) fs.mkdirSync(OUT, {recursive: true});
});
after(async () => { await browser?.close(); server?.close(); });

async function open(viewport = {width: 1280, height: 900}) {
  const context = await browser.newContext({viewport, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write']});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  page.on('request', r => { const u = r.url(); if (!u.startsWith(origin) && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'about:srcdoc') external.push(u); });
  await page.goto(origin + BASE_PATH);
  return {page, errors};
}
const nonAge = VARIABLES.filter(v => v.type !== 'age');
// Variables «Sí» cuyo total, con edad escolar (1 punto), es exactamente n.
function idsFor(n) {
  const best = new Map([[0, []]]);
  for (const v of nonAge) for (const [sum, ids] of [...best]) if (!best.has(sum + v.points) && sum + v.points <= n - 1) best.set(sum + v.points, [...ids, v.id]);
  return best.get(n - 1);
}
const identify = async page => { await page.fill('#pseudo', 'PED-0001'); await page.fill('#hospital', 'Hospital Ficticio'); await page.fill('#pharmacist', 'Farmacéutica Ficticia'); };
const answer = (page, id, value) => page.selectOption(`select[data-var="${id}"]`, value);
const save = async (download, name) => { const file = path.join(OUT || fs.mkdtempSync('/tmp/cmo-ped-'), name); await download.saveAs(file); return file; };
async function axe(page, label) {
  if (!process.env.AXE_PATH) return;
  await page.addScriptTag({path: process.env.AXE_PATH});
  const violations = await page.evaluate(async () => (await window.axe.run(document, {preload: false, runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']})).violations.map(v => `${v.id}(${v.nodes.length}): ${v.nodes.map(n => n.html.slice(0, 90)).join(' | ')}`));
  assert.deepEqual(violations, [], `axe ${label}`);
}
const skip = {skip: !chromium && 'Playwright no disponible'};

test('recorrido completo: P1 por puntuación (31), actuaciones, plan, informe, exportación y casos guardados', skip, async () => {
  const {page, errors} = await open();
  await axe(page, 'inicio');
  assert.equal(await page.textContent('#priority'), 'P3');
  assert.match(await page.textContent('#progressText'), /0 de 20 variables valoradas · resultado provisional/);
  await identify(page); await page.fill('#ageYears', '8');
  for (const v of nonAge) await answer(page, v.id, idsFor(31).includes(v.id) ? 'yes' : 'no');
  assert.equal(await page.textContent('#score'), '31/57'); assert.equal(await page.textContent('#priority'), 'P1');
  assert.match(await page.textContent('#progressText'), /20 de 20 variables valoradas$/);
  assert.match(await page.textContent('#needs'), /Necesidades detectadas/);
  // Actuaciones con estado y plan
  const total = A.interventionCatalog('P1').length;
  assert.equal(await page.locator('select[data-int]').count(), total);
  await page.selectOption('select[data-int="sft.0"]', 'done'); await page.selectOption('select[data-int="sft.1"]', 'planned');
  await page.fill('#nextReview', '2027-02-10'); await page.fill('#planNotes', '<img src=x onerror="window.__xss=1"> Llamada al cuidador.');
  await axe(page, 'formulario completo');
  await page.click('#finish');
  await page.waitForSelector('#finalResult:not([hidden]) .cmo-report');
  const finalText = await page.textContent('#finalResult');
  assert.match(finalText, /PED-0001/); assert.match(finalText, /Definitiva/); assert.match(finalText, /Prioridad 1/);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('#finalResult img').count(), 0, 'lo tecleado se escapa');
  await axe(page, 'resultado final');
  // Informes
  await page.click('#copyReport');
  await page.waitForFunction(() => document.getElementById('copyStatus').textContent !== '');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(text, /RESULTADO DE ESTRATIFICACIÓN: PRIORIDAD 1$/m); assert.match(text, /Puntuación total: 31\/57/);
  assert.match(text, /Realizadas en esta consulta:\n\s+- [^\n]+/); assert.match(text, /Planificadas \/ pendientes:/); assert.match(text, /Próxima valoración prevista: 10\/02\/2027/);
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.click('#downloadPdf')]);
  const bytes = fs.readFileSync(await save(pdf, 'informe-P1-ficticio.pdf'));
  assert.equal(bytes.subarray(0, 8).toString('latin1'), '%PDF-1.4'); assert.ok(bytes.toString('latin1').includes('PED-0001'));
  const [txt] = await Promise.all([page.waitForEvent('download'), page.click('#summary')]);
  assert.equal(fs.readFileSync(await save(txt, 'informe-P1-ficticio.txt'), 'utf8'), text, 'el .txt es idéntico al texto copiado');
  const printed = page.evaluate(() => new Promise(r => document.addEventListener('cmo:print', () => r(document.querySelector('iframe.cmo-print-frame').contentDocument.body.textContent), {once: true})));
  await page.click('#print');
  assert.ok((await printed).includes('Resultado de estratificación: Prioridad 1'));
  const [json] = await Promise.all([page.waitForEvent('download'), page.click('#exportJson')]);
  const jsonFile = await save(json, 'caso-ficticio.json');
  assert.equal(JSON.parse(fs.readFileSync(jsonFile, 'utf8')).schema, 'siaf-cmo-pediatria-v1');
  const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#exportCsv')]);
  assert.match(fs.readFileSync(await save(csv, 'detalle.csv'), 'utf8'), /"hospital";"farmaceutico";"variable"/);
  // Casos guardados: el listado muestra la prioridad final
  assert.match(await page.textContent('#saved'), /PED-0001[\s\S]*Definitiva — P1/);
  // Importación hostil
  const evil = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  evil.form.pseudoId = '<img src=x onerror="window.__xss=1">'; evil.form.ageYears = -5; evil.form.values.hospitalUrgency = 'banana'; evil.form.values.inventada = 'yes'; evil.form.statuses = {zzz: 'done'};
  const evilFile = path.join(path.dirname(jsonFile), 'hostil.json'); fs.writeFileSync(evilFile, JSON.stringify(evil));
  await page.setInputFiles('#import', evilFile);
  await page.waitForFunction(() => /importada/i.test(document.getElementById('live').textContent));
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.inputValue('#ageYears'), '', 'edad inválida descartada');
  assert.equal(await page.inputValue('select[data-var="hospitalUrgency"]'), 'pending', 'valor inventado descartado');
  assert.match(await page.textContent('#progressText'), /resultado provisional/);
  assert.deepEqual(errors, []);
});

test('provisional: finalizar con pendientes exige confirmación y se rotula en el informe', skip, async () => {
  const {page, errors} = await open();
  await identify(page); await page.fill('#ageYears', '4');
  await answer(page, nonAge[0].id, 'yes');
  await page.click('#finish');
  assert.equal(await page.isVisible('#pendingDialog'), true);
  await page.click('#finishProvisional');
  await page.waitForSelector('#finalResult:not([hidden]) .cmo-report');
  assert.match(await page.textContent('#finalResult'), /Provisional/);
  await page.click('#copyReport');
  await page.waitForFunction(() => document.getElementById('copyStatus').textContent !== '');
  const text = await page.evaluate(() => navigator.clipboard.readText());
  assert.match(text, /\(PROVISIONAL\)/); assert.match(text, /cota superior/); assert.match(text, /no se ha considerado negativa/);
  assert.deepEqual(errors, []);
});

test('edad negativa o no numérica: pendiente, sin errores (antes rompía el cálculo)', skip, async () => {
  const {page, errors} = await open();
  await page.fill('#ageYears', '-3');
  assert.equal(await page.getAttribute('#ageYears', 'aria-invalid'), 'true');
  assert.match(await page.textContent('#progressText'), /0 de 20/);
  await page.fill('#ageYears', '25');
  await identify(page);
  assert.equal(await page.textContent('#score'), '0/57');
  assert.deepEqual(errors, []);
});

test('análisis de texto: nada puntúa hasta confirmar; el texto no se conserva', skip, async () => {
  const {page, errors} = await open();
  await page.fill('#clinicalText', 'Paciente con sospecha de falta de adherencia y polimedicación con 6 principios activos. <img src=x onerror="window.__xss=1">');
  await page.click('#extract');
  await page.waitForSelector('[data-accept]');
  assert.equal(await page.textContent('#score'), '0/57', 'analizar no puntúa');
  assert.equal(await page.inputValue('#clinicalText'), '');
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  await page.locator('[data-accept]').first().click();
  assert.notEqual(await page.textContent('#score'), '0/57', 'confirmar incorpora y puntúa');
  await page.locator('[data-reject]').first().click();
  assert.deepEqual(errors, []);
});

test('móvil 375 px: sin desbordamiento horizontal tras finalizar', skip, async () => {
  const {page, errors} = await open({width: 375, height: 740});
  await identify(page); await page.fill('#ageYears', '8');
  for (const v of nonAge) await answer(page, v.id, 'no');
  await page.click('#finish');
  await page.waitForSelector('#finalResult:not([hidden]) .cmo-report');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) <= 0);
  if (OUT) await page.screenshot({path: path.join(OUT, 'final-375.png'), fullPage: true});
  assert.deepEqual(errors, []);
});

test('sin peticiones a terceros en todo el recorrido', skip, () => { assert.deepEqual(external, []); });
