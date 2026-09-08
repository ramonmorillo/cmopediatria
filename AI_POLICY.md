# Política de uso de IA — SIAF-CMO Pediatría

## Qué IA generativa usa esta aplicación en producción

**Ninguna.** SIAF-CMO Pediatría es una aplicación web estática cuyo código JavaScript se ejecuta
íntegramente en el navegador del usuario. No integra ni invoca ningún modelo de lenguaje, API de
IA generativa (OpenAI, Anthropic/Claude, Google Gemini, Azure OpenAI o equivalente) ni servicio
de IA externo de ningún tipo. No existe backend, servidor propio ni intermediario que procese
los datos introducidos.

## Analizador local de texto clínico

La sección "Preestratificación automática local" (`src/extractor.js`) es un motor de reglas
determinista basado en expresiones regulares y palabras clave, ejecutado localmente en el
navegador:

- No realiza llamadas de red (`fetch`, `XMLHttpRequest`, `WebSocket`) de ningún tipo.
- No envía el texto pegado a ningún servidor, API o servicio externo.
- No almacena el texto pegado: se descarta del campo de entrada inmediatamente tras el análisis
  y no se persiste en `localStorage` ni en ningún otro medio.
- No modifica ninguna variable clínica de forma automática: únicamente **propone** valores junto
  con la evidencia textual (fragmento), la regla aplicada y un nivel de certeza. La incorporación
  de cualquier propuesta al formulario exige una acción humana explícita ("Confirmar"); la
  alternativa es "Descartar". No existe una función de autoaplicación ni de aceptación masiva.
- Antes de analizar, detecta patrones compatibles con identificadores personales (DNI/NIE,
  email, teléfono, fecha completa, cadenas numéricas largas compatibles con NHC, patrón
  "Paciente: Nombre") y muestra una advertencia. Esta detección es también local y no bloquea ni
  transmite el texto: es responsabilidad del usuario no introducir datos identificativos.

Verificación técnica: `scripts/build.js` falla el build si detecta en el código fuente
literales de red (`fetch(`, `XMLHttpRequest`, `WebSocket`) o referencias a proveedores de IA
generativa; `tests/clinical.test.js` incluye una prueba automatizada equivalente.

## Uso de IA en el desarrollo de esta herramienta

Esta herramienta fue desarrollada con la asistencia de Claude (Anthropic) como agente de
programación, bajo supervisión humana directa del autor. El uso de IA se limitó a:

- Estructuración del código y la documentación siguiendo la arquitectura de referencia de
  SIAF-CMO Respiratorio.
- Extracción y verificación literal (página a página) de las variables, puntuaciones, umbrales y
  actuaciones del documento oficial SEFH aportado por el autor, sin generar ni inferir contenido
  clínico no presente en dicha fuente.
- Redacción de pruebas automatizadas y documentación técnica.

La IA utilizada en el desarrollo **no interviene en ningún momento en el uso clínico de la
herramienta**: una vez publicada, la aplicación no realiza ninguna llamada a Claude, a Anthropic
ni a ningún otro proveedor de IA. Toda discrepancia o incertidumbre detectada en el documento
fuente durante el desarrollo se ha documentado explícitamente en `CLINICAL_RULES.md` como
"PENDIENTE DE VALIDACIÓN HUMANA", en lugar de resolverse por inferencia automática.

## Responsabilidad profesional

La validez clínica del modelo de estratificación es responsabilidad del grupo de trabajo SEFH
que lo elaboró y de los profesionales que lo apliquen. Esta herramienta es un soporte de cálculo
y documentación; no emite juicio clínico ni sustituye la valoración del farmacéutico
responsable.
