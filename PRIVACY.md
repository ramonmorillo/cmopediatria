# Privacidad — SIAF-CMO Pediatría

## Principio general

SIAF-CMO Pediatría funciona íntegramente en el navegador del usuario. No existe backend, no hay
servidor propio que reciba datos, no hay base de datos externa, no hay analítica de uso
(Google Analytics u otra), no hay trackers ni cookies de seguimiento. Ningún dato introducido en
la aplicación sale del dispositivo del usuario, salvo que el propio usuario decida exportarlo o
imprimirlo explícitamente.

## Datos que se solicitan

- **Identificador pseudonimizado del paciente**: un código definido por el propio centro/usuario.
  La aplicación no solicita ni valida nombre, apellidos, DNI/NIE, número de historia clínica
  (NHC), teléfono, dirección ni fecha de nacimiento completa. Es responsabilidad del usuario no
  introducir estos datos en este ni en ningún otro campo de texto libre (incluido el analizador
  de texto clínico).
- **Identificación profesional**: hospital o centro sanitario y farmacéutico responsable,
  necesarios para la trazabilidad asistencial del informe y obligatorios para finalizar de forma
  definitiva.
- **Variables clínicas de estratificación**: respuestas Sí/No/Pendiente y edad, sin más
  contenido narrativo.
- **Texto clínico pegado en el analizador**: se procesa localmente y se descarta inmediatamente
  tras el análisis; no se almacena en ningún momento, ni siquiera temporalmente en
  `localStorage`.

## Almacenamiento

El único almacenamiento persistente es `localStorage` del navegador, bajo la clave
`siaf-cmo-pediatria-cases`. Este almacenamiento:

- Es local al navegador y dispositivo del usuario; no se sincroniza ni se envía a ningún
  servidor.
- Puede eliminarse en cualquier momento con la función "Borrado completo" de la aplicación, o
  limpiando los datos de navegación del navegador.
- No incluye el texto clínico pegado en el analizador (ver `AI_POLICY.md`).

## Exportación e impresión

Las funciones "Exportar JSON", "Exportar CSV", "Descargar resumen clínico" e "Imprimir" generan
archivos o vistas de impresión localmente, sin ningún envío de red. El resumen clínico
descargable **no incluye** el texto clínico pegado en el analizador, únicamente los datos
estructurados de la estratificación.

## Base normativa

- **RGPD** (Reglamento (UE) 2016/679) y **LOPDGDD** (Ley Orgánica 3/2018): el uso de un
  identificador pseudonimizado, en lugar de datos identificativos directos, reduce el riesgo para
  los derechos y libertades del paciente conforme al principio de minimización de datos
  (art. 5.1.c RGPD) y a la técnica de pseudonimización (art. 4.5 RGPD).
- Al no existir tratamiento por parte de un tercero (sin backend, sin servicio en la nube), no
  se produce cesión ni encargo de tratamiento de datos por el mero uso de la aplicación.
- Sigue siendo responsabilidad del centro sanitario y del profesional que use la herramienta
  garantizar que el identificador pseudonimizado no permita, por sí mismo o combinado con otra
  información de fácil acceso, la reidentificación del paciente, y cumplir con sus obligaciones
  como responsable del tratamiento de los datos que decida introducir, guardar o exportar.

## Menores de edad

Dado que la herramienta trata datos de pacientes pediátricos, se refuerza especialmente la
recomendación de no introducir en ningún campo (incluido el analizador de texto libre) nombre,
apellidos, fecha de nacimiento completa, dirección, teléfono de contacto de los progenitores/
tutores ni cualquier otro dato que permita identificar directamente al menor.
