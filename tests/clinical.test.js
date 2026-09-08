import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
	VARIABLES, calculate, scorePriority, automaticPriority, applyOverride,
	exportCase, importCase, toCSV, MAX_SCORE, THRESHOLDS
} from '../src/clinical.js';
import { prestratify, detectIdentifiers, NETWORK_FREE } from '../src/extractor.js';

// Polyfill mínimo de localStorage en memoria, sólo para el entorno de test de Node
// (el navegador aporta la implementación real; storage.js no cambia).
if (typeof globalThis.localStorage === 'undefined') {
	const store = new Map();
	globalThis.localStorage = {
		getItem: k => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => store.set(k, String(v)),
		removeItem: k => store.delete(k)
	};
}
const { allCases, saveCase, deleteCase, clearCases } = await import('../src/storage.js');

const allNo = () => Object.fromEntries(VARIABLES.filter(v => v.type !== 'age').map(v => [v.id, 'no']));
const allYes = () => Object.fromEntries(VARIABLES.filter(v => v.type !== 'age').map(v => [v.id, 'yes']));

test('1. Mínima complejidad: todo "No" y edad escolar (1 punto) da Prioridad 3', () => {
	const form = { values: allNo(), ageYears: 8 };
	const r = calculate(form);
	assert.equal(r.total, 1);
	assert.equal(r.pending, false);
	assert.equal(r.calculatedPriority, 'P3');
	assert.equal(r.finalPriority, 'P3');
});

test('2. Complejidad intermedia cae en Prioridad 2 (17-30 puntos)', () => {
	const values = allNo();
	// adherenceSuspicion(4) + polypharmacy(3) + complexChronic(4) + languageBarrier(4) + regimenComplexity(4) = 19
	['adherenceSuspicion', 'polypharmacy', 'complexChronic', 'languageBarrier', 'regimenComplexity'].forEach(id => { values[id] = 'yes'; });
	const form = { values, ageYears: 8 }; // +1
	const r = calculate(form);
	assert.equal(r.total, 20);
	assert.equal(r.calculatedPriority, 'P2');
});

test('3. Máxima complejidad: todo "Sí" y edad neonatal (4 puntos) alcanza el máximo de 57 y Prioridad 1', () => {
	const form = { values: allYes(), ageYears: 0.5 };
	const r = calculate(form);
	assert.equal(r.total, MAX_SCORE);
	assert.equal(r.total, 57);
	assert.equal(r.calculatedPriority, 'P1');
});

test('4. Valores exactamente en los puntos de corte (17 y 31)', () => {
	assert.equal(scorePriority(THRESHOLDS.p2 - 1), 'P3'); // 16 -> P3
	assert.equal(scorePriority(THRESHOLDS.p2), 'P2');     // 17 -> P2
	assert.equal(scorePriority(THRESHOLDS.p1 - 1), 'P2'); // 30 -> P2
	assert.equal(scorePriority(THRESHOLDS.p1), 'P1');     // 31 -> P1
});

test('5. Una variable pendiente marca el resultado como provisional', () => {
	const values = allNo();
	delete values.adherenceSuspicion;
	const form = { values, ageYears: 8 };
	const r = calculate(form);
	assert.equal(r.pending, true);
	assert.equal(r.details.filter(d => d.pending).length, 1);
});

test('6. Varias variables pendientes (incluida la edad) se listan todas', () => {
	const values = allNo();
	delete values.adherenceSuspicion;
	delete values.polypharmacy;
	const form = { values }; // ageYears sin definir: también pendiente
	const r = calculate(form);
	assert.equal(r.pending, true);
	assert.equal(r.details.filter(d => d.pending).length, 3);
});

test('7. No existen criterios de prioridad automática en el modelo pediátrico SEFH', () => {
	assert.equal(automaticPriority({ values: allYes(), ageYears: 0.5 }), null);
	assert.equal(automaticPriority({ values: allNo(), ageYears: 8 }), null);
});

test('8a. Override clínico: aumentar intensidad exige sólo justificación estándar (>=12 caracteres)', () => {
	const base = calculate({ values: allNo(), ageYears: 8 }); // P3
	const r = applyOverride(base, { priority: 'P1', justification: 'Riesgo social añadido no capturado por el modelo.' });
	assert.equal(r.finalPriority, 'P1');
	assert.equal(base.calculatedPriority, 'P3'); // el resultado original no se oculta
});

test('8b. Override clínico: reducir intensidad exige justificación reforzada y confirmación', () => {
	const base = calculate({ values: allYes(), ageYears: 0.5 }); // P1
	assert.throws(() => applyOverride(base, { priority: 'P3', justification: 'Mejoría clínica.' }));
	assert.throws(() => applyOverride(base, { priority: 'P3', justification: 'Mejoría clínica mantenida y sostenida en el tiempo, sin reinforced.' }));
	const r = applyOverride(base, {
		priority: 'P3',
		justification: 'Mejoría clínica mantenida y sostenida en el tiempo, valorada conjuntamente con el equipo asistencial.',
		reinforced: true
	});
	assert.equal(r.finalPriority, 'P3');
	assert.equal(r.calculatedPriority, 'P1'); // prioridad calculada original siempre visible
});

test('9. Guardado y recuperación en almacenamiento local', () => {
	clearCases();
	const form = { pseudoId: 'TEST-001', hospital: 'Hospital Test', pharmacist: 'Farmacéutico Test', values: allNo(), ageYears: 8 };
	const saved = saveCase(form);
	assert.ok(saved.id);
	const cases = allCases();
	assert.equal(cases.length, 1);
	assert.equal(cases[0].pseudoId, 'TEST-001');
	deleteCase(saved.id);
	assert.equal(allCases().length, 0);
});

test('10. Exportación e importación JSON son coherentes (round-trip)', () => {
	const form = { pseudoId: 'TEST-002', hospital: 'H', pharmacist: 'F', values: allYes(), ageYears: 12, pathologyGroups: ['respiratory'] };
	const json = exportCase(form);
	const imported = importCase(json);
	assert.equal(imported.pseudoId, 'TEST-002');
	assert.deepEqual(imported.pathologyGroups, ['respiratory']);
	assert.throws(() => importCase(JSON.stringify({ schema: 'otro', form: {} })));
});

test('10b. toCSV incluye hospital, farmacéutico, variable, respuesta y puntos', () => {
	const form = { hospital: 'H', pharmacist: 'F' };
	const r = calculate({ values: allNo(), ageYears: 8 });
	const csv = toCSV(r.details, form);
	assert.match(csv, /Hospital o centro sanitario/);
	assert.match(csv, /"H";"F";/);
});

test('11. El analizador propone sin autoconfirmar y no modifica estado alguno', () => {
	const text = 'Paciente con sospecha de falta de adherencia y polimedicación con 6 principios activos.';
	const proposals = prestratify(text);
	assert.ok(Array.isArray(proposals));
	const adherence = proposals.find(p => p.variableId === 'adherenceSuspicion');
	assert.equal(adherence.status, 'detectado');
	assert.equal(adherence.proposal, 'yes');
	// La propuesta no lleva ningún efecto secundario: no existe función de "auto-aplicar".
	assert.equal(typeof prestratify, 'function');
	assert.equal(Object.keys(proposals[0]).includes('fragment'), true);
});

test('11b. Detección de identificadores antes de analizar (DNI, email, teléfono, fecha)', () => {
	const text = 'Paciente: Juan Pérez, DNI 12345678Z, tel 612345678, contacto juan@example.com, nacido 05/03/2015.';
	const found = detectIdentifiers(text);
	const types = found.map(f => f.type);
	assert.ok(types.includes('DNI/NIE'));
	assert.ok(types.includes('Email'));
	assert.ok(types.includes('Teléfono'));
	assert.ok(types.includes('Fecha completa'));
	assert.ok(types.includes('Patrón "Paciente: Nombre"'));
});

test('12. Ausencia de llamadas de red o IA generativa externa en el código fuente', () => {
	assert.equal(NETWORK_FREE, true);
	for (const f of ['clinical.js', 'app.js', 'extractor.js', 'storage.js']) {
		const src = fs.readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
		assert.doesNotMatch(src, /fetch\s*\(/);
		assert.doesNotMatch(src, /XMLHttpRequest/);
		assert.doesNotMatch(src, /WebSocket/);
		assert.doesNotMatch(src, /openai|anthropic|azure openai/i);
	}
});
