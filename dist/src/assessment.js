// Adaptador de SIAF-CMO Pediatría al informe único y al registro de actuaciones del núcleo CMO (src/cmo-ds/).
// No contiene reglas clínicas: el único motor es calculate()/applyOverride() de clinical.js (sin cambios).
import {VARIABLES, DIMENSIONS, PATHOLOGY_GROUPS, ACTIONS, MAX_SCORE, PERIODICITY, calculate, applyOverride, actionsFor} from './clinical.js';
import {INTERVENTION_STATUSES} from './cmo-ds/cmo-report.js';

export const APP_ID = 'cmo-pediatria';
export const TOOL_NAME = 'SIAF-CMO Pediatría';
export const SOURCE_DOCUMENT = 'SEFH, Adaptación del Modelo de Atención Farmacéutica CMO al Paciente Pediátrico';
export const priorityLabel = p => ({P1: 'Prioridad 1', P2: 'Prioridad 2', P3: 'Prioridad 3'})[p] || String(p);
export const VISIT_TYPES = {initial: 'Visita inicial', 'follow-up': 'Visita de seguimiento', final: 'Visita final'};
const str = (v, max) => String(v ?? '').trim().slice(0, max);
const IDS = new Set(VARIABLES.map(v => v.id));

/** Edad admisible (0–120 años); un valor negativo o no numérico queda pendiente en lugar de romper el cálculo. */
export function cleanAge(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 120 ? n : undefined;
}

/** Formulario saneado: solo variables del modelo con valores admitidos; lo demás queda pendiente. */
export function cleanForm(form = {}) {
  const values = {};
  for (const [id, v] of Object.entries(form.values && typeof form.values === 'object' ? form.values : {})) {
    if (IDS.has(id) && id !== 'age' && ['yes', 'no', 'pending'].includes(v)) values[id] = v;
  }
  const groups = new Set(PATHOLOGY_GROUPS.map(g => g[0]));
  const statuses = {};
  const valid = new Set(Object.entries(ACTIONS).flatMap(([g, x]) => x.items.map((_, i) => `${g}.${i}`)));
  for (const [id, s] of Object.entries(form.statuses && typeof form.statuses === 'object' ? form.statuses : {})) if (valid.has(id) && Object.hasOwn(INTERVENTION_STATUSES, s) && s !== 'recommended') statuses[id] = s;
  const o = form.override && typeof form.override === 'object' ? form.override : {};
  return {
    ...form, values, ageYears: cleanAge(form.ageYears),
    pathologyGroups: (Array.isArray(form.pathologyGroups) ? form.pathologyGroups : []).filter(g => groups.has(g)),
    pseudoId: str(form.pseudoId, 60), hospital: str(form.hospital, 200), pharmacist: str(form.pharmacist, 200),
    override: ['P1', 'P2', 'P3'].includes(o.priority) ? {priority: o.priority, motive: str(o.motive, 200), justification: str(o.justification, 2000), reinforced: o.reinforced === true} : {priority: '', motive: '', justification: '', reinforced: false},
    statuses, plan: {nextReview: /^\d{4}-\d{2}-\d{2}$/.test(form.plan?.nextReview || '') ? form.plan.nextReview : '', notes: str(form.plan?.notes, 2000)}
  };
}

/** Motor original + modificación profesional validada + información de flujo (pendientes y cota superior). */
export function evaluate(rawForm) {
  const form = cleanForm(rawForm);
  const base = calculate(form);
  let result = base, overrideError = '';
  try { result = applyOverride(base, form.override); } catch (e) { overrideError = e.message; }
  const pending = result.details.filter(d => d.pending);
  // Cota superior si las pendientes resultaran positivas: edad pendiente = máximo del tramo de edad (4); el resto, los puntos de cada variable.
  const maxTotal = result.total + pending.reduce((n, d) => n + (d.variable.type === 'age' ? 4 : d.variable.points), 0);
  return {form, result, base, pending, provisional: pending.length > 0, overrideError, maxPossible: maxTotal};
}

export const interventionCatalog = priority => Object.entries(actionsFor(priority)).flatMap(([group, g]) => g.items.map(label => ({id: `${group}.${ACTIONS[group].items.findIndex(i => i[1] === label)}`, group, groupLabel: g.label, label})));
export const interventionStatus = (form, id) => (Object.hasOwn(INTERVENTION_STATUSES, form.statuses?.[id]) ? form.statuses[id] : 'recommended');

export const needsByDimension = ev => Object.entries(DIMENSIONS).map(([key, dim]) => ({key, dim, confirmed: ev.result.details.filter(d => d.variable.dim === key && d.points > 0), potential: ev.result.details.filter(d => d.variable.dim === key && d.pending)}));

export function buildReportInput(rawForm, ev, {version = ''} = {}) {
  const form = ev.form, r = ev.result, cat = interventionCatalog(r.finalPriority);
  const by = status => cat.filter(a => interventionStatus(form, a.id) === status).map(a => ({group: a.groupLabel, label: a.label}));
  const warnings = [];
  if (ev.provisional) {
    warnings.push(`Resultado provisional: ${ev.pending.length} variable(s) pendiente(s) de valoración. Una variable pendiente no se ha considerado negativa: no puntúa hasta que se valore.`);
    warnings.push(`Si las pendientes resultaran positivas, la puntuación podría alcanzar hasta ${ev.maxPossible}/${MAX_SCORE} (cota superior).`);
  }
  if (r.override?.isReduction) warnings.push('La modificación profesional reduce la intensidad asistencial respecto a la prioridad calculada: justificación reforzada confirmada.');
  if (form.ageYears !== undefined && form.ageYears > 18) warnings.push('Edad fuera del rango pediátrico (>18 años): pendiente de validación humana; revisar derivación.');
  if (ev.overrideError) warnings.push(`Modificación no aplicada: ${ev.overrideError}`);
  const dimLabel = k => DIMENSIONS[k].label;
  return {
    title: 'Atención farmacéutica pediátrica — Modelo CMO', tool: {name: TOOL_NAME, version},
    model: {name: SOURCE_DOCUMENT, source: `Basado en el documento «${SOURCE_DOCUMENT}» (metodología CMO, MAPEX-SEFH).`},
    evaluationDate: form.completedAt || form.visitDate || '', status: form.completedAt && !ev.provisional ? 'final' : 'provisional',
    hospital: form.hospital, pharmacist: form.pharmacist, patientId: form.pseudoId,
    context: [
      {label: 'Tipo de visita', value: VISIT_TYPES[form.visitType] || ''}, {label: 'Fecha de la visita', value: form.visitDate || ''},
      {label: 'Grupo(s) de patología', value: form.pathologyGroups.map(id => PATHOLOGY_GROUPS.find(g => g[0] === id)?.[1]).filter(Boolean).join('; ')}
    ],
    stratification: {
      score: r.total, maxScore: MAX_SCORE, subtotals: Object.entries(r.subtotals).map(([k, v]) => ({label: dimLabel(k), points: v, max: DIMENSIONS[k].max})),
      calculatedLevel: priorityLabel(r.calculatedPriority), finalLevel: priorityLabel(r.finalPriority), levelCode: Number(String(r.finalPriority).slice(1)),
      rules: r.automaticCause ? [String(r.automaticCause)] : [],
      override: r.override?.priority ? {level: priorityLabel(r.override.priority), motive: r.override.motive || '', justification: r.override.justification} : null,
      pending: ev.pending.map(d => d.variable.label)
    },
    factors: r.details.filter(d => d.points > 0 && d.variable.dim !== 'treatment').map(d => ({dimension: dimLabel(d.variable.dim), label: d.variable.label, detail: d.response, points: d.points})),
    needs: {
      confirmed: r.details.filter(d => d.points > 0 && d.variable.dim === 'treatment').map(d => ({label: d.variable.label, detail: `${d.response} · ${d.points} p`})),
      potential: r.details.filter(d => d.pending && d.variable.dim === 'treatment').map(d => ({label: d.variable.label, detail: 'pendiente de valoración'}))
    },
    interventions: {done: by('done'), planned: by('planned'), recommended: by('recommended'), notApplicableCount: by('not_applicable').length},
    plan: {periodicity: PERIODICITY[r.finalPriority], nextReview: form.plan.nextReview, notes: form.plan.notes},
    warnings
  };
}

export function csvRows(ev) {
  const f = ev.form, r = ev.result;
  return [['hospital', 'farmaceutico', 'variable', 'respuesta', 'puntos'], ...r.details.map(d => [f.hospital, f.pharmacist, d.variable.label, d.response, d.points])];
}
