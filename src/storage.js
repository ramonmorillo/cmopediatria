// Almacenamiento local exclusivo (localStorage). Sin backend, sin bases de datos externas.
const KEY = 'siaf-cmo-pediatria-cases';

export function allCases() {
	return JSON.parse(localStorage.getItem(KEY) || '[]');
}

export function saveCase(form) {
	const cases = allCases().filter(c => c.id !== form.id);
	const item = {
		...form,
		pseudoId: (form.pseudoId ?? '').trim(),
		hospital: (form.hospital ?? '').trim(),
		pharmacist: (form.pharmacist ?? '').trim(),
		status: form.status || 'draft',
		completedAt: form.completedAt || null,
		id: form.id || crypto.randomUUID(),
		updatedAt: new Date().toISOString()
	};
	cases.unshift(item);
	localStorage.setItem(KEY, JSON.stringify(cases));
	return item;
}

export function deleteCase(id) {
	localStorage.setItem(KEY, JSON.stringify(allCases().filter(c => c.id !== id)));
}

export function clearCases() {
	localStorage.removeItem(KEY);
}
