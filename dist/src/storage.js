// Almacenamiento local exclusivo (localStorage). Sin backend ni bases de datos externas.
import { normalizeCase, VERSION } from './clinical.js';

const KEY = 'siaf-cmo-pediatria-cases';
export const DATASET_SCHEMA = 'siaf-cmo-pediatria-dataset-v1';
export const MAX_RECORDS_PER_MERGE = 1000;
export const MAX_JSON_BYTES = 5 * 1024 * 1024;

export function allCases() {
	try {
		const value = JSON.parse(localStorage.getItem(KEY) || '[]');
		return Array.isArray(value) ? value : [];
	} catch {
		return [];
	}
}

export function saveCase(form) {
	const now = new Date().toISOString();
	const item = normalizeCase({
		...form,
		id: form.id || crypto.randomUUID(),
		createdAt: form.createdAt || now,
		updatedAt: now
	});
	const cases = allCases().filter(c => c.id !== item.id);
	cases.unshift(item);
	localStorage.setItem(KEY, JSON.stringify(cases));
	return item;
}

export function deleteCase(id) {
	localStorage.setItem(KEY, JSON.stringify(allCases().filter(c => c.id !== id)));
}

export function clearCases() { localStorage.removeItem(KEY); }

export function createDataset(records = allCases(), exportedAt = new Date().toISOString()) {
	return { schema: DATASET_SCHEMA, version: VERSION, exportedAt, records };
}

export function exportDataset(records = allCases()) {
	return JSON.stringify(createDataset(records), null, 2);
}

function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }

export function validateRecord(record) {
	if (!isObject(record)) throw new Error('El registro no tiene una estructura válida.');
	if (record.id !== undefined && (typeof record.id !== 'string' || !record.id.trim())) throw new Error('El identificador de la valoración no es válido.');
	if (record.values !== undefined && !isObject(record.values)) throw new Error('Las variables clínicas no tienen una estructura válida.');
	if (record.pathologyGroups !== undefined && (!Array.isArray(record.pathologyGroups) || record.pathologyGroups.length > 100)) throw new Error('Los grupos de patología no son válidos.');
	if (record.visitType !== undefined && !['initial', 'follow-up', 'final', ''].includes(record.visitType)) throw new Error('El tipo de visita no es compatible.');
	if (record.visitDate && (typeof record.visitDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.visitDate))) throw new Error('La fecha de visita no es válida.');
	if (record.status !== undefined && !['draft', 'provisional', 'completed'].includes(record.status)) throw new Error('El estado de la valoración no es válido.');
	for (const field of ['pseudoId', 'hospital', 'pharmacist', 'previousAssessmentId', 'createdAt', 'updatedAt']) {
		if (record[field] !== undefined && record[field] !== null && typeof record[field] !== 'string') throw new Error(`El campo ${field} no es válido.`);
	}
	return normalizeCase(record);
}

export function parseDatasetText(text, { allowIndividual = true } = {}) {
	if (typeof text !== 'string' || text.length > MAX_JSON_BYTES) throw new Error('El archivo supera el límite de 5 MB.');
	let data;
	try { data = JSON.parse(text); } catch { throw new Error('El archivo no contiene JSON válido.'); }
	let records;
	if (data?.schema === DATASET_SCHEMA && Array.isArray(data.records)) records = data.records;
	else if (allowIndividual && data?.schema === 'siaf-cmo-pediatria-v1' && isObject(data.form)) records = [data.form];
	else throw new Error('El archivo no es compatible con SIAF-CMO Pediatría.');
	if (records.length > MAX_RECORDS_PER_MERGE) throw new Error(`El archivo supera el límite de ${MAX_RECORDS_PER_MERGE} registros.`);
	return records.map(validateRecord);
}

function canonical(value) {
	if (Array.isArray(value)) return value.map(canonical);
	if (isObject(value)) return Object.fromEntries(Object.keys(value).filter(k => k !== 'exportedAt').sort().map(k => [k, canonical(value[k])]));
	return value;
}

export function recordsEqual(a, b) { return JSON.stringify(canonical(normalizeCase(a))) === JSON.stringify(canonical(normalizeCase(b))); }

export function prepareMerge(localRecords, importedRecords, invalid = []) {
	if (!Array.isArray(localRecords) || !Array.isArray(importedRecords)) throw new Error('No se puede preparar la fusión.');
	if (importedRecords.length > MAX_RECORDS_PER_MERGE) throw new Error(`La operación supera el límite de ${MAX_RECORDS_PER_MERGE} registros.`);
	const byId = new Map(localRecords.filter(r => r?.id).map(r => [r.id, r]));
	const additions = [], duplicates = [], conflicts = [], invalidRecords = [...invalid];
	for (const candidate of importedRecords) {
		let record;
		try { record = validateRecord(candidate); } catch (error) { invalidRecords.push({ reason: error.message }); continue; }
		if (!record.id) { invalidRecords.push({ reason: 'Registro sin identificador único.' }); continue; }
		const existing = byId.get(record.id);
		if (!existing) { additions.push(record); byId.set(record.id, record); }
		else if (recordsEqual(existing, record)) duplicates.push(record);
		else conflicts.push(record);
	}
	return { additions, duplicates, conflicts, invalid: invalidRecords, result: [...localRecords, ...additions] };
}

// Una sola escritura: si setItem falla, el conjunto anterior permanece intacto.
export function commitMerge(preview) {
	if (!preview || !Array.isArray(preview.result)) throw new Error('La previsualización de fusión no es válida.');
	localStorage.setItem(KEY, JSON.stringify(preview.result));
	return preview.additions.length;
}
