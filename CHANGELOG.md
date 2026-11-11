# Changelog

## 1.3.0 — 2026-11-11

Informe único con PDF, registro del estado de las actuaciones, plan de seguimiento, necesidades y resultado provisional con cota superior; importación validada y corrección de defectos. **Sin cambios en las reglas clínicas**: `src/extractor.js` es idéntico; `src/clinical.js` solo cambia la constante `VERSION` (1.2.0 → 1.3.0, la misma que muestra la firma); la huella de las pruebas normaliza esa línea. La fecha y el estado de publicación se fijan en el commit de publicación.

### Novedades
- **Informe único** (`cmo-report/1`): texto para historia clínica, vista del resultado final, impresión y **PDF real** salen de la misma estructura. Botones nuevos: «Copiar informe para historia clínica» y «Descargar PDF»; «Descargar resumen» pasa a «Descargar texto (.txt)» e incluye ahora el detalle de variables, las actuaciones y el plan. El estado se muestra traducido («Definitiva»/«Provisional»; antes `completed`).
- **Necesidades** por bloque del modelo (confirmadas y potenciales pendientes de evaluación); las del bloque farmacoterapéutico constituyen las necesidades farmacoterapéuticas del informe.
- **Actuaciones del modelo con estado** (realizada, planificada, no procede) y **plan de seguimiento** (próxima valoración y observaciones). Se guardan con la valoración.
- **Resultado provisional**: se rotula también en el informe con la **cota superior** de puntuación si las pendientes resultaran positivas (calculada con los puntos de cada variable). Una variable pendiente nunca se interpreta como «No».
- Indicador de progreso («n de 20 variables valoradas») y nombres accesibles para los campos de modificación y de texto.

### Defectos corregidos
- **Edad negativa o no numérica rompía el cálculo** (`TypeError` en el motor): ahora queda pendiente y se señala el campo. La edad fuera de 0–120 años se descarta.
- **Importación**: el JSON importado se sanea (variables y valores del modelo, actuaciones, plan, grupos de patología, modificación); un valor inventado ya no se puntúa como «No», queda pendiente.
- **CSV**: comillas dobladas y fórmulas (`=`, `+`, `-`, `@`) neutralizadas.
- La lista de valoraciones guardadas mostraba la prioridad sin la modificación profesional; ahora muestra la prioridad final.
- Aviso al salir con cambios sin guardar; tabla de detalle desplazable en móvil (desbordaba a 375 px tras finalizar).
- XSS por el fragmento de evidencia del analizador (ya en la rama).

### Pruebas
- `npm test`: 38 (28 previas + 10 del adaptador: huellas, fronteras 16/17 y 30/31, paridad en 300 formularios, pendientes y cota superior, edad inválida, modificación y justificación reforzada, actuaciones, informe, saneado, CSV). `npm run test:e2e`: 6 recorridos en Chromium con axe WCAG A/AA opcional (`AXE_PATH`).

### Pendiente de decisión del autor
- Reglas del analizador de texto: la negación usa una ventana de 20 caracteres sin límite de frase («Sin sonda. Posible mala adherencia» → adherencia «No»); no se ha modificado.
- Incoherencias heredadas (`docs/ECOSISTEMA_CMO_AUDIT.md` del hub): 20 ítems frente a «18 variables»; edad entre 2 y 3 años clasificada como «Preescolar (3-5)»; edad > 18 puntúa 0 y permite resultado definitivo (ahora se advierte en el informe).
- La herramienta sigue siendo una página única con secciones (no un asistente de 7 etapas): el indicador de progreso y el informe único cubren el patrón común sin reescribir el formulario.

## 1.2.0 — 2026-10-30 — Identidad CMO Design System

Publicación: `VERSION` 1.1.0 → 1.2.0 (decisión del autor: versión menor por el cambio de interfaz; se incluye en el JSON exportado). CMO Design System actualizado a 0.2.0 (firma multilingüe, compatible). `cmo-app-meta`: `status: "released"`, `releaseDate: "2026-10-30"`. Sin cambios en las reglas clínicas.

### Identidad CMO Design System (antes «sin publicar»)

Cambio exclusivamente visual. Sin cambios en `src/clinical.js`, `src/extractor.js`, `src/storage.js` ni `src/app.js`.
- Copia fijada del CMO Design System 0.1.0 en `src/cmo-ds/` (manifiesto SHA-256).
- `src/cmo-visual.css` reescrito como tema «Estratos» sobre tokens (sustituye al fondo oscuro degradado); `src/styles.css` pasa a tokens y deja de importar `cmo-visual.css` dos veces.
- Accesibilidad: foco de #ffbf47 (1,6:1) a #1f3aa8 (9,4:1); borde de campos de #aebbd0 (1,9:1) a #7b8495 (≥3:1).
- Pie: firma `<cmo-author-signature>` con atribución del modelo a la SEFH y a sus coordinadores; favicon del ecosistema.
- Build: copia recursiva y control de red ampliado a `src/cmo-ds/`. Pruebas: `tests/cmo-ds.test.js`.

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
