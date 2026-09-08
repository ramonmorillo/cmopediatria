# Changelog

## 1.0.0 — Primera versión

- Implementación completa del modelo de estratificación pediátrico CMO (SEFH): 20 ítems
  puntuables en 4 bloques (demográficas, clínicas, farmacoterapéuticas, sociosanitarias),
  máximo 57 puntos, umbrales P1≥31 / P2 17-30 / P3 0-16.
- Sin criterios de prioridad automática (no existen en el modelo pediátrico; confirmado tras
  revisión íntegra del documento fuente).
- Actuaciones farmacéuticas por prioridad (Seguimiento farmacoterapéutico, Formación/educación,
  Coordinación), acumulativas (P1⊇P2⊇P3).
- Modificación clínica manual con justificación obligatoria y justificación reforzada +
  confirmación explícita cuando se reduce la intensidad asistencial respecto a la prioridad
  calculada.
- Identificación pseudonimizada del paciente e identificación profesional (hospital,
  farmacéutico) obligatoria para finalizar de forma definitiva.
- Secciones informativas no puntuables de Motivación y Oportunidad, con orientaciones sourced
  del documento SEFH (comunicación por edad, participación del cuidador, atención dual,
  telefarmacia).
- Analizador local de texto clínico (reglas deterministas, sin red, sin IA generativa, sin
  autoconfirmación) con detección previa de posibles identificadores personales.
- Guardado, recuperación y borrado local (localStorage); exportación JSON/CSV, resumen clínico
  descargable e impresión.
- Documentación completa: `CLINICAL_RULES.md`, `SOURCE_MAPPING.md`, `TEST_PLAN.md`,
  `AI_POLICY.md`, `PRIVACY.md`, `LEGAL_NOTICE.md`.
- 15 pruebas automatizadas (`npm test`) cubriendo complejidad mínima/intermedia/máxima, cortes
  exactos, variables pendientes, ausencia de criterio automático, override clínico (ambos
  sentidos), guardado/recuperación, exportación/importación, propuestas del analizador sin
  autoconfirmación y ausencia de llamadas de red.
- Corregido durante el desarrollo: `calculate()` aplicaba la modificación clínica manual sin
  pasar por la validación de `applyOverride()`, permitiendo en teoría una reducción de prioridad
  sin justificación reforzada. `finalPriority` ahora parte siempre de la prioridad
  calculada/automática validada; sólo `applyOverride()` puede cambiarla, y sólo si la
  justificación cumple los requisitos.
