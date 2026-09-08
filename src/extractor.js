// Analizador local de texto clínico (preestratificación automática local).
// 100% determinista, basado en expresiones regulares y palabras clave, sin IA generativa,
// sin llamadas de red de ningún tipo y sin envío ni almacenamiento del texto pegado.
// NUNCA modifica variables automáticamente: sólo propone; la incorporación exige
// confirmación humana explícita (ver app.js, setClinicalVariable).
import { VARIABLES, scoreVariable } from './clinical.js';

export const NETWORK_FREE = true;

// Detección de posibles identificadores antes de analizar el texto. Sólo advierte: nunca
// bloquea, transmite ni almacena el texto.
const IDENTIFIER_PATTERNS = [
	['DNI/NIE', /\b(\d{8}[A-Za-z]|[XYZxyz]\d{7}[A-Za-z])\b/g],
	['Email', /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g],
	['Teléfono', /\b(?:\+?34[\s-]?)?[6789]\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g],
	['Fecha completa', /\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b/g],
	['Posible NHC (cadena numérica larga)', /\b\d{6,12}\b/g],
	['Patrón "Paciente: Nombre"', /paciente\s*[:]\s*[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}/gi]
];

export function detectIdentifiers(text) {
	const found = [];
	for (const [type, re] of IDENTIFIER_PATTERNS) {
		const matches = text.match(re);
		if (matches?.length) found.push({ type, count: matches.length, sample: matches[0] });
	}
	return found;
}

const norm = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const NEG = /\b(no|niega|sin|ausencia de|descarta)\b\s+.{0,40}/;
const UNCERTAIN_BASE = /(posible|probable|dudoso|antecedentes familiares|a valorar|pendiente de confirmar)/;
// "sospecha" indica incertidumbre genérica, salvo en las dos variables cuyo propio criterio
// oficial se denomina "sospecha de..." (Tabla 4, p.13): ahí "sospecha" ES el criterio positivo,
// no un motivo para rebajar la propuesta a "dudoso".
const SUSPICION_IS_CRITERION = new Set(['adherenceSuspicion', 'adverseEffects']);
const UNCERTAIN_WITH_SUSPICION = /(sospecha|posible|probable|dudoso|antecedentes familiares|a valorar|pendiente de confirmar)/;

const RULES = {
	hospitalUrgency: /(ingreso|hospitalizacion|urgencias).{0,40}(ultimo año|12 meses|este año)|(2|dos|3|tres).{0,10}(ingresos|urgencias)/,
	externalDevices: /(sonda|gastrostomia|traqueotomia|ostomia|respirador|ventilacion mecanica domiciliaria)/,
	complexChronic: /(paciente cronico complejo|bomba de infusion continua|via central|dependiente de tecnologia)/,
	immunosuppressant: /(inmunosupresor|inmunomodulador|tratamiento biologico)/,
	multimorbidity: /(pluripatologia|comorbilidad(es)?|dos o mas patologias)/,
	regimenChanges: /(cambio de (dosis|pauta|tratamiento)|modificacion de la pauta)/,
	regimenComplexity: /(pauta compleja|dosis ascendente|dosis descendente|pauta alterna|pauta en ascenso|pauta en descenso)/,
	dispensingConditions: /(formula magistral|medicamento extranjero|estupefaciente|visado de inspeccion)/,
	highRiskMeds: /(alto riesgo|ismp|estrecho margen terapeutico|altamente toxico)/,
	domicileHandling: /(triturar|abrir capsulas|disolver y coger parte proporcional|individualizar la dosis)/,
	hazardousMeds: /(medicamento(s)? peligroso(s)?|citotoxico)/,
	polypharmacy: /(polimedicacion|[5-9]\s+principios activos|1\d\s+principios activos)/,
	adherenceSuspicion: /(mala adherencia|no adherente|incumplimiento terapeutico|falta de adherencia|persistencia suboptima)/,
	adverseEffects: /(efecto(s)? adverso(s)?|reaccion(es)? adversa(s)?)/,
	schoolMedication: /(horario escolar|en el colegio|en el centro escolar)/,
	languageBarrier: /(barrera idiomatica|no habla español|analfabet)/,
	familyEnvironment: /(vulnerabilidad social|situacion socioeconomica desfavorable|entorno familiar dificil)/,
	largeFamily: /(familia numerosa)/,
	nutritionalStatus: /(obesidad|desnutricion|percentil)/,
	age: /\b(\d{1,2})\s*(anos|año|años)\b|\b(\d{1,2})\s*meses\b/
};

export function prestratify(text) {
	const t = norm(text);
	const out = [];
	for (const v of VARIABLES) {
		const re = RULES[v.id];
		if (!re) continue;
		const m = re.exec(t);
		let status = 'no_mencionado', proposal = 'pending', certainty = 'baja', fragment = '', rule = 'Sin mención literal', years;
		if (m) {
			fragment = text.slice(Math.max(0, m.index - 35), m.index + m[0].length + 35).trim();
			const context = t.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40);
			if (v.id === 'age') {
				const yearsMatch = m[1];
				const monthsMatch = m[3];
				years = yearsMatch ? Number(yearsMatch) : monthsMatch ? Number(monthsMatch) / 12 : undefined;
				status = 'detectado'; proposal = 'set'; certainty = 'alta'; rule = 'Edad detectada en años/meses';
			} else if (NEG.test(t.slice(Math.max(0, m.index - 20), m.index + m[0].length + 5))) {
				status = 'ausencia_explicita'; proposal = 'no'; certainty = 'media'; rule = 'Negación próxima al criterio';
			} else if ((SUSPICION_IS_CRITERION.has(v.id) ? UNCERTAIN_BASE : UNCERTAIN_WITH_SUSPICION).test(context)) {
				status = 'dudoso'; rule = 'Término detectado con incertidumbre explícita';
			} else {
				status = 'detectado'; proposal = 'yes'; certainty = 'media'; rule = 'Coincidencia de patrón determinista pediátrico';
			}
		}
		out.push({
			variableId: v.id,
			status,
			proposal,
			certainty,
			fragment,
			rule,
			years,
			provisionalPoints: v.type !== 'age' && proposal === 'yes' ? scoreVariable(v, { values: { [v.id]: 'yes' } }).points : 0
		});
	}
	return out;
}
