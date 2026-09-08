# SIAF-CMO Pediatría

Sistema inteligente de atención farmacéutica para estratificar, priorizar y documentar pacientes
pediátricos según el modelo CMO (Capacidad-Motivación-Oportunidad).

Aplicación web estática, sin backend, sin analítica, sin cookies de seguimiento y con
almacenamiento local de datos estructurados confirmados. Misma arquitectura y enfoque técnico
que [SIAF-CMO Respiratorio](https://github.com/ramonmorillo/cmorespiratorio); modelo clínico
propio e independiente (ver más abajo).

## Fuente clínica

Sociedad Española de Farmacia Hospitalaria (SEFH). *Adaptación del Modelo de Atención
Farmacéutica CMO al Paciente Pediátrico* (2025). Ninguna variable, puntuación, umbral o
actuación se ha extrapolado de otros modelos CMO (respiratorio, VIH, oncohematológico, etc.):
toda la lógica clínica procede de este documento y está trazada en `SOURCE_MAPPING.md`.

## Uso

```bash
npm test
npm run build
```

Publicación en GitHub Pages: `https://ramonmorillo.github.io/cmopediatria/`. La aplicación
incluye `<base href="/cmopediatria/">` en `index.html` para resolver correctamente sus rutas
relativas (`src/*.js`, `src/styles.css`) bajo ese subdirectorio. Puede servirse directamente
desde la raíz del repositorio o desde el artefacto `dist/` generado por `npm run build`.

## Arquitectura

```text
/
├── index.html
├── package.json
├── README.md
├── CLINICAL_RULES.md
├── SOURCE_MAPPING.md
├── TEST_PLAN.md
├── AI_POLICY.md
├── PRIVACY.md
├── LEGAL_NOTICE.md
├── VERSION.md
├── CHANGELOG.md
├── scripts/build.js
├── tests/clinical.test.js
└── src/
    ├── app.js        # Estado e interfaz
    ├── clinical.js   # Variables, puntuaciones, cortes, actuaciones (única fuente de lógica clínica)
    ├── extractor.js  # Analizador local de texto clínico (sin red, sin IA generativa)
    ├── storage.js    # localStorage: guardar/recuperar/eliminar
    └── styles.css    # Diseño
```

Toda la lógica clínica (variables, puntuación, umbrales, ausencia de criterios automáticos,
actuaciones, contenido de Motivación/Oportunidad) está centralizada en `src/clinical.js`; el
resto de módulos son interfaz, analizador y almacenamiento, sin reglas clínicas propias.

## Modelo clínico (resumen)

- 20 ítems puntuables en 4 bloques: demográficas (máx. 5), clínicas (máx. 14),
  farmacoterapéuticas (máx. 27) y sociosanitarias (máx. 11). Máximo global: **57 puntos**.
- Umbrales: **Prioridad 1** ≥31 · **Prioridad 2** 17-30 · **Prioridad 3** 0-16.
- Sin criterios de prioridad automática (confirmado tras revisión íntegra del documento).
- Actuaciones farmacéuticas acumulativas por prioridad (P1⊇P2⊇P3).
- Modificación clínica manual con justificación obligatoria (reforzada si reduce intensidad
  asistencial); la prioridad calculada original nunca se oculta.

Detalle completo, página a página, en `CLINICAL_RULES.md` y `SOURCE_MAPPING.md`, incluidas las
incertidumbres marcadas expresamente como **PENDIENTE DE VALIDACIÓN HUMANA**.

## Privacidad y alcance

Identificación pseudonimizada del paciente (nunca nombre, DNI o NHC); identificación profesional
obligatoria para finalizar de forma definitiva. Ver `PRIVACY.md`, `AI_POLICY.md` y
`LEGAL_NOTICE.md`.

Herramienta de apoyo profesional: no diagnóstica, no prescriptiva, no sustitutiva del juicio
clínico, no producto sanitario certificado y pendiente de validación asistencial antes de su
implantación.

## Autoría

Creada por Ramón Morillo Verdugo. Modelo basado en la Adaptación del Modelo de Atención
Farmacéutica CMO al Paciente Pediátrico de la Sociedad Española de Farmacia Hospitalaria (SEFH).
