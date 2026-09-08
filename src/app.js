import {
	VARIABLES, DIMENSIONS, PATHOLOGY_GROUPS, calculate, actionsFor, PERIODICITY,
	exportCase, importCase, toCSV, applyOverride, normalizeCase, finalizeCase,
	validateClinicalValue, MOTIVATION_GUIDANCE, OPPORTUNITY_GUIDANCE, MAX_SCORE
} from './clinical.js';
import { prestratify, detectIdentifiers } from './extractor.js';
import { allCases, saveCase, deleteCase, clearCases } from './storage.js';

let form = normalizeCase({ values: {}, pathologyGroups: [] });

const $ = s => document.querySelector(s);
const el = (t, a = {}, h = '') => { const e = document.createElement(t); Object.entries(a).forEach(([k, v]) => e.setAttribute(k, v)); e.innerHTML = h; return e; };
const variableById = id => VARIABLES.find(v => v.id === id);

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
				ctrl.innerHTML = `<select data-var="${v.id}"><option value="pending">Pendiente de valoración</option><option value="yes">Sí</option><option value="no">No</option></select>`;
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
	$('#ageYears').value = form.ageYears ?? '';
	$('#overridePriority').value = form.override?.priority || '';
	$('#overrideMotive').value = form.override?.motive || '';
	$('#overrideJustification').value = form.override?.justification || '';
	$('#overrideReinforced').checked = form.override?.reinforced || false;
	document.querySelectorAll('#pathologyGroups input').forEach(i => { i.checked = (form.pathologyGroups || []).includes(i.value); });
	document.querySelectorAll('select[data-var]').forEach(s => { s.value = form.values?.[s.dataset.var] || 'pending'; });
}

function markDraft() {
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
	let r = calculate(form);
	try { r = applyOverride(r, form.override); $('#overrideError').textContent = ''; }
	catch (e) { $('#overrideError').textContent = e.message; }
	return r;
}

function update() {
	form.pseudoId = $('#pseudo').value.trim();
	form.hospital = $('#hospital').value.trim();
	form.pharmacist = $('#pharmacist').value.trim();
	form.ageYears = $('#ageYears').value === '' ? undefined : Number($('#ageYears').value);
	form.override = {
		priority: $('#overridePriority').value,
		justification: $('#overrideJustification').value.trim(),
		motive: $('#overrideMotive').value.trim(),
		reinforced: $('#overrideReinforced').checked
	};

	const base = calculate(form);
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
	$('#actions').innerHTML = renderActions(r.finalPriority) + `<p><strong>Periodicidad recomendada:</strong> ${PERIODICITY[r.finalPriority]}</p>`;
	window.currentResult = r;
	renderFinalPanel();
}

function renderActions(priority) {
	return Object.values(actionsFor(priority)).map(g => `<h3>${g.label}</h3><ul>${g.items.map(i => `<li>${i}</li>`).join('')}</ul>`).join('');
}

['pseudo', 'hospital', 'pharmacist', 'ageYears', 'overridePriority', 'overrideJustification', 'overrideMotive', 'overrideReinforced'].forEach(id => {
	setTimeout(() => { $('#' + id).oninput = () => { markDraft(); update(); }; $('#' + id).onchange = () => { markDraft(); update(); }; });
});

$('#save').onclick = () => { form = saveCase(form); renderSaved(); announce('Valoración guardada localmente.'); };
$('#exportJson').onclick = () => download('caso-pediatria.json', exportCase(form));
$('#exportCsv').onclick = () => download('detalle-pediatria.csv', toCSV(window.currentResult.details, form));
$('#summary').onclick = () => download('resumen-clinico-pediatria.txt', report());
$('#print').onclick = () => window.print();
$('#import').onchange = e => e.target.files[0].text().then(t => {
	try { form = importCase(t); render(); announce('Caso importado correctamente.'); }
	catch (err) { announce('JSON inválido o incompatible: ' + err.message); }
});
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
		return `<div class="proposal" data-proposal-index="${i}"><b>${label}</b>: ${x.status} — propuesta: ${proposalLabel} (certeza: ${x.certainty})<br><small>«…${x.fragment}…»</small><br><em>${x.rule}</em><br>` +
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
	const r = calculate(form);
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
	saveCase(form);
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
	panel.innerHTML = `
		<h2>Resultado de estratificación <span class="priority-badge">${rr.finalPriority}</span></h2>
		${form.status === 'provisional' ? '<p class="warning"><strong>Resultado provisional: existen variables clínicas pendientes de valoración.</strong></p>' : ''}
		${form.outdated ? '<p class="warning"><strong>Resultado pendiente de actualizar tras cambios en el formulario.</strong></p>' : ''}
		<dl>
			<dt>Identificador pseudonimizado</dt><dd>${form.pseudoId || 'sin especificar'}</dd>
			<dt>Hospital o centro sanitario</dt><dd>${form.hospital || ''}</dd>
			<dt>Farmacéutico responsable</dt><dd>${form.pharmacist || ''}</dd>
			<dt>Fecha y hora de finalización</dt><dd>${new Date(form.completedAt).toLocaleString('es-ES')}</dd>
			<dt>Grupo(s) de patología</dt><dd>${(form.pathologyGroups || []).map(id => PATHOLOGY_GROUPS.find(p => p[0] === id)?.[1]).filter(Boolean).join(', ') || 'No indicado'}</dd>
			<dt>Puntuación total</dt><dd>${rr.total}/${MAX_SCORE}</dd>
			<dt>Prioridad calculada</dt><dd>${rr.calculatedPriority}</dd>
			<dt>Criterio automático</dt><dd>${rr.automaticCause || 'No procede (sin criterios automáticos en el modelo pediátrico)'}</dd>
			<dt>Prioridad final</dt><dd>${rr.finalPriority}</dd>
			<dt>Modificación clínica manual</dt><dd>${rr.override?.priority ? `${rr.override.priority} — motivo: ${rr.override.motive || 'sin especificar'} — justificación: ${rr.override.justification}` : 'No aplicada'}</dd>
			<dt>Estado</dt><dd>${form.status === 'completed' ? 'Definitivo' : 'Provisional'}</dd>
			<dt>Variables</dt><dd>${VARIABLES.length - pending.length} completadas, ${pending.length} pendientes${pending.length ? ': ' + pending.map(d => d.variable.label).join(', ') : ''}</dd>
			<dt>Periodicidad</dt><dd>${PERIODICITY[rr.finalPriority]}</dd>
		</dl>
		<h3>Subtotales por bloque</h3>
		<ul>${Object.entries(rr.subtotals).map(([k, v]) => `<li>${DIMENSIONS[k].label}: ${v}/${DIMENSIONS[k].max}</li>`).join('')}</ul>
		<h3>Actuaciones farmacéuticas recomendadas</h3>
		${renderActions(rr.finalPriority)}
		<button type="button" id="panelSummary">Descargar resumen</button>
		<button type="button" id="panelPrint">Imprimir</button>`;
	$('#panelSummary').onclick = () => download('resumen-clinico-pediatria.txt', report());
	$('#panelPrint').onclick = () => window.print();
	if (focus) { panel.setAttribute('tabindex', '-1'); panel.scrollIntoView({ behavior: 'smooth' }); panel.focus(); announce('Resultado de estratificación generado.'); }
}

function clearValidation() { ['hospital', 'pharmacist'].forEach(id => $('#' + id).removeAttribute('aria-invalid')); $('#validation').textContent = ''; }
function showFieldError(id, msg) { $('#' + id).setAttribute('aria-invalid', 'true'); $('#validation').textContent = msg; $('#' + id).focus(); }
function announce(msg) { $('#live').textContent = msg; }

function renderSaved() {
	$('#saved').innerHTML = allCases().map(c => `<li>${c.pseudoId || c.id} — ${c.status || 'draft'} <button type="button" data-load="${c.id}">Cargar</button> <button type="button" data-del="${c.id}">Borrar</button></li>`).join('');
	document.querySelectorAll('[data-load]').forEach(b => b.onclick = () => { form = normalizeCase(allCases().find(c => c.id === b.dataset.load)); render(); });
	document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm('¿Borrar este caso?')) { deleteCase(b.dataset.del); renderSaved(); } });
}

function download(name, text) {
	const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })), download: name });
	a.click();
}

function report() {
	const r = window.currentResult;
	const pending = r.details.filter(d => d.pending);
	return `SIAF-CMO Pediatría
Identificador pseudonimizado: ${form.pseudoId || 'sin especificar'}
Hospital o centro sanitario: ${form.hospital || ''}
Farmacéutico responsable: ${form.pharmacist || ''}
Finalización: ${form.completedAt || 'No finalizada'}
Grupo(s) de patología: ${(form.pathologyGroups || []).map(id => PATHOLOGY_GROUPS.find(p => p[0] === id)?.[1]).filter(Boolean).join(', ') || 'No indicado'}
Puntuación: ${r.total}/${MAX_SCORE}
Prioridad calculada: ${r.calculatedPriority}
Criterio automático: ${r.automaticCause || 'No procede'}
Prioridad final: ${r.finalPriority}
Modificación clínica manual: ${r.override?.priority ? `${r.override.priority} (${r.override.motive || 'sin motivo'}) — ${r.override.justification}` : 'No aplicada'}
Estado: ${form.status === 'provisional' ? 'Resultado provisional: existen variables clínicas pendientes de valoración (' + pending.map(d => d.variable.label).join(', ') + ').' : (form.status || 'draft')}
Periodicidad: ${PERIODICITY[r.finalPriority]}

Actuaciones farmacéuticas recomendadas
${Object.values(actionsFor(r.finalPriority)).map(g => `${g.label}\n- ${g.items.join('\n- ')}`).join('\n\n')}`;
}

render();
