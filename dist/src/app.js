import {
	VARIABLES, DIMENSIONS, PATHOLOGY_GROUPS, calculate, actionsFor, PERIODICITY,
	exportCase, importCase, normalizeCase, finalizeCase,
	validateClinicalValue, MOTIVATION_GUIDANCE, OPPORTUNITY_GUIDANCE, MAX_SCORE
} from './clinical.js';
import { prestratify, detectIdentifiers } from './extractor.js';
import * as A from './assessment.js';
import { createReport, reportToText, reportToHtml, toCsv, INTERVENTION_STATUSES } from './cmo-ds/cmo-report.js';
import { reportToPdf } from './cmo-ds/cmo-pdf.js';
import { copyText, download, guardUnsaved, printHtml, safeFilename } from './cmo-ds/cmo-flow.js';
import {
	allCases, saveCase, deleteCase, clearCases, exportDataset, parseDatasetText,
	prepareMerge, commitMerge, MAX_RECORDS_PER_MERGE, MAX_JSON_BYTES, validateRecord
} from './storage.js';

const today = () => new Date().toISOString().slice(0, 10);
const VERSION_LABEL = (() => { try { return JSON.parse(document.getElementById('cmo-app-meta').textContent).appVersion || ''; } catch { return ''; } })();
let form = normalizeCase({ values: {}, pathologyGroups: [], visitType: 'initial', visitDate: today() });
let dirty = false;

const $ = s => document.querySelector(s);
const el = (t, a = {}, h = '') => { const e = document.createElement(t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); e.innerHTML = h; return e; };
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[ch]);
const variableById = id => VARIABLES.find(v => v.id === id);
const visitTypeLabel = type => ({ initial: 'Visita inicial', 'follow-up': 'Visita de seguimiento', final: 'Visita final' })[type] || 'No especificado';
const statusLabel = status => ({ draft: 'Borrador', provisional: 'Provisional', completed: 'Definitiva' })[status] || 'Borrador';

function confirmReplace() {
	return !dirty || confirm('La valoración abierta contiene cambios no guardados. ¿Desea descartarlos y continuar?');
}

function saveCurrent() {
	try { form = saveCase(form); dirty = false; renderSaved(); announce('Valoración guardada localmente.'); }
	catch { announce('No se pudo guardar la valoración. Compruebe el espacio disponible en el navegador.'); }
}

function render() {
	renderPathologyGroups();
	renderVariables();
	renderMotivacion();
	renderOportunidad();
	hydrateForm();
	update();
	renderSaved();
	renderFinalPanel();
}

function renderPathologyGroups() {
	const c = $('#pathologyGroups');
	c.innerHTML = PATHOLOGY_GROUPS.map(([id, label]) => `<label><input type="checkbox" value="${id}"> ${label}</label>`).join('');
	c.onchange = () => {
		form.pathologyGroups = [...c.querySelectorAll(':checked')].map(i => i.value);
		markDraft(); update();
	};
}

function renderVariables() {
	const container = $('#variables');
	container.innerHTML = '';
	for (const [dim, d] of Object.entries(DIMENSIONS)) {
		const section = el('section', { class: 'panel' }, `<h2>${d.label} <span id="sub-${dim}" class="chip"></span></h2>`);
		VARIABLES.filter(v => v.dim === dim).forEach(v => {
			const card = el('div', { class: 'var-card' }, `<h3>${v.label}</h3>${v.help ? `<p>${v.help}</p>` : ''}<div id="ctrl-${v.id}"></div>`);
			const ctrl = card.querySelector('div');
			if (v.type === 'age') {
				ctrl.innerHTML = '<p class="hint">Se calcula automáticamente a partir del campo «Edad (años cumplidos)» de Datos generales pediátricos.</p>';
			} else {
				ctrl.innerHTML = `<select data-var="${v.id}" aria-label="${escapeHtml(v.label)}"><option value="pending">Pendiente de valoración</option><option value="yes">Sí</option><option value="no">No</option></select>`;
			}
			section.append(card);
		});
		container.append(section);
	}
	container.querySelectorAll('select[data-var]').forEach(s => {
		s.onchange = () => { form.values = { ...(form.values || {}), [s.dataset.var]: s.value }; markDraft(); update(); };
	});
}

function renderMotivacion() {
	$('#motivacion').innerHTML = MOTIVATION_GUIDANCE.map(g => `<h3>${g.title}</h3><ul>${g.items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('');
}
function renderOportunidad() {
	$('#oportunidad').innerHTML = OPPORTUNITY_GUIDANCE.map(g => `<h3>${g.title}</h3><ul>${g.items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('');
}

function hydrateForm() {
	$('#pseudo').value = form.pseudoId || '';
	$('#hospital').value = form.hospital || '';
	$('#pharmacist').value = form.pharmacist || '';
	$('#visitType').value = form.visitType || '';
	$('#visitDate').value = form.visitDate || '';
	$('#ageYears').value = form.ageYears ?? '';
	$('#nextReview').value = form.plan?.nextReview || '';
	$('#planNotes').value = form.plan?.notes || '';
	actionsPriority = '';
	$('#overridePriority').value = form.override?.priority || '';
	$('#overrideMotive').value = form.override?.motive || '';
	$('#overrideJustification').value = form.override?.justification || '';
	$('#overrideReinforced').checked = form.override?.reinforced || false;
	document.querySelectorAll('#pathologyGroups input').forEach(i => { i.checked = (form.pathologyGroups || []).includes(i.value); });
	document.querySelectorAll('select[data-var]').forEach(s => { s.value = form.values?.[s.dataset.var] || 'pending'; });
}

function markDraft() {
	dirty = true;
	if (form.status === 'completed' || form.status === 'provisional') { form.status = 'draft'; form.outdated = true; }
}

function setClinicalVariable(variableId, value, years) {
	const v = variableById(variableId);
	if (!v) return { ok: false, message: 'La propuesta no corresponde a ninguna variable clínica reconocida.' };
	if (v.type === 'age') {
		if (!Number.isFinite(years)) return { ok: false, message: 'La edad propuesta no es un valor numérico admisible.' };
		form.ageYears = years;
		$('#ageYears').value = years;
		markDraft(); update();
		return { ok: true };
	}
	if (!validateClinicalValue(v, value)) return { ok: false, message: `El valor propuesto no es admisible para «${v.label}».` };
	form.values = { ...(form.values || {}), [variableId]: value };
	const control = document.querySelector(`[data-var="${CSS.escape(variableId)}"]`);
	if (!control) return { ok: false, message: `No se ha encontrado el control del formulario para «${v.label}».` };
	control.value = value;
	markDraft(); update();
	return { ok: true };
}

function computeResult() {
	const ev = A.evaluate(form);
	$('#overrideError').textContent = ev.overrideError;
	return ev.result;
}
const currentReport = () => createReport(A.buildReportInput(form, A.evaluate(form), { version: VERSION_LABEL }));

function update() {
	form.pseudoId = $('#pseudo').value.trim();
	form.hospital = $('#hospital').value.trim();
	form.pharmacist = $('#pharmacist').value.trim();
	form.visitType = $('#visitType').value;
	form.visitDate = $('#visitDate').value;
	// Una edad negativa o no numérica queda pendiente (antes rompía el cálculo).
	form.ageYears = A.cleanAge($('#ageYears').value);
	$('#ageYears').setAttribute('aria-invalid', String($('#ageYears').value !== '' && form.ageYears === undefined));
	form.override = {
		priority: $('#overridePriority').value,
		justification: $('#overrideJustification').value.trim(),
		motive: $('#overrideMotive').value.trim(),
		reinforced: $('#overrideReinforced').checked
	};
	form.plan = { nextReview: $('#nextReview').value, notes: $('#planNotes').value };

	const base = A.evaluate(form).base;
	const basePriority = base.automaticCause || base.calculatedPriority;
	const rank = { P3: 0, P2: 1, P1: 2 };
	const wouldReduce = form.override.priority && rank[form.override.priority] < rank[basePriority];
	$('#reinforcedLabel').hidden = !wouldReduce;

	const r = computeResult();
	$('#score').textContent = `${r.total}/${MAX_SCORE}`;
	$('#priority').textContent = r.finalPriority;
	$('#statusState').textContent = form.outdated ? 'Pendiente de actualizar' : (r.pending ? 'Provisional: datos pendientes' : 'Completo');
	$('#autoCriterion').textContent = r.automaticCause || 'Sin criterio automático';
	for (const [k, v] of Object.entries(r.subtotals)) {
		$('#sub-' + k)?.replaceChildren(document.createTextNode(`${v}/${DIMENSIONS[k].max}`));
	}
	$('#detail').innerHTML = r.details.map(d => `<tr><td>${d.variable.label}</td><td>${d.response}</td><td>${d.points}</td></tr>`).join('');
	renderNeedsAndActions(A.evaluate(form), r);
	const doneVars = r.details.filter(d => !d.pending).length;
	$('#progress').value = doneVars; $('#progress').max = r.details.length;
	$('#progressText').textContent = `${doneVars} de ${r.details.length} variables valoradas${r.pending ? ' · resultado provisional' : ''}`;
	window.currentResult = r;
	renderFinalPanel();
}

let actionsPriority = '';
function renderNeedsAndActions(ev, r) {
	$('#needs').innerHTML = `<h3>Necesidades detectadas</h3>` + A.needsByDimension(ev).map(n => `<h4>${n.dim.label}</h4><ul>${n.confirmed.map(d => `<li>${d.variable.label} — ${escapeHtml(d.response)} (${d.points} p)</li>`).join('') || '<li>Ninguna confirmada</li>'}</ul>${n.potential.length ? `<p class="hint">Potenciales, pendientes de evaluación: ${n.potential.map(d => escapeHtml(d.variable.label)).join('; ')}.</p>` : ''}`).join('');
	if (actionsPriority !== r.finalPriority) {
		actionsPriority = r.finalPriority;
		$('#actions').innerHTML = `<h3>Actuaciones del modelo (${A.priorityLabel(r.finalPriority)}, acumulativas)</h3><p class="hint">Registre cuáles ha realizado, cuáles quedan planificadas y cuáles no proceden.</p>` + Object.entries(A.interventionCatalog(r.finalPriority).reduce((g, a) => { (g[a.groupLabel] ||= []).push(a); return g; }, {})).map(([label, items]) => `<h4>${label}</h4><ul class="status-list">${items.map(a => `<li><span id="int-${a.id}">${escapeHtml(a.label)}</span> <select data-int="${a.id}" aria-labelledby="int-${a.id}">${Object.entries(INTERVENTION_STATUSES).map(([k, l]) => `<option value="${k}"${A.interventionStatus(form, a.id) === k ? ' selected' : ''}>${l}</option>`).join('')}</select></li>`).join('')}</ul>`).join('') + `<p><strong>Periodicidad recomendada:</strong> ${PERIODICITY[r.finalPriority]}</p>`;
		$('#actions').querySelectorAll('select[data-int]').forEach(sel => { sel.onchange = () => { const st = { ...(form.statuses || {}) }; if (sel.value === 'recommended') delete st[sel.dataset.int]; else st[sel.dataset.int] = sel.value; form.statuses = st; markDraft(); update(); }; });
	}
}

function renderActions(priority) {
	return Object.values(actionsFor(priority)).map(g => `<h3>${g.label}</h3><ul>${g.items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('');
}

['pseudo', 'hospital', 'pharmacist', 'visitType', 'visitDate', 'ageYears', 'overridePriority', 'overrideJustification', 'overrideMotive', 'overrideReinforced', 'nextReview', 'planNotes'].forEach(id => {
	setTimeout(() => { $('#' + id).oninput = () => { markDraft(); update(); }; $('#' + id).onchange = () => { markDraft(); update(); }; });
});

$('#save').onclick = () => saveCurrent();
const fileBase = () => safeFilename('cmo-ped', form.pseudoId || 'caso', (form.completedAt || form.visitDate || '').slice(0, 10));
$('#exportJson').onclick = () => download('caso-pediatria.json', exportCase(A.cleanForm(form)), 'application/json');
$('#exportCsv').onclick = () => download('detalle-pediatria.csv', toCsv(A.csvRows(A.evaluate(form)), { separator: ';' }), 'text/csv;charset=utf-8');
$('#summary').onclick = () => { download(`${fileBase()}.txt`, report()); announce('Texto descargado.'); };
$('#print').onclick = () => { const r = currentReport(); printHtml(reportToHtml(r), r.title); };
$('#downloadPdf').onclick = () => { download(`${fileBase()}.pdf`, reportToPdf(currentReport()), 'application/pdf'); announce('PDF generado.'); };
$('#copyReport').onclick = async () => { const ok = await copyText(report()); $('#copyStatus').textContent = ok ? 'Informe copiado al portapapeles. Revíselo antes de incorporarlo a la historia clínica.' : 'No se ha podido copiar automáticamente: descargue el texto y cópielo.'; };
guardUnsaved(() => dirty);
$('#import').onchange = async e => {
	const input = e.target, file = input.files[0];
	try {
		if (!file || !confirmReplace()) return;
		if (file.size > MAX_JSON_BYTES) throw new Error('too large');
		form = A.cleanForm(validateRecord(importCase(await file.text())));
		dirty = false; render(); announce('Valoración importada correctamente.');
	} catch { announce('No se pudo importar: el JSON es inválido o incompatible.'); }
	finally { input.value = ''; }
};

$('#newVisit').onchange = async e => {
	const input = e.target, file = input.files[0];
	try {
		if (!file || !confirmReplace()) return;
		if (file.size > MAX_JSON_BYTES) throw new Error('too large');
		const source = A.cleanForm(validateRecord(importCase(await file.text())));
		const result = calculate(source);
		const summary = `Código pseudonimizado: ${source.pseudoId || 'no especificado'}\nHospital: ${source.hospital || 'no especificado'}\nTipo: ${visitTypeLabel(source.visitType)}\nFecha: ${source.visitDate || 'no especificada'}\nPrioridad: ${result.finalPriority}\nEstado: ${statusLabel(source.status)}\n\n¿Crear una nueva visita de seguimiento a partir de esta valoración?`;
		if (!confirm(summary)) return;
		const previousId = source.id || '';
		form = normalizeCase({ ...source, id: undefined, createdAt: '', updatedAt: '', visitType: 'follow-up', visitDate: today(), previousAssessmentId: previousId, status: 'draft', completedAt: null, outdated: false });
		dirty = true; render();
		announce(previousId ? 'Nueva visita preparada. Se asignará un identificador nuevo al guardarla.' : 'Nueva visita preparada. El archivo anterior no tenía ID y no se puede establecer el enlace técnico.');
	} catch { announce('No se pudo crear la visita: el JSON es inválido o incompatible.'); }
	finally { input.value = ''; }
};

$('#exportAll').onclick = () => download(`siaf-cmo-pediatria-registros-${today()}.json`, exportDataset(), 'application/json');
$('#mergeFiles').onchange = handleMergeFiles;
$('#clear').onclick = () => { if (confirm('¿Borrar todos los casos guardados localmente?')) { clearCases(); renderSaved(); announce('Borrado completo realizado.'); } };

$('#extract').onclick = () => {
	const text = $('#clinicalText').value;
	const identifiers = detectIdentifiers(text);
	const warnBox = $('#identifierWarning');
	if (identifiers.length) {
		warnBox.hidden = false;
		warnBox.innerHTML = `<strong>Aviso: se han detectado posibles identificadores en el texto.</strong> No se ha almacenado ni transmitido el texto. Revise y elimine estos datos antes de continuar: <ul>${identifiers.map(i => `<li>${i.type} (${i.count})</li>`).join('')}</ul>`;
	} else {
		warnBox.hidden = true;
		warnBox.innerHTML = '';
	}
	const res = prestratify(text);
	$('#clinicalText').value = '';
	const relevant = res.filter(x => x.status !== 'no_mencionado');
	$('#extractResults').innerHTML = relevant.length ? relevant.map((x, i) => {
		const label = variableById(x.variableId)?.label || x.variableId;
		const proposalLabel = x.variableId === 'age' ? `Edad ≈ ${x.years?.toFixed?.(1) ?? '?'} años` : (x.proposal === 'yes' ? 'Sí' : x.proposal === 'no' ? 'No' : 'Sin propuesta');
		return `<div class="proposal" data-proposal-index="${i}"><b>${label}</b>: ${x.status} — propuesta: ${proposalLabel} (certeza: ${x.certainty})<br><small>«…${escapeHtml(x.fragment)}…»</small><br><em>${escapeHtml(x.rule)}</em><br>` +
			(x.proposal !== 'pending' ? `<button type="button" data-accept="${x.variableId}" data-val="${x.proposal}" data-years="${x.years ?? ''}">Confirmar</button>` : '') +
			`<button type="button" data-reject>Descartar</button><span class="proposal-state" aria-live="polite"></span></div>`;
	}).join('') : 'Sin propuestas.';
	document.querySelectorAll('[data-accept]').forEach(b => b.onclick = () => {
		const box = b.closest('.proposal'), msg = box.querySelector('.proposal-state');
		const years = b.dataset.years ? Number(b.dataset.years) : undefined;
		const result = setClinicalVariable(b.dataset.accept, b.dataset.val, years);
		if (result.ok) { box.classList.add('confirmed'); msg.textContent = ' Confirmada e incorporada al formulario.'; box.querySelectorAll('button').forEach(x => x.disabled = true); announce('Propuesta confirmada y trasladada al formulario.'); }
		else { box.classList.add('error'); msg.textContent = ' ' + result.message; announce(result.message); }
	});
	document.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => {
		const box = b.closest('.proposal');
		box.classList.add('rejected'); box.querySelector('.proposal-state').textContent = ' Descartada.'; box.querySelectorAll('button').forEach(x => x.disabled = true);
		announce('Propuesta descartada.');
	});
};

$('#finish').onclick = () => finish(false);
$('#finishProvisional').onclick = () => finish(true);
$('#backToForm').onclick = () => { $('#pendingDialog').hidden = true; $('#variables select')?.focus(); };

function finish(allowProvisional) {
	clearValidation();
	update();
	const missing = [];
	if (!form.hospital) missing.push(['hospital', 'Indique el hospital o centro sanitario.']);
	if (!form.pharmacist) missing.push(['pharmacist', 'Indique el farmacéutico responsable.']);
	if (missing.length) { showFieldError(missing[0][0], missing.map(m => m[1]).join(' ')); return; }
	const r = A.evaluate(form).result;
	const pending = r.details.filter(d => d.pending);
	if (pending.length && !allowProvisional) {
		$('#pendingList').innerHTML = pending.map(d => `<li>${d.variable.label}</li>`).join('');
		$('#pendingCount').textContent = pending.length;
		$('#pendingDialog').hidden = false;
		$('#pendingDialog').focus();
		return;
	}
	try {
		form = finalizeCase(form, (pending.length ? 'provisional' : 'completed'));
	} catch (e) { announce(e.message); return; }
	$('#pendingDialog').hidden = true;
	update();
	renderFinalPanel(true);
	form = saveCase(form); dirty = false;
	renderSaved();
}

function renderFinalPanel(focus = false) {
	const panel = $('#finalResult');
	if (!panel) return;
	if (!form.completedAt) { panel.hidden = true; return; }
	const rr = computeResult();
	const pending = rr.details.filter(d => d.pending);
	panel.hidden = false;
	panel.className = `panel result ${rr.finalPriority.toLowerCase()}`;
	const report = currentReport();
	panel.innerHTML = `${form.outdated ? '<p class="warning"><strong>Resultado pendiente de actualizar tras cambios en el formulario.</strong></p>' : ''}${reportToHtml(report)}
		<button type="button" id="panelSummary">Descargar texto</button>
		<button type="button" id="panelPdf">Descargar PDF</button>
		<button type="button" id="panelPrint">Imprimir</button>`;
	$('#panelPdf').onclick = () => { download(`${fileBase()}.pdf`, reportToPdf(report), 'application/pdf'); announce('PDF generado.'); };
	$('#panelSummary').onclick = () => download(`${fileBase()}.txt`, report());
	$('#panelPrint').onclick = () => printHtml(reportToHtml(report), report.title);
	if (focus) { panel.setAttribute('tabindex', '-1'); panel.scrollIntoView({ behavior: 'smooth' }); panel.focus(); announce('Resultado de estratificación generado.'); }
}

function clearValidation() { ['hospital', 'pharmacist'].forEach(id => $('#' + id).removeAttribute('aria-invalid')); $('#validation').textContent = ''; }
function showFieldError(id, msg) { $('#' + id).setAttribute('aria-invalid', 'true'); $('#validation').textContent = msg; $('#' + id).focus(); }
function announce(msg) { $('#live').textContent = msg; }

function renderSaved() {
	const list = $('#saved');
	list.replaceChildren();
	const cases = allCases().sort((a, b) => String(b.visitDate || b.updatedAt || '').localeCompare(String(a.visitDate || a.updatedAt || '')));
	for (const c of cases) {
		const li = document.createElement('li');
		const result = A.evaluate(c).result;
		const description = document.createElement('span');
		description.textContent = `${c.pseudoId || 'Sin código'} — ${visitTypeLabel(c.visitType)} — ${c.visitDate || 'fecha no especificada'} — ${statusLabel(c.status)} — ${result.finalPriority}`;
		const load = document.createElement('button'); load.type = 'button'; load.dataset.load = c.id; load.textContent = 'Cargar';
		const remove = document.createElement('button'); remove.type = 'button'; remove.dataset.del = c.id; remove.textContent = 'Borrar';
		li.append(description, ' ', load, ' ', remove); list.append(li);
	}
	document.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { if (!confirmReplace()) return; form = A.cleanForm(normalizeCase(allCases().find(c => c.id === b.dataset.load))); dirty = false; render(); });
	document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Borrar este caso?')) { deleteCase(b.dataset.del); renderSaved(); } });
}

async function handleMergeFiles(event) {
	const input = event.target, files = [...input.files];
	$('#mergePreview').hidden = true;
	try {
		if (!files.length) return;
		let imported = [], invalid = [];
		for (const file of files) {
			try {
				if (file.size > MAX_JSON_BYTES) throw new Error('El archivo supera el límite de 5 MB.');
				imported.push(...parseDatasetText(await file.text()));
			}
			catch (error) { invalid.push({ file: file.name, reason: error.message }); }
			if (imported.length > MAX_RECORDS_PER_MERGE) throw new Error(`La selección supera el límite de ${MAX_RECORDS_PER_MERGE} registros por operación.`);
		}
		renderMergePreview(prepareMerge(allCases(), imported, invalid));
	} catch (error) { announce(error.message || 'No se pudieron validar los archivos seleccionados.'); }
	finally { input.value = ''; }
}

function renderMergePreview(preview) {
	const box = $('#mergePreview'); box.replaceChildren(); box.hidden = false;
	const title = document.createElement('h4'); title.textContent = 'Previsualización de la fusión';
	const list = document.createElement('ul');
	for (const text of [`${preview.additions.length} registros nuevos`, `${preview.duplicates.length} duplicados omitidos`, `${preview.conflicts.length} conflictos no importados`, `${preview.invalid.length} registros o archivos inválidos`]) {
		const li = document.createElement('li'); li.textContent = text; list.append(li);
	}
	const confirmButton = document.createElement('button'); confirmButton.type = 'button'; confirmButton.textContent = 'Confirmar fusión';
	confirmButton.disabled = preview.additions.length === 0;
	confirmButton.onclick = () => {
		if (!confirm('¿Confirmar la incorporación de los registros nuevos? Los duplicados y conflictos quedarán fuera.')) return;
		try {
			const local = allCases();
			if (local.length) download(`siaf-cmo-pediatria-copia-seguridad-${today()}.json`, exportDataset(local), 'application/json');
			const count = commitMerge(preview); box.hidden = true; renderSaved(); announce(`Fusión completada: ${count} registros incorporados; los duplicados y conflictos se han omitido.`);
		} catch { announce('No se pudo completar la fusión. Los registros locales no se han modificado.'); }
	};
	box.append(title, list, confirmButton);
}

function report() { return reportToText(currentReport()); }

render();
