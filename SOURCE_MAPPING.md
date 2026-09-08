# Mapeo a la fuente — SIAF-CMO Pediatría

Fuente primaria: SEFH. *Adaptación del Modelo de Atención Farmacéutica CMO al Paciente
Pediátrico* (2025). Paginación referida a la numeración impresa del documento (pie de página),
verificada sobre el PDF de 64 páginas (ISBN 978-84-09-68510-3).

## Variables y puntuación (`src/clinical.js` → `VARIABLES`)

| id interno | Nombre clínico | Página/Tabla | Regla implementada |
|---|---|---|---|
| `age` | Edad | p.12, Tabla 2 | Categórica: 0-2a→4, 3-5a→2, 6-11a→1, 12-18a→3 |
| `nutritionalStatus` | Peso/Estado nutricional | p.12, Tabla 2 | Sí→1, No→0 (criterio de percentil/IMC no unificado; PENDIENTE DE VALIDACIÓN HUMANA, ver CLINICAL_RULES.md) |
| `hospitalUrgency` | Ingresos/urgencias en el último año por patología | p.12, Tabla 3 | Sí→3, No→0 |
| `externalDevices` | Paciente con dispositivos externos | p.12, Tabla 3 | Sí→2, No→0 |
| `complexChronic` | Paciente crónico complejo | p.12, Tabla 3 | Sí→4, No→0 |
| `immunosuppressant` | Paciente con tratamiento inmunosupresor/inmunomodulador | p.12, Tabla 3 | Sí→3, No→0 |
| `multimorbidity` | Pluripatología/comorbilidades | p.12, Tabla 3 | Sí→2, No→0 |
| `regimenChanges` | Cambios en el régimen regular de la medicación dispensada | p.13, Tabla 4 | Sí→3, No→0 |
| `regimenComplexity` | Complejidad del régimen farmacológico | p.13, Tabla 4 | Sí→4, No→0 |
| `dispensingConditions` | Condiciones de dispensación | p.13, Tabla 4 | Sí→3, No→0 |
| `highRiskMeds` | Medicamentos de alto riesgo/estrecho margen/tóxicos | p.13, Tabla 4 | Sí→4, No→0. Remite a listado ISMP externo (no reproducido) |
| `domicileHandling` | Necesidad de manipular la medicación en el domicilio | p.13, Tabla 4 | Sí→3, No→0 |
| `hazardousMeds` | Paciente en tratamiento con medicamentos peligrosos | p.13, Tabla 4 | Sí→1, No→0. Ítem sin cabecera propia en la fuente; ver PENDIENTE DE VALIDACIÓN HUMANA en CLINICAL_RULES.md |
| `polypharmacy` | Polimedicación | p.13, Tabla 4 | Sí→3, No→0 (≥5 principios activos crónicos concurrentes) |
| `adherenceSuspicion` | Sospecha o falta de adherencia | p.13, Tabla 4 | Sí→4, No→0 |
| `adverseEffects` | Sospecha o evidencia de efectos adversos | p.13, Tabla 4 | Sí→2, No→0 |
| `schoolMedication` | Administración de medicación en horario escolar | p.14, Tabla 5 | Sí→2, No→0 |
| `languageBarrier` | Barrera idiomática y/o analfabetismo | p.14, Tabla 5 | Sí→4, No→0 |
| `familyEnvironment` | Entorno familiar y situación socioeconómica del paciente | p.14, Tabla 5 | Sí→3, No→0 |
| `largeFamily` | Familia numerosa | p.14, Tabla 5 | Sí→2, No→0 |

Nota: la Tabla 5 (p.14) está titulada en el documento origen *"...para la medición del riesgo
global del paciente con patologías cardiovasculares"*, un evidente arrastre editorial de la
plantilla del modelo CMO cardiovascular. El contenido de la tabla (medicación escolar, barrera
idiomática, entorno familiar, familia numerosa) es inequívocamente pediátrico y coincide con el
resto del capítulo; se ha tratado como error tipográfico de la fuente, no como una variable a
extrapolar del modelo cardiovascular.

Máximos de bloque: demográficas 5 (p.12), clínicas 14 (p.13), farmacoterapéuticas 27 (p.14),
sociosanitarias 11 (p.14). Máximo global 57 (p.15).

## Patologías de elegibilidad (`PATHOLOGY_GROUPS`)
p.11, Tabla 1. Dato descriptivo, no puntuable.

## Umbrales y prioridad (`THRESHOLDS`, `scorePriority`)
p.15-16, texto y Figura 2. Puntos de corte: 17 (entrada P2), 31 (entrada P1). Distribución del
pretest: P3 62%, P2 30%, P1 8% (n=205, 6 hospitales, mayo-junio 2024).

## Ausencia de criterios automáticos (`automaticPriority`)
Revisión íntegra de pp.9-21 (secciones I-V del capítulo Capacidad). No se ha localizado ningún
criterio de prioridad automática.

## Actuaciones (`ACTIONS`, `actionsFor`)
- Seguimiento farmacoterapéutico, Formación/educación y Coordinación: pp.17-20, Tablas 6
  (Prioridad 3), 7 (Prioridad 2) y 8 (Prioridad 1).
- Acumulatividad explícita (P1⊇P2⊇P3): texto p.15 y p.16.
- Periodicidad: p.16.

## Contenido de Motivación (`MOTIVATION_GUIDANCE`)
- Comunicación por etapa de desarrollo: p.26-27, Tabla 10.
- Principios básicos de comunicación farmacéutico-niño-padre/tutor: p.23, Tabla 9.
- Participación en decisiones según edad: p.35, Tabla 14.
- Elementos de decisión conjunta: p.35, Tabla 15.
- Escala de comprensión / experiencia farmacoterapéutica: p.33, Tabla 13; Fases I-II de la
  entrevista motivacional, pp.29-34.

## Contenido de Oportunidad (`OPPORTUNITY_GUIDANCE`)
- Atención dual presencial/telemática, ventajas y retos: pp.38-39, Tabla 16.
- Ámbitos de aplicación de la telefarmacia: p.40, Figura 4.
- Oportunidades de la telefarmacia en pediatría: p.41, Figura 5.

## Contenido del documento NO trasladado a la herramienta
Por alcance y para no fabricar contenido no verificado, no se han transcrito íntegramente:
- Tabla 11 (aspectos a valorar antes de la 1ª consulta, p.29), Tabla 12 (balance de
  intervenciones paciente/cuidador, p.33-34), Tabla 17-22 (herramientas tecnológicas,
  aplicaciones móviles, asociaciones de pacientes, competencias digitales, pp.45-52), Figuras 6-7
  (documentos de telefarmacia SEFH, diferencias teleconsulta pediátrica/adulto, pp.42-43) y los
  casos clínicos (pp.57-58). Estos contenidos son consultables directamente en el documento
  original SEFH; su ausencia en la herramienta no afecta a la lógica de estratificación
  (Capacidad), que está implementada de forma completa y literal.
