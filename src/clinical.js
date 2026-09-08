// Núcleo clínico de SIAF-CMO Pediatría.
// Fuente única: SEFH. "Adaptación del Modelo de Atención Farmacéutica CMO al Paciente Pediátrico" (2025).
// Toda variable, puntuación, umbral y actuación de este archivo procede de dicho documento.
// Ver SOURCE_MAPPING.md para la referencia página/tabla de cada regla y CLINICAL_RULES.md
// para las incertidumbres marcadas como PENDIENTE DE VALIDACIÓN HUMANA.

export const VERSION = '1.0.0';

export const DIMENSIONS = {
	demographic: { label: 'Variables demográficas', max: 5 },
	clinical: { label: 'Variables clínicas', max: 14 },
	treatment: { label: 'Variables farmacoterapéuticas', max: 27 },
	social: { label: 'Variables sociosanitarias', max: 11 }
};

// Grupos de patologías pediátricas elegibles para el modelo (Tabla 1, p.11).
// Dato descriptivo/de elegibilidad: NO puntúa.
export const PATHOLOGY_GROUPS = [
	['allergies', 'Alergias e intolerancias alimentarias'],
	['autoimmune', 'Autoinmunes sistémicas'],
	['cardiac', 'Cardiopatías'],
	['dermatologic', 'Dermatológicas'],
	['digestive', 'Digestivas'],
	['endocrine', 'Endocrinas'],
	['hematologic', 'Hematológicas'],
	['infectious', 'Infecciosas'],
	['immunodeficiency', 'Inmunodeficiencias (primarias y secundarias)'],
	['neurologic', 'Neurológicas'],
	['oncohematologic', 'Oncohematológicas'],
	['transplant', 'Pacientes trasplantados'],
	['raremetabolic', 'Raras metabólicas'],
	['renal', 'Renales'],
	['respiratory', 'Respiratorias']
];

const yn = (id, dim, label, points, help = '') => ({ id, dim, label, points, type: 'yesno', help });

// 20 ítems puntuables tabulados en las Tablas 2-5 (pp.12-14). El texto introductorio del
// documento habla de "18 variables"; el recuento literal de ítems con puntuación propia,
// necesario para que la suma cuadre exactamente con los máximos declarados por bloque
// (5+14+27+11=57), asciende a 20. Discrepancia documentada en CLINICAL_RULES.md como
// PENDIENTE DE VALIDACIÓN HUMANA; se implementan fielmente los ítems tal como están tabulados.
export const VARIABLES = [
	{
		id: 'age', dim: 'demographic', label: 'Edad', type: 'age',
		help: 'Neonatos/lactantes (hasta 2 años): 4. Preescolar (3-5 años): 2. Edad escolar (6-11 años): 1. Adolescente (12-18 años): 3.'
	},
	yn('nutritionalStatus', 'demographic', 'Peso/Estado nutricional', 1,
		'Paciente con obesidad/desnutrición según talla, peso e IMC para su rango de edad. La determinación (percentiles o IMC) depende de la práctica habitual de cada hospital.'),

	yn('hospitalUrgency', 'clinical', 'Ingresos/urgencias en el último año por patología', 3,
		'≥2 hospitalizaciones en los 12 meses previos y/o ≥3 visitas a Urgencias en el último año, siempre que el uso de servicios sanitarios esté relacionado con un mal control de la patología/tratamiento.'),
	yn('externalDevices', 'clinical', 'Paciente con dispositivos externos', 2,
		'Dispositivos que condicionan la administración del fármaco: respiradores, ostomías y sondas.'),
	yn('complexChronic', 'clinical', 'Paciente crónico complejo', 4,
		'Afectación de 2 o más sistemas, patología de al menos 12 meses de duración, dependiente de tecnología para la administración del fármaco (bomba de infusión continua, sondas, vías centrales, dispositivos de inhalación, ostomías, etc.) durante al menos 6 meses.'),
	yn('immunosuppressant', 'clinical', 'Paciente con tratamiento inmunosupresor/inmunomodulador', 3),
	yn('multimorbidity', 'clinical', 'Pluripatología/comorbilidades', 2,
		'2 o más patologías/comorbilidades con tratamiento activo que no cumplan el criterio de paciente crónico complejo.'),

	yn('regimenChanges', 'treatment', 'Cambios en el régimen regular de la medicación dispensada', 3,
		'Cambios en la pauta de medicación dispensada desde la última visita de Atención Farmacéutica.'),
	yn('regimenComplexity', 'treatment', 'Complejidad del régimen farmacológico', 4,
		'Pautas complejas de administración: dosis diferentes a lo largo del día, pautas en ascenso o descenso, dosis diferentes en distintos días de la semana, pautas alternas, etc.'),
	yn('dispensingConditions', 'treatment', 'Condiciones de dispensación', 3,
		'Al menos dos fármacos y/o soporte nutricional con condiciones de prescripción-dispensación distintas: medicamento extranjero, fórmula magistral, visado de inspección/homologación, estupefaciente.'),
	yn('highRiskMeds', 'treatment', 'Medicamentos de alto riesgo en neonatos y pediatría y/o de estrecho margen terapéutico y/o altamente tóxicos', 4,
		'Listado ISMP español de medicamentos de alto riesgo (externo, Ministerio de Sanidad) y/o fármacos de estrecho margen terapéutico y/o medicamentos altamente tóxicos en la infancia. No se tienen en cuenta los "si precisa" (p.ej. paracetamol, antihistamínicos).'),
	yn('domicileHandling', 'treatment', 'Necesidad de manipular la medicación en el domicilio', 3,
		'Ausencia de presentación farmacéutica adecuada al paciente y/o necesidad de individualizar la dosis en el domicilio, cuando ésta no se ajusta a la presentación comercializada. Ejemplos: partir/triturar comprimidos, abrir cápsulas, disolver y coger parte proporcional.'),
	yn('hazardousMeds', 'treatment', 'Paciente en tratamiento con medicamentos peligrosos', 1,
		'Listado externo de medicamentos peligrosos (ver listado del centro/Ministerio de Sanidad). PENDIENTE DE VALIDACIÓN HUMANA: en el documento origen este ítem aparece sin cabecera propia dentro de la tabla de variables farmacoterapéuticas; se trata como ítem puntuable independiente porque su punto es necesario para alcanzar el máximo de bloque declarado (27).'),
	yn('polypharmacy', 'treatment', 'Polimedicación', 3,
		'Paciente que toma ≥5 principios activos de forma concurrente y crónica. Se tiene en cuenta lo que el paciente realmente tiene prescrito y está tomando.'),
	yn('adherenceSuspicion', 'treatment', 'Sospecha o falta de adherencia', 4,
		'Sospecha de falta de adherencia y/o persistencia subóptima (p.ej. registro de dispensación, información farmacocinética, entrevista, cuestionario validado en cada centro).'),
	yn('adverseEffects', 'treatment', 'Sospecha o evidencia de efectos adversos', 2,
		'Efectos adversos reportados por el paciente y confirmados o sospechados como relacionados con el fármaco.'),

	yn('schoolMedication', 'social', 'Administración de medicación en horario escolar', 2,
		'Ausencia de enfermera/médico en el centro escolar.'),
	yn('languageBarrier', 'social', 'Barrera idiomática y/o analfabetismo', 4,
		'Dificultad en la comunicación entre el paciente/familiar/cuidador y el profesional asistencial, en el ámbito hospitalario, por barrera idiomática y/o dificultad de comprensión.'),
	yn('familyEnvironment', 'social', 'Entorno familiar y situación socioeconómica del paciente', 3,
		'Situación familiar difícil o vulnerabilidad social que pueda condicionar el tratamiento.'),
	yn('largeFamily', 'social', 'Familia numerosa', 2,
		'Dos ascendientes con tres o más hijos (comunes o no) o familia monoparental con dos hijos.')
];

// Umbrales de prioridad (Figura 2, p.16). Máximo alcanzable: 57 puntos.
// Puntos de corte declarados: 17 (entrada a Prioridad 2) y 31 (entrada a Prioridad 1).
export const MAX_SCORE = 57;
export const THRESHOLDS = { p2: 17, p1: 31 };

export function scorePriority(total) {
	if (total >= THRESHOLDS.p1) return 'P1';
	if (total >= THRESHOLDS.p2) return 'P2';
	return 'P3';
}

// No se han identificado criterios de prioridad automática en el modelo pediátrico SEFH
// (revisada íntegramente la sección Capacidad, pp.9-21: no existe ningún equivalente a las
// excepciones de embarazo/edad de otros modelos CMO). Se mantiene la función separada por
// auditabilidad y para no mezclar prioridad automática con puntuación.
export function automaticPriority(_form) {
	return null;
}

function ageBracket(years) {
	if (!Number.isFinite(years) || years < 0) return null;
	if (years <= 2) return { points: 4, response: 'Neonato/lactante (hasta 2 años)' };
	if (years <= 5) return { points: 2, response: 'Preescolar (3-5 años)' };
	if (years <= 11) return { points: 1, response: 'Edad escolar (6-11 años)' };
	if (years <= 18) return { points: 3, response: 'Adolescente (12-18 años)' };
	return { points: 0, response: 'Fuera de rango pediátrico (>18 años): PENDIENTE DE VALIDACIÓN HUMANA, revisar derivación.' };
}

export function scoreVariable(v, form) {
	const val = form.values?.[v.id];
	if (v.type === 'age') {
		const years = Number(form.ageYears);
		if (form.ageYears === undefined || form.ageYears === '' || !Number.isFinite(years)) {
			return { pending: true, points: 0, response: 'Pendiente' };
		}
		const b = ageBracket(years);
		return { points: b.points, response: b.response };
	}
	if (val === undefined || val === '' || val === 'pending') {
		return { pending: true, points: 0, response: 'Pendiente' };
	}
	return { points: val === 'yes' ? v.points : 0, response: val === 'yes' ? 'Sí' : 'No' };
}

export function calculate(form) {
	const details = VARIABLES.map(v => ({ variable: v, ...scoreVariable(v, form) }));
	const pending = details.some(d => d.pending);
	const subtotals = Object.fromEntries(Object.keys(DIMENSIONS).map(k => [k, 0]));
	details.forEach(d => { subtotals[d.variable.dim] += d.points; });
	const total = Object.values(subtotals).reduce((a, b) => a + b, 0);
	const auto = automaticPriority(form);
	const calculatedPriority = scorePriority(total);
	// finalPriority parte SIEMPRE de la prioridad automática/calculada, nunca del override en
	// bruto: la única vía para que una modificación clínica cambie finalPriority es pasar por
	// applyOverride(), que valida la justificación (y, si reduce intensidad, la exige reforzada).
	// Aplicar aquí form.override.priority sin validar permitiría burlar esa exigencia.
	return {
		details,
		subtotals,
		total,
		pending,
		automaticCause: auto,
		calculatedPriority,
		finalPriority: auto || calculatedPriority,
		override: form.override || null
	};
}

// Actuaciones de Atención Farmacéutica (Tablas 6, 7 y 8, pp.17-20).
// Son EXPLÍCITAMENTE acumulativas (texto p.15/p.16): P1 incluye P2 y P3; P2 incluye P3.
// Cada ítem se etiqueta con el nivel en el que aparece por primera vez en el documento.
export const ACTIONS = {
	sft: {
		label: 'Seguimiento farmacoterapéutico',
		items: [
			['P3', 'Revisión y validación del tratamiento (seguridad, efectividad, adecuación según parámetros clínicos).'],
			['P3', 'Conciliación y revisión de medicación concomitante (automedicación, medicina alternativa, etc.) y monitorización de interacciones, ofreciendo al médico una alternativa si fuese necesario.'],
			['P3', 'Seguimiento de la adherencia para garantizar el cumplimiento terapéutico, identificando dificultades del paciente/cuidador y adaptando las estrategias a los distintos grupos de edad.'],
			['P2', 'Telefarmacia: uso de tecnologías (dispositivos móviles, televisión, eHealth, mHealth, etc.) para monitorización a distancia entre visitas.'],
			['P2', 'Desarrollo de Planes de Acción entre niveles asistenciales: contacto interniveles (farmacia comunitaria, atención primaria, sociosanitario), implantación de Sistemas Personalizados de Dispensación y planificaciones horarias al alta, y seguimiento de la correcta utilización de dispositivos de administración.'],
			['P2', 'Monitorización y toma de decisiones multidisciplinares en función de los PROs y PREMs utilizados para el seguimiento.'],
			['P1', 'Identificación de la persona responsable de la gestión de la medicación del paciente, sobre todo en caso de deterioro cognitivo o funcional.'],
			['P1', 'Planificación de la próxima visita a la Unidad en coordinación con el equipo asistencial para garantizar un estrecho seguimiento multidisciplinar.'],
			['P1', 'Involucración del paciente/cuidador en el Plan Farmacoterapéutico previsto, compartiendo la evolución de sus objetivos y acordando acciones.'],
			['P1', 'Equidad sanitaria: superar barreras relacionadas con el idioma, la alfabetización digital, la discapacidad y el acceso a la tecnología.']
		]
	},
	edu: {
		label: 'Formación y educación al paciente/cuidador',
		items: [
			['P3', 'Desarrollo de información adecuada a la edad, escrita y/o verbal: patología, importancia del tratamiento, cumplimiento terapéutico y prevención.'],
			['P3', 'Garantizar la comprensión de la medicación y su administración por parte de los cuidadores, para evitar errores en la administración.'],
			['P3', 'Promoción de la adherencia y corresponsabilidad en el resultado del tratamiento.'],
			['P3', 'Utilización de herramientas para la autogestión: listado de web y apps fiables disponibles.'],
			['P3', 'Asesoramiento sobre los efectos adversos antes y durante el tratamiento.'],
			['P3', 'Formación para mejorar las habilidades y la autoeficacia en el uso de la medicación, animando a los niños a preguntar sobre los medicamentos (papel activo del niño).'],
			['P3', 'Educación sanitaria general preventiva (vida saludable, dieta, cumplimiento, responsabilidad) a través de internet: web del servicio de farmacia, SEFH, etc.'],
			['P2', 'Información y apoyo sobre la tramitación administrativa de los tratamientos, cuando sea necesario.'],
			['P1', 'Elaboración de material personalizado para el paciente y/o cuidador (hoja de medicación, diario o similar), en papel o formato electrónico.'],
			['P1', 'Formación y educación a familiares y/o cuidadores para el correcto seguimiento en pacientes de mayor complejidad, incluido el empleo de dispositivos externos si procede.'],
			['P1', 'Fomentar la necesidad de comunicar cualquier proceso nuevo del paciente (nueva enfermedad, nuevo medicamento, problema social, etc.).']
		]
	},
	coord: {
		label: 'Coordinación con el equipo asistencial',
		items: [
			['P3', 'Unificación de criterios y mensajes entre los diferentes profesionales sanitarios del equipo multidisciplinar (comunicación bidireccional).'],
			['P3', 'Planificación de la próxima visita al Servicio de Farmacia en coordinación con su médico o con el departamento de citaciones.'],
			['P3', 'Desarrollo de programas orientados a cumplir objetivos farmacoterapéuticos y colaboración multidisciplinar para el control de la adherencia.'],
			['P3', 'Integración de la información e intervenciones en la Historia Clínica Electrónica (HCE) del paciente.'],
			['P3', 'Fomento del trabajo en equipo con reparto de responsabilidades, evitando la duplicidad de intervenciones y facilitando la transición entre niveles asistenciales.'],
			['P2', 'Coordinación con oficinas de farmacia, médicos y profesionales farmacéuticos de atención primaria, enfermería y centros de asistencia social, psicología, psiquiatría y Servicios Sociales.'],
			['P2', 'Desarrollo de Programas de Abordaje de Pacientes Crónicos Pediátricos junto con las unidades clínicas (estrategias de desprescripción, simplificación, etc.).'],
			['P1', 'Elaboración de informes periódicos para el equipo multidisciplinar (telefónicos, registro en HCE o en sesiones multidisciplinares) y establecimiento de algoritmos de actuación.']
		]
	}
};

export function actionsFor(priority) {
	const levels = priority === 'P1' ? ['P3', 'P2', 'P1'] : priority === 'P2' ? ['P3', 'P2'] : ['P3'];
	return Object.fromEntries(Object.entries(ACTIONS).map(([k, g]) => [
		k,
		{ label: g.label, items: g.items.filter(i => levels.includes(i[0])).map(i => i[1]) }
	]));
}

// Periodicidad recomendada de aplicación del modelo (p.16).
export const PERIODICITY = {
	P1: 'Valoración cada 3-6 meses.',
	P2: 'Valoración anual, salvo decisión del profesional o cambio en el tratamiento de la enfermedad.',
	P3: 'Cuando se detecte la necesidad, por decisión del profesional o cambio en el tratamiento de la enfermedad.'
};

export function validateClinicalValue(v, value) {
	if (!v) return false;
	if (value === 'pending') return true;
	if (v.type === 'age') return value === 'set';
	return ['yes', 'no'].includes(value);
}

const priorityRank = { P3: 0, P2: 1, P1: 2 };

// Modificación clínica manual (justificación reforzada si se reduce la intensidad asistencial
// respecto a la prioridad calculada/automática). El resultado original nunca se oculta:
// calculatedPriority y automaticCause permanecen siempre visibles en el objeto devuelto por calculate().
export function applyOverride(result, override) {
	if (!override?.priority) return result;
	const basePriority = result.automaticCause || result.calculatedPriority;
	const isReduction = priorityRank[override.priority] < priorityRank[basePriority];
	const justification = (override.justification || '').trim();
	if (!justification || justification.length < 12) {
		throw new Error('La modificación clínica requiere justificación explícita (mínimo 12 caracteres).');
	}
	if (isReduction && (justification.length < 40 || !override.reinforced)) {
		throw new Error('Reducir la intensidad asistencial respecto a la prioridad calculada exige justificación reforzada (mínimo 40 caracteres) y confirmación explícita.');
	}
	return {
		...result,
		finalPriority: override.priority,
		override: { ...override, justification, date: override.date || new Date().toISOString(), isReduction }
	};
}

export function normalizeCase(form = {}) {
	return {
		...form,
		values: { ...(form.values || {}) },
		pathologyGroups: [...(form.pathologyGroups || [])],
		pseudoId: (form.pseudoId ?? '').trim?.() ?? '',
		hospital: (form.hospital ?? '').trim?.() ?? '',
		pharmacist: (form.pharmacist ?? '').trim?.() ?? '',
		status: form.status || 'draft',
		completedAt: form.completedAt || null,
		schemaVersion: form.schemaVersion || 1
	};
}

export function finalizeCase(form, status = 'completed') {
	return { ...normalizeCase(form), status, completedAt: new Date().toISOString(), outdated: false };
}

export function exportCase(form) {
	return JSON.stringify({ schema: 'siaf-cmo-pediatria-v1', version: VERSION, form: normalizeCase(form) }, null, 2);
}

export function importCase(json) {
	const d = JSON.parse(json);
	if (d.schema !== 'siaf-cmo-pediatria-v1' || !d.form) throw new Error('JSON incompatible con SIAF-CMO Pediatría.');
	return normalizeCase(d.form);
}

// Contenido orientativo (NO puntuable) del pilar Motivación. Fuente: SEFH, capítulo
// "Motivación" (pp.22-37). Ver SOURCE_MAPPING.md para el detalle página a página.
export const MOTIVATION_GUIDANCE = [
	{
		title: 'Comunicación según etapa de desarrollo (Tabla 10, pp.26-27)',
		items: [
			'Prelingüística (0-18 meses): el bebé se manifiesta por el llanto; adaptar la presentación farmacéutica para facilitar la administración y mejorar la seguridad.',
			'Preescolar (18 meses-5 años): desarrollo lingüístico; puede vivir la enfermedad como castigo (pensamiento mágico); explicar cada etapa del tratamiento, apoyándose en el juego.',
			'Escolar (7-13 años): mayor colaboración; comienzan a tomar pequeñas decisiones que deben tenerse en cuenta; fomentar la comunicación intrafamiliar fluida.',
			'Preadolescencia y adolescencia (13-18 años): pensamiento formal; atender el impacto en la autoimagen y la autoestima; favorecer el protagonismo del adolescente sobre su salud.'
		]
	},
	{
		title: 'Principios básicos de comunicación farmacéutico-niño-padre/tutor (Tabla 9, p.23)',
		items: [
			'El niño quiere saber: el profesional farmacéutico debe comunicarse directamente con él sobre el uso de medicamentos.',
			'Debe motivarse el interés del niño sobre la farmacoterapia.',
			'Negociar una transferencia gradual de la responsabilidad del uso del medicamento, respetando el papel de los padres y la capacidad del niño.',
			'La educación tendrá en cuenta tanto el deseo del niño por saber como lo que el profesional considera que debe conocer.'
		]
	},
	{
		title: 'Participación del niño/adolescente en la toma de decisiones según edad (Tabla 14, p.35)',
		items: [
			'Menores de 10 años: incluir en la toma de decisiones aunque no puedan prestar consentimiento; adecuar el lenguaje a su comprensión; tratar previamente con los cuidadores el grado de responsabilidad del menor.',
			'Adolescentes (12-16 años): su opinión debe tenerse en cuenta, aunque la última palabra corresponda al cuidador.',
			'Adultos jóvenes (16-18 años): responsabilidad creciente en la decisión; el farmacéutico acompaña como consejero ante las dudas que surjan.',
			'Marco legal de referencia citado en el documento: "menor maduro" a partir de los 16 años (mayoría de edad sanitaria), Ley 41/2002 y modificación por Ley 26/2015 para situaciones de grave riesgo vital.'
		]
	},
	{
		title: 'Elementos para la toma de decisiones conjunta (Tabla 15, p.35)',
		items: [
			'Presentar las opciones de forma balanceada (ventajas/desventajas), sin actitud paternalista.',
			'Adecuar el lenguaje al nivel cognitivo del paciente.',
			'Aproximación triádica: involucrar activamente a los cuidadores preguntando su opinión sobre la decisión tomada.'
		]
	},
	{
		title: 'Participación del cuidador y experiencia farmacoterapéutica (Fase I y II de la entrevista motivacional, pp.29-34)',
		items: [
			'Explorar experiencia farmacoterapéutica, creencias y actitudes del paciente y del cuidador antes de plantear objetivos.',
			'Usar herramientas visuales/escalas de comprensión adaptadas a la edad para facilitar que el niño exprese su experiencia (Tabla 13, p.33).',
			'Establecer y planificar Objetivos Farmacoterapéuticos (OFT) de forma compartida entre paciente, cuidador y farmacéutico, revisando su cumplimiento en visitas sucesivas (Figura 1, p.6-7).'
		]
	}
];

// Contenido orientativo (NO puntuable) del pilar Oportunidad. Fuente: SEFH, capítulo
// "Oportunidad" (pp.38-54). Ver SOURCE_MAPPING.md.
export const OPPORTUNITY_GUIDANCE = [
	{
		title: 'Atención farmacéutica dual: presencial y telemática (pp.38-39)',
		items: [
			'La presencialidad es prioritaria en: inicio del tratamiento, evaluación de reacciones adversas graves y ajustes terapéuticos complejos.',
			'El seguimiento telemático es adecuado, una vez establecido el plan terapéutico, para monitorizar adherencia, errores de administración y efectos adversos menores.',
			'Ventajas del modelo dual: mayor accesibilidad (especialmente en zonas rurales o con barreras de transporte), optimización del tiempo y seguimiento más proactivo (Tabla 16, p.39).',
			'Retos del modelo dual: accesibilidad tecnológica equitativa, alfabetización digital de familias y cuidadores, e integración segura de los sistemas de telefarmacia (Tabla 16, p.39).'
		]
	},
	{
		title: 'Ámbitos de aplicación de la telefarmacia (Figura 4, p.40)',
		items: [
			'Seguimiento farmacoterapéutico a distancia.',
			'Formación e información a los pacientes y cuidadores.',
			'Coordinación con el equipo asistencial.',
			'Dispensación y entrega informada de medicamentos a distancia.'
		]
	},
	{
		title: 'Oportunidades de la telefarmacia en pediatría (Figura 5, p.41)',
		items: [
			'Favorecer la implicación y el empoderamiento del paciente y los cuidadores (autocuidado, papel activo).',
			'Promover la continuidad asistencial mediante un seguimiento más estrecho.',
			'Reducir desplazamientos, costes y tiempo para el paciente y la familia.',
			'Favorecer la coordinación multidisciplinar entre profesionales sanitarios.',
			'Optimizar la capacidad asistencial y la gestión de recursos.'
		]
	},
	{
		title: 'Coordinación con cuidadores y entorno',
		items: [
			'La atención farmacéutica pediátrica es "dual" también en su destinatario: paciente y cuidador, con necesidades y preferencias que pueden diferir (p.38).',
			'En pacientes de mayor complejidad, priorizar canales de coordinación estables con cuidadores y con el resto del equipo asistencial (ver Actuaciones de coordinación, Tablas 6-8).'
		]
	}
];

export function toCSV(rows, form = {}) {
	const f = normalizeCase(form);
	const header = 'Hospital o centro sanitario;Farmacéutico responsable;Variable;Respuesta;Puntos';
	const lines = rows.map(r => `"${f.hospital}";"${f.pharmacist}";"${r.variable.label}";"${r.response}";${r.points}`);
	return [header, ...lines].join('\n');
}
