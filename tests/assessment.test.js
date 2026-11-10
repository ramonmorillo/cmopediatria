// Adaptador de SIAF-CMO Pediatría (src/assessment.js). El motor y el extractor no se modifican
// (clinical.js solo cambia la constante VERSION: la huella normaliza esa línea).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {VARIABLES, THRESHOLDS, MAX_SCORE, calculate, applyOverride, actionsFor, ACTIONS} from '../src/clinical.js';
import * as A from '../src/assessment.js';
import {createReport, validateReport, reportToText, toCsv, exportEnvelope} from '../src/cmo-ds/cmo-report.js';
import {reportToPdf} from '../src/cmo-ds/cmo-pdf.js';

const base = (extra = {}) => ({pseudoId: 'PED-0001', hospital: 'Hospital Ficticio', pharmacist: 'Farmacéutica Ficticia', visitType: 'initial', visitDate: '2026-11-10', pathologyGroups: [], values: {}, ...extra});
const neutral = () => ({...base({ageYears: 8}), values: Object.fromEntries(VARIABLES.filter(v => v.type !== 'age').map(v => [v.id, 'no']))});
const nonAge = VARIABLES.filter(v => v.type !== 'age');
// Subconjunto de variables «Sí» cuyo total, con edad escolar (1 punto), sea exactamente n.
function formFor(n) {
  const target = n - 1, best = new Map([[0, []]]);
  for (const v of nonAge) for (const [sum, ids] of [...best]) if (!best.has(sum + v.points) && sum + v.points <= target) best.set(sum + v.points, [...ids, v.id]);
  const ids = best.get(target); assert.ok(ids, `no se puede alcanzar ${n}`);
  const f = neutral(); ids.forEach(id => { f.values[id] = 'yes'; }); return f;
}

test('el motor y el extractor no se han modificado (huellas de la versión 1.2.0)', () => {
  const expected = JSON.parse(fs.readFileSync(new URL('./fixtures/clinical.sha256.json', import.meta.url), 'utf8'));
  const norm = t => t.replace(/export const VERSION = '[^']*';/, 'export const VERSION = X;');
  assert.equal(crypto.createHash('sha256').update(norm(fs.readFileSync(new URL('../src/clinical.js', import.meta.url), 'utf8'))).digest('hex'), expected['clinical.js']);
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../src/extractor.js', import.meta.url))).digest('hex'), expected['extractor.js']);
});

test('fronteras 16/17 y 30/31 por el flujo nuevo: mismo resultado que el motor', () => {
  for (const [n, p] of [[16, 'P3'], [17, 'P2'], [30, 'P2'], [31, 'P1']]) {
    const f = formFor(n), ev = A.evaluate(f);
    assert.equal(ev.result.total, n, `total ${n}`); assert.equal(ev.result.finalPriority, p); assert.equal(ev.provisional, false);
    const direct = applyOverride(calculate(f), f.override || null);
    for (const k of ['total', 'subtotals', 'calculatedPriority', 'finalPriority', 'pending', 'automaticCause']) assert.deepEqual(ev.result[k], direct[k], k);
    assert.deepEqual(ev.result.details.map(d => [d.variable.id, d.points, d.response]), direct.details.map(d => [d.variable.id, d.points, d.response]));
  }
  assert.equal(THRESHOLDS.p2, 17); assert.equal(THRESHOLDS.p1, 31);
});

test('paridad en 300 formularios pseudoaleatorios (puntos, prioridad, pendientes)', () => {
  let seed = 5; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < 300; i++) {
    const f = base({ageYears: rnd() < 0.2 ? undefined : Math.round(rnd() * 18 * 10) / 10, values: Object.fromEntries(nonAge.filter(() => rnd() < 0.8).map(v => [v.id, ['yes', 'no', 'pending'][Math.floor(rnd() * 3)]]))});
    const ev = A.evaluate(f), direct = calculate(f);
    assert.equal(ev.result.total, direct.total); assert.equal(ev.result.finalPriority, direct.finalPriority); assert.equal(ev.provisional, direct.pending);
    assert.ok(ev.maxPossible >= ev.result.total && ev.maxPossible <= MAX_SCORE);
  }
});

test('pendiente no es «No»: sin datos es provisional con cota superior; edad negativa o no numérica es pendiente (antes rompía el cálculo)', () => {
  const e = A.evaluate({}); assert.equal(e.provisional, true); assert.equal(e.pending.length, VARIABLES.length); assert.equal(e.maxPossible, MAX_SCORE);
  for (const bad of [-3, 'abc', NaN, 500]) { const ev = A.evaluate({ageYears: bad}); assert.equal(ev.pending.some(d => d.variable.id === 'age'), true, String(bad)); }
  assert.throws(() => calculate({ageYears: -3}), TypeError, 'el motor por sí solo lanzaba TypeError con edad negativa');
  assert.equal(A.evaluate(neutral()).provisional, false);
});

test('modificación profesional: se conserva lo calculado, exige justificación y justificación reforzada al reducir', () => {
  const f = formFor(31);
  let ev = A.evaluate({...f, override: {priority: 'P2', justification: 'corta'}});
  assert.match(ev.overrideError, /mínimo 12/); assert.equal(ev.result.finalPriority, 'P1');
  ev = A.evaluate({...f, override: {priority: 'P2', justification: 'Justificación clínica suficientemente larga para la prueba de reducción.', reinforced: false}});
  assert.match(ev.overrideError, /reforzada/); assert.equal(ev.result.finalPriority, 'P1');
  ev = A.evaluate({...f, override: {priority: 'P2', motive: 'Estabilidad', justification: 'Justificación clínica suficientemente larga para la prueba de reducción.', reinforced: true}});
  assert.equal(ev.result.finalPriority, 'P2'); assert.equal(ev.result.calculatedPriority, 'P1'); assert.equal(ev.overrideError, '');
  const text = reportToText(createReport(A.buildReportInput(f, ev)));
  assert.match(text, /Resultado calculado por el modelo: Prioridad 1/); assert.match(text, /Modificación por criterio profesional: Prioridad 2\. Motivo: Estabilidad/); assert.match(text, /reduce la intensidad asistencial/);
});

test('actuaciones: el catálogo es exactamente actionsFor() y los identificadores son estables entre prioridades', () => {
  for (const p of ['P1', 'P2', 'P3']) {
    const cat = A.interventionCatalog(p), orig = actionsFor(p);
    for (const g of Object.keys(orig)) assert.deepEqual(cat.filter(c => c.group === g).map(c => c.label), orig[g].items);
    assert.equal(new Set(cat.map(c => c.id)).size, cat.length);
  }
  const p1 = new Map(A.interventionCatalog('P1').map(c => [c.id, c.label]));
  for (const c of A.interventionCatalog('P2')) assert.equal(p1.get(c.id), c.label);
  assert.ok(Object.keys(ACTIONS).length >= 3);
});

test('informe único: cada variable que puntúa aparece una vez; estados, plan y PDF', () => {
  const f = {...formFor(31), completedAt: '2026-11-10T09:30:00', statuses: {'sft.0': 'done', 'sft.1': 'planned'}, plan: {nextReview: '2027-02-10', notes: 'Llamada al cuidador.'}};
  const ev = A.evaluate(f), report = createReport(A.buildReportInput(f, ev, {version: '1.3.0'}));
  assert.deepEqual(validateReport(report), []); assert.equal(report.status, 'final');
  assert.equal(report.factors.length + report.needs.confirmed.length, ev.result.details.filter(d => d.points > 0).length);
  const text = reportToText(report);
  assert.match(text, /RESULTADO DE ESTRATIFICACIÓN: PRIORIDAD 1$/m); assert.match(text, new RegExp(`Puntuación total: 31/${MAX_SCORE}`)); assert.match(text, /Próxima valoración prevista: 10\/02\/2027/);
  assert.ok(Buffer.from(reportToPdf(report)).toString('latin1').includes('PED-0001'));
  const prov = createReport(A.buildReportInput({...f, values: {}}, A.evaluate({...f, values: {}})));
  assert.equal(prov.status, 'provisional'); assert.match(reportToText(prov), /cota superior/);
});

test('saneado de importación: valores, actuaciones y plan fuera de dominio se descartan', () => {
  const c = A.cleanForm({ageYears: '7', values: {social_support: 'banana', age: 'set', inventada: 'yes', [nonAge[0].id]: 'yes'}, pathologyGroups: ['inventado'], statuses: {'sft.0': 'hecho', zzz: 'done'}, plan: {nextReview: 'mañana', notes: 'x'.repeat(5000)}, override: {priority: 'P9'}});
  assert.deepEqual(c.values, {[nonAge[0].id]: 'yes'}); assert.deepEqual(c.pathologyGroups, []); assert.deepEqual(c.statuses, {});
  assert.equal(c.plan.nextReview, ''); assert.equal(c.plan.notes.length, 2000); assert.equal(c.override.priority, ''); assert.equal(c.ageYears, 7);
});

test('CSV: fórmulas neutralizadas y comillas dobladas', () => {
  const ev = A.evaluate({...neutral(), hospital: '=HYPERLINK("x")', pharmacist: 'A "B"'});
  const csv = toCsv(A.csvRows(ev), {separator: ';', bom: false});
  assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`)); assert.ok(csv.includes('"A ""B"""'));
  assert.equal(exportEnvelope({app: {id: A.APP_ID}, data: {}}).schema, 'cmo-export/1');
});

test('la aplicación no contiene red ni rótulos de IA', () => {
  for (const f of ['app.js', 'assessment.js']) assert.doesNotMatch(fs.readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8'), /\bfetch\s*\(|XMLHttpRequest|WebSocket|https?:\/\//, f);
});
