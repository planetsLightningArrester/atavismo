# 👣 Atavismo

<p align="center">
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.zh-cn.md"><b>简体中文</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.en-us.md"><b>English</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.es-mx.md"><b>Español</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.md"><b>Português</b></a>
</p>

<h2 align="center">Visor y explorador de genealogía GEDCOM multiplataforma de alto rendimiento creado con <a href="https://www.electronjs.org/"><b>Electron.js</b></a> y <a href="https://svelte.dev/"><b>Svelte</b></a></h2>

# Contenido

- [👣 Atavismo](#-atavismo)
- [Contenido](#contenido)
  - [✨ Características](#-características)
  - [🚀 Uso](#-uso)
  - [💻 Desarrollo](#-desarrollo)
    - [⚙️ Configuración](#️-configuración)
    - [🧪 Pruebas y Rendimiento](#-pruebas-y-rendimiento)
  - [📜 Licencia](#-licencia)

## ✨ Características

- **Motor de análisis GEDCOM sin librerías de terceros**: Analizador AST propio en TypeScript puro compatible con GEDCOM 5.5, 5.5.1 y 7.0 (`INDI`, `FAM`, `SOUR`, `REPO`, `OBJE`, `SUBM`, citas con calidad `QUAY`, notas `CONT`/`CONC` y diagnósticos de referencias cruzadas).
- **Visualizaciones interactivas del árbol (D3.js / SVG)**:
  - **Árbol de Ascendencia (Pedigree)**, **Árbol de Descendientes**, **Gráfico Reloj de Arena**, **Gráfico en Abanico (180° y Rueda Completa 360°)** y **Unidades Familiares**.
  - Panorámica y zoom fluidos, selector de generaciones, salto rápido y exportación a **SVG** y **PNG**.
- **Inspector de Entidades, Búsqueda y Explorador Multimedia**:
  - **Línea de Tiempo Cronológica** con cálculo de edad en cada evento, causas de defunción y citas de fuentes integradas.
  - Exploradores dedicados para **Fuentes (`SOUR`)**, **Repositorios (`REPO`)** y **Archivos Multimedia (`OBJE`)**.
  - **Búsqueda Difusa (Fuzzy Search)** insensible a acentos y tolerante a errores tipográficos, con filtros avanzados por estado vital, rango de años, fuentes y multimedia.
- **Análisis Genealógico y Calculadora de Parentesco**:
  - **Calculadora de Parentesco y Consanguinidad (LCA)**: Descubra cómo se relacionan dos individuos cualesquiera, sus ancestros comunes, grados civil y canónico, porcentaje estimado de ADN compartido y ruta paso a paso.
  - **Panel Demográfico y de Migración**: Esperanza de vida media, récords de longevidad, histogramas de nacimientos y defunciones por época histórica y **Corredores de Migración (Origen → Destino)**.
- **Soporte multilingüe**: Internacionalización completa en Español (`es-MX`), Inglés (`en-US`), Portugués (`pt-BR`) y Chino Simplificado (`zh-CN`).
- **Conjunto de datos de ejemplo incluido**: Incluye un archivo genealógico interconectado de 10,993 líneas (`sample.gedcom`, 229 individuos, 100 familias y 7 generaciones).

## 🚀 Uso

### Abrir Archivos
- Arrastre y suelte cualquier archivo `.ged`, `.gedcom` o `.txt` en la ventana de la aplicación.
- O haga clic en **Abrir Archivo GEDCOM** en la barra superior para seleccionarlo mediante el explorador nativo.
- Haga clic en **Cargar Árbol de Ejemplo** para explorar la base de datos incluida.

## 💻 Desarrollo

### ⚙️ Configuración

```bash
git clone https://github.com/planetsLightningArrester/atavismo.git
cd atavismo
npm ci
npm run start
```

### 🧪 Pruebas y Rendimiento

```bash
# Ejecutar análisis de seguridad (Electronegativity), svelte-check y ESLint
npm run lint

# Compilar frontend y backend
npm run build

# Compilar y ejecutar pruebas unitarias y E2E con Playwright
npm run test

# Ejecutar pruebas reutilizando la compilación existente
npm run test:run

# Ejecutar suite de benchmark de rendimiento en pantalla completa
npm run test:perf
```

## 📜 Licencia

Licenciado bajo la [GNU GPLv3](LICENSE).
