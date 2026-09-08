# Reglas clínicas — SIAF-CMO Pediatría

Fuente única y prioritaria: Sociedad Española de Farmacia Hospitalaria (SEFH).
*Adaptación del Modelo de Atención Farmacéutica CMO al Paciente Pediátrico* (coordinadores:
Ramón Morillo Verdugo, Maite Pozas del Río; 2025; ISBN 978-84-09-68510-3).

Toda variable, puntuación, umbral y actuación descrita aquí procede literalmente de dicho
documento (capítulo **Capacidad**, secciones I-V, páginas 9-21). Ninguna regla se ha extrapolado
de SIAF-CMO Respiratorio ni de ningún otro modelo CMO. Ver `SOURCE_MAPPING.md` para el detalle
página/tabla de cada regla.

## 1. Elegibilidad (dato descriptivo, no puntuable)

El modelo se aplica a pacientes pediátricos con al menos una patología de los 15 grupos de la
Tabla 1 (p.11): alergias e intolerancias alimentarias, autoinmunes sistémicas, cardiopatías,
dermatológicas, digestivas, endocrinas, hematológicas, infecciosas, inmunodeficiencias,
neurológicas, oncohematológicas, pacientes trasplantados, raras metabólicas, renales y
respiratorias. Esta selección **no puntúa**: es un criterio de elegibilidad/contexto.

## 2. Variables y puntuación

20 ítems puntuables agrupados en 4 bloques (Tablas 2-5, pp.12-14):

| Bloque | Máximo | Variables |
|---|---|---|
| Demográficas | 5 | Edad (categórica, 1-4 pts); Peso/Estado nutricional (1 pt) |
| Clínicas | 14 | Ingresos/urgencias (3); Dispositivos externos (2); Paciente crónico complejo (4); Tratamiento inmunosupresor/inmunomodulador (3); Pluripatología/comorbilidades (2) |
| Farmacoterapéuticas | 27 | Cambios de régimen (3); Complejidad del régimen (4); Condiciones de dispensación (3); Medicamentos de alto riesgo/ISMP/estrecho margen (4); Necesidad de manipular en domicilio (3); Medicamentos peligrosos (1); Polimedicación (3); Sospecha o falta de adherencia (4); Sospecha o evidencia de efectos adversos (2) |
| Sociosanitarias | 11 | Medicación en horario escolar (2); Barrera idiomática/analfabetismo (4); Entorno familiar/situación socioeconómica (3); Familia numerosa (2) |

**Puntuación máxima global: 57 puntos** (5+14+27+11), confirmada literalmente en el documento (p.15).

### Variable "Edad" (única variable categórica)
- Neonatos y lactantes (hasta 2 años): **4 puntos**
- Preescolar (3-5 años): **2 puntos**
- Edad escolar (6-11 años): **1 punto**
- Adolescente (12-18 años): **3 puntos**

El resto de variables son dicotómicas (Sí/No); "Sí" suma los puntos indicados, "No" suma 0.
Toda variable sin respuesta queda como **Pendiente de valoración** (no puntúa) y marca el
resultado como **provisional**.

### PENDIENTE DE VALIDACIÓN HUMANA — discrepancia de recuento de variables
El texto introductorio del documento afirma que el modelo se compone de **18 variables**
(p.11: "un conjunto de 18 variables"; p.14: "13 de las 18 variables"). Sin embargo, el recuento
literal de ítems con puntuación propia tabulados en las Tablas 2-5 asciende a **20**, y sólo esa
cifra permite que la suma cuadre exactamente con los máximos de bloque declarados
(5+14+27+11=57). La discrepancia proviene, con alta probabilidad, del ítem "Paciente en
tratamiento con medicamentos peligrosos" (1 punto), que en la Tabla 4 (p.13) aparece sin
cabecera propia, a diferencia del resto de variables. Esta herramienta implementa fielmente los
20 ítems puntuables tal como están tabulados (dando prioridad a la coherencia aritmética con los
máximos declarados), pero la discrepancia numérica en sí **no se resuelve por extrapolación** y
queda documentada aquí como pendiente de validación por el grupo de trabajo SEFH.

### PENDIENTE DE VALIDACIÓN HUMANA — determinación de obesidad/desnutrición
La nota de la Tabla 2 (p.12) indica explícitamente: *"La determinación de paciente con
obesidad/desnutrición dependerá de la práctica habitual de cada hospital, ya sea mediante el uso
de percentiles o índice de masa corporal."* La herramienta no fija un criterio numérico (percentil
ni IMC) por no estar unificado en la fuente: la variable se responde como Sí/No según el
criterio profesional de cada centro.

### PENDIENTE DE VALIDACIÓN HUMANA — listados externos referenciados
Dos variables remiten a listados externos que el documento no reproduce: el listado ISMP
español de medicamentos de alto riesgo (Ministerio de Sanidad) para "Medicamentos de alto
riesgo..." y un listado de "medicamentos peligrosos" para la variable homónima. La herramienta
no incorpora ni reproduce dichos listados (evitando inventarlos): el profesional debe consultarlos
externamente y responder Sí/No según corresponda.

## 3. Umbrales de prioridad (Figura 2, p.16)

Calculados mediante pretest en 205 pacientes pediátricos de 6 hospitales (mayo-junio 2024),
siguiendo la estructura de la pirámide de Kaiser Permanente:

- **Prioridad 3**: 0-16 puntos (≈62% de los pacientes en el pretest)
- **Prioridad 2**: 17-30 puntos (≈30%)
- **Prioridad 1**: 31-57 puntos (≈8%)

El documento declara los "puntos de corte" como 17 (entrada a Prioridad 2) y 31 (entrada a
Prioridad 1); esta herramienta interpreta el punto de corte como el valor mínimo inclusive del
nivel superior, consistente con la Figura 2 y con el modelo CMO de patologías respiratorias
(misma convención editorial de la SEFH).

## 4. Criterios de prioridad automática

**No existen.** Se ha revisado íntegramente el capítulo Capacidad (pp.9-21) y no se ha
encontrado ningún criterio que asigne una prioridad de forma automática (a diferencia, por
ejemplo, de las excepciones de embarazo/edad de otros modelos CMO de la SEFH). La función
`automaticPriority()` existe en el código por auditabilidad y coherencia arquitectónica, pero
devuelve siempre `null` en este modelo. Si una futura revisión del documento SEFH incorporase
excepciones automáticas, deberán añadirse aquí con su referencia exacta, nunca por analogía con
otros modelos CMO.

## 5. Modificación clínica manual

El documento afirma explícitamente (p.16): *"la puntuación del modelo no exime el criterio
profesional: si se considera elevar a un paciente a un nivel superior de estratificación por
circunstancias particulares o puntuales, es conveniente realizarlo."* La herramienta traslada
este principio a una funcionalidad de "Modificación clínica manual":

- Toda modificación exige motivo y justificación (mínimo 12 caracteres).
- **Regla añadida por la herramienta, no explícita en el documento fuente**: si la modificación
  *reduce* la intensidad asistencial respecto a la prioridad calculada/automática (p.ej. de P1 a
  P2 o P3), se exige justificación reforzada (mínimo 40 caracteres) y una casilla de confirmación
  explícita. Esta exigencia adicional es una medida de seguridad clínica razonable —evitar
  reducciones de intensidad asistencial poco reflexionadas— pero no está impuesta literalmente
  por el documento SEFH; se señala aquí para trazabilidad.
- La prioridad calculada y el criterio automático (si existiera) **nunca se ocultan**: se muestran
  siempre junto a la prioridad final, tanto en pantalla como en el informe final.

## 6. Actuaciones de Atención Farmacéutica (Tablas 6, 7 y 8, pp.17-20)

Tres ámbitos: **Seguimiento farmacoterapéutico**, **Formación y educación al
paciente/cuidador** y **Coordinación con el equipo asistencial**.

Son **explícitamente acumulativas** (texto, p.15 y p.16): *"Estas actuaciones son acumulativas,
de manera que a los pacientes de Prioridad 1 se les realizarán las propias de dicho nivel más las
de Prioridad 2 y Prioridad 3, y, a su vez, a los de nivel de Prioridad 2, las propias de su nivel más
las de nivel de Prioridad 3."* Es decir: P1 ⊇ P2 ⊇ P3.

## 7. Periodicidad recomendada (p.16)

- **Prioridad 1**: cada 3-6 meses.
- **Prioridad 2**: anual, salvo decisión del profesional o cambio en el tratamiento de la enfermedad.
- **Prioridad 3**: cuando se detecte la necesidad, por decisión del profesional o cambio en el
  tratamiento de la enfermedad.

## 8. Componentes CMO (Capacidad / Motivación / Oportunidad)

- **Capacidad**: la estratificación descrita en las secciones 1-7 de este documento
  (variables, puntuación, umbrales, actuaciones).
- **Motivación**: orientaciones **no puntuables** sobre comunicación adaptada a la edad,
  participación del niño/adolescente y del cuidador, y entrevista motivacional (capítulo
  Motivación, pp.22-37). Ver `MOTIVATION_GUIDANCE` en `src/clinical.js` y `SOURCE_MAPPING.md`.
- **Oportunidad**: orientaciones **no puntuables** sobre atención dual (presencial/telemática),
  telefarmacia y coordinación con cuidadores y entorno (capítulo Oportunidad, pp.38-54). Ver
  `OPPORTUNITY_GUIDANCE` en `src/clinical.js` y `SOURCE_MAPPING.md`.

Ninguno de los contenidos de Motivación u Oportunidad suma puntos: el documento no los define
como variables puntuables, y esta herramienta respeta esa distinción explícitamente en la
interfaz (secciones separadas, sin campos de puntuación).
