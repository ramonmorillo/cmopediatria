# Changelog

## Sin publicar — Identidad CMO Design System 0.1.0 (rama `design/cmo-ds-0.1.0`)

Cambio exclusivamente visual. Sin cambios en `src/clinical.js`, `src/extractor.js`, `src/storage.js` ni `src/app.js`.
- Copia fijada del CMO Design System 0.1.0 en `src/cmo-ds/` (manifiesto SHA-256).
- `src/cmo-visual.css` reescrito como tema «Estratos» sobre tokens (sustituye al fondo oscuro degradado); `src/styles.css` pasa a tokens y deja de importar `cmo-visual.css` dos veces.
- Accesibilidad: foco de #ffbf47 (1,6:1) a #1f3aa8 (9,4:1); borde de campos de #aebbd0 (1,9:1) a #7b8495 (≥3:1).
- Pie: firma `<cmo-author-signature>` con atribución del modelo a la SEFH y a sus coordinadores; favicon del ecosistema.
- Build: copia recursiva y control de red ampliado a `src/cmo-ds/`. Pruebas: `tests/cmo-ds.test.js`.
- Versión: se mantiene 1.1.0 a la espera de decisión del autor (`VERSION` vive en `src/clinical.js` y se exporta).

## 1.1.0 — Seguimiento longitudinal

- Metadatos de visita, relaciones entre valoraciones y creación de visitas de seguimiento.
- Exportación versionada del conjunto local y fusión segura con previsualización, copia de
  seguridad, detección de duplicados/conflictos y escritura atómica.
- Listado cronológico y renderizado seguro de datos importados.
- Compatibilidad conservada con JSON individuales anteriores, sin cambios en las reglas clínicas.

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
