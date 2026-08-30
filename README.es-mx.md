# 👣 Atavismo

<p align="center">
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.zh-cn.md"><b>简体中文</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.en-us.md"><b>English</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.es-mx.md"><b>Español</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.md"><b>Português</b></a>
</p>

<h2 align="center">Visor y explorador de genealogía GEDCOM multiplataforma de alto rendimiento creado con <a href="https://www.electronjs.org/"><b>Electron.js</b></a> y <a href="https://svelte.dev/"><b>Svelte</b></a></h2>

# Contenido

- [👣  Atavismo](#-atavismo)
- [Contenido](#contenido)
  - [✨ Características](#-características)
  - [🚀 Uso](#-uso)
  - [💻 Desarrollo](#-desarrollo)
    - [⚙️ Configuración](#️-configuración)
    - [🧪 Pruebas](#-pruebas)
  - [📜 Licencia](#-licencia)

## ✨ Características

- **Motor de análisis GEDCOM sin librerías de terceros**: Analizador propio en TypeScript puro para GEDCOM 5.5 y 5.5.1 sin dependencias externas.
- **Visualizador interactivo de árbol genealógico**: Explore individuos, cónyuges, padres e hijos con navegación intuitiva de linaje.
- **Búsqueda y filtros instantáneos**: Busque miles de registros por nombre, apellido o ID con filtros en tiempo real.
- **Inspector de registros**: Información biográfica, fechas de nacimiento/defunción, matrimonios y notas detalladas.
- **Soporte multilingüe**: Internacionalización completa en Español (`es-MX`), Inglés (`en-US`), Portugués (`pt-BR`) y Chino Simplificado (`zh-CN`).
- **Conjunto de datos de ejemplo incluido**: Viene con un archivo genealógico real de más de 3,850 líneas listo para explorar.

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
npm run preinstall
npm run start
```

### 🧪 Pruebas

```bash
npm run lint
npm run build
npm run test
```

## 📜 Licencia

Licenciado bajo la [GNU GPLv3](LICENSE).
