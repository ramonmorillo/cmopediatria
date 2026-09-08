# Plan de pruebas — SIAF-CMO Pediatría

Automatizadas en `tests/clinical.test.js` (`npm test`, Node.js `--test`). Estado a fecha de
entrega: **15/15 pasan**.

| # | Caso | Comprobación | Resultado |
|---|---|---|---|
| 1 | Mínima complejidad | Todo "No" + edad escolar (1 pto) | Total 1, P3 |
| 2 | Complejidad intermedia | Combinación de variables sumando 20 puntos | P2 |
| 3 | Máxima complejidad | Todo "Sí" + edad neonatal (4 ptos) | Total 57/57 (máximo), P1 |
| 4 | Valores exactamente en los cortes | 16→P3, 17→P2, 30→P2, 31→P1 | Correcto en los 4 puntos |
| 5 | Una variable pendiente | 1 variable sin responder | `pending=true`, 1 ítem pendiente |
| 6 | Varias variables pendientes | 2 variables + edad sin responder | `pending=true`, 3 ítems pendientes |
| 7 | Criterio automático | `automaticPriority()` en casos mínimo y máximo | Siempre `null` (no existen en este modelo) |
| 8a | Override clínico (aumento) | Justificación estándar (≥12 caracteres) | Se aplica; prioridad calculada original visible |
| 8b | Override clínico (reducción) | Justificación corta/sin reforzar → rechazado; justificación reforzada + confirmación → aceptado | Ambos casos correctos |
| 9 | Guardado y recuperación | `saveCase`/`allCases`/`deleteCase` sobre localStorage (polyfill de test) | Persistencia y borrado correctos |
| 10 | Exportar/importar JSON | `exportCase` → `importCase` (round-trip) y rechazo de esquema incompatible | Datos coherentes; error controlado en JSON ajeno |
| 10b | Exportar CSV | Cabecera y datos de hospital/farmacéutico/variable | Formato correcto |
| 11 | Propuesta del analizador sin autoconfirmación | `prestratify()` no aplica ningún cambio de estado por sí sola | Función pura; requiere confirmación explícita en `app.js` |
| 11b | Detección de identificadores | DNI/NIE, email, teléfono, fecha completa, patrón "Paciente: Nombre" | Los 5 tipos detectados correctamente |
| 12 | Ausencia de llamadas de red | Los 4 módulos de `src/` no contienen `fetch`, `XMLHttpRequest`, `WebSocket` ni referencias a proveedores de IA externos | Confirmado; `NETWORK_FREE=true` |

## Verificación manual complementaria (realizada durante el desarrollo)

Realizada con Chromium (Playwright) sirviendo la aplicación bajo la ruta `/cmopediatria/` (misma
estructura que GitHub Pages) para validar comportamiento real de interfaz, no sólo lógica:

1. Carga de la aplicación sin errores de consola (0 errores JS).
2. Relleno de identificación profesional y edad; selección de variables → puntuación y prioridad
   se actualizan en tiempo real.
3. Analizador local: texto de prueba con identificadores (DNI, teléfono, email, fecha) →
   advertencia visible; propuestas mostradas con fragmento, regla y certeza; ninguna se aplica
   sin pulsar "Confirmar".
4. Finalizar con variables pendientes → diálogo de variables pendientes con recuento y listado
   correctos; opción de volver al formulario o finalizar como provisional.
5. Caso de máxima complejidad (57/57, P1) con modificación clínica manual:
   - Reducción a P3 con justificación corta y sin casilla de confirmación → **rechazada**, la
     prioridad final permanece en P1 (bug de validación detectado y corregido durante el
     desarrollo: `calculate()` aplicaba el override sin pasar por `applyOverride()`; corregido
     para que la única vía de cambio de `finalPriority` sea la función validada).
   - Reducción a P3 con justificación reforzada (≥40 caracteres) y casilla marcada → aceptada;
     la prioridad calculada (P1) permanece visible en el resultado final junto a la prioridad
     final (P3).
6. Finalización definitiva: panel de resultado con todos los campos requeridos (identificador,
   hospital, farmacéutico, puntuación, prioridad calculada, criterio automático, prioridad final,
   modificación manual, variables pendientes, actuaciones, periodicidad); guardado automático en
   `localStorage`.
7. `npm run build` genera `dist/` sin errores y reconfirma la ausencia de marcadores de red/IA.

## Fuera de alcance de este plan

No se han automatizado pruebas de accesibilidad (lector de pantalla), de compatibilidad entre
navegadores más allá de Chromium, ni pruebas de carga. Se recomienda una validación clínica
asistencial formal por el grupo de trabajo SEFH antes de cualquier implantación real, conforme al
aviso profesional de la herramienta.
