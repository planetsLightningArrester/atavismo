# 👣 Atavismo

<p align="center">
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.zh-cn.md"><b>简体中文</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.en-us.md"><b>English</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.es-mx.md"><b>Español</b></a> |
  <a href="https://github.com/planetsLightningArrester/atavismo/blob/main/README.md"><b>Português</b></a>
</p>

<h2 align="center">Visualizador e explorador de genealogia GEDCOM multiplataforma de alta performance construído com <a href="https://www.electronjs.org/"><b>Electron.js</b></a> e <a href="https://svelte.dev/"><b>Svelte</b></a></h2>

# Conteúdo

- [👣 Atavismo](#-atavismo)
- [Conteúdo](#conteúdo)
  - [✨ Recursos](#-recursos)
  - [🚀 Utilização](#-utilização)
  - [💻 Desenvolvimento](#-desenvolvimento)
    - [⚙️ Configuração](#️-configuração)
    - [🧪 Testes e Performance](#-testes-e-performance)
  - [📜 Licença](#-licença)

## ✨ Recursos

- **Motor de Leitura GEDCOM Sem Dependências de Terceiros**: Analisador léxico e sintático próprio em TypeScript puro para os padrões GEDCOM 5.5, 5.5.1 e 7.0 (`INDI`, `FAM`, `SOUR`, `REPO`, `OBJE`, `SUBM`, citações com `QUAY`, notas `CONT`/`CONC` e diagnósticos de integridade referencial).
- **Visualizações Interativas de Árvore (D3.js / SVG)**:
  - **Árvore de Ascendência (Pedigree)**, **Árvore de Descendência**, **Gráfico Ampulheta (Hourglass)**, **Gráfico em Leque (180° e Roda Completa 360°)** e **Unidades Familiares**.
  - Zoom/pan suaves acelerados por hardware, seletor de profundidade de gerações, busca rápida e exportação vetorial/rasterizada (**SVG** e **PNG**).
- **Inspetor de Entidades, Fontes e Multimídia**:
  - **Linha do Tempo Cronológica** com cálculo automático de idade em cada evento, causa de óbito e citações de fontes integradas.
  - Exploradores dedicados para **Fontes (`SOUR`)**, **Repositórios Arquivísticos (`REPO`)** e **Galeria Multimídia (`OBJE`)** com referências cruzadas bidirecionais.
  - **Busca Difusa (Fuzzy Search)** insensível a acentos/diacríticos e tolerante a erros de digitação, além de filtros avançados por status vital, intervalo de anos, fontes e mídia.
- **Análises Genealógicas e Calculadora de Parentesco**:
  - **Calculadora de Parentesco e Consanguinidade (LCA)**: Descubra como quaisquer dois indivíduos estão conectados (consanguinidade ou afinidade), grau civil, grau canônico, percentual estimado de DNA compartilhado e caminho passo a passo interativo.
  - **Painel Demográfico e Migratório**: Longevidade média por sexo, recordes de longevidade, histograma de nascimentos e óbitos por período histórico, distribuição etária e **Corredores de Migração (Origem → Destino)**.
- **Suporte Multilíngue**: Internacionalização completa em Português (`pt-BR`), Inglês (`en-US`), Espanhol (`es-MX`) e Chinês Simplificado (`zh-CN`).
- **Base de Dados de Exemplo**: Acompanha conjunto de dados genealógicos interconectados com quase 11.000 linhas (`sample.gedcom`, 229 indivíduos, 100 famílias e 7 gerações).

## 🚀 Utilização

### Abrir Arquivos
- Arraste e solte qualquer arquivo `.ged`, `.gedcom` ou `.txt` na janela do aplicativo.
- Ou clique em **Abrir Arquivo GEDCOM** na barra superior para selecionar via diálogo do sistema operacional.
- Clique em **Carregar Árvore de Exemplo** para explorar a base de demonstração integrada.

## 💻 Desenvolvimento

### ⚙️ Configuração

```bash
# Clonar o repositório
git clone https://github.com/planetsLightningArrester/atavismo.git
cd atavismo

# Instalar dependências da raiz, backend e frontend
npm ci

# Iniciar servidor de desenvolvimento (com hot-reload)
npm run start
```

### 🧪 Testes e Performance

```bash
# Executar verificações de segurança (Electronegativity), svelte-check e ESLint
npm run lint

# Compilar frontend e backend
npm run build

# Compilar ambiente de teste e executar suíte completa (Unitários + E2E Playwright)
npm run test

# Executar testes reutilizando a compilação existente em backend/dist
npm run test:run

# Executar suíte dedicada de benchmark de performance em tela cheia (CPU / FPS / CDP)
npm run test:perf
```

## 📜 Licença

Distribuído sob a licença [GNU GPLv3](LICENSE).
