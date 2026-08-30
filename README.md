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
    - [🧪 Testes](#-testes)
  - [📜 Licença](#-licença)

## ✨ Recursos

- **Motor de Leitura GEDCOM Sem Dependências de Terceiros**: Analisador léxico e sintático próprio em TypeScript puro para os padrões GEDCOM 5.5 e 5.5.1 sem bibliotecas externas.
- **Visualizador Interativo de Árvore Genealógica**: Navegue por indivíduos, cônjuges, pais e filhos com árvore de linhagem intuitiva.
- **Busca e Filtros Instantâneos**: Pesquise milhares de registros por nome, sobrenome ou ID com filtros em tempo real.
- **Inspetor de Registros**: Informações vitais, datas de nascimento/óbito, casamentos e notas biográficas detalhadas.
- **Suporte Multilíngue**: Suporte completo a Português (`pt-BR`), Inglês (`en-US`), Espanhol (`es-MX`) e Chinês Simplificado (`zh-CN`).
- **Base de Dados de Exemplo**: Acompanha conjunto de dados reais com mais de 3.850 linhas pronto para exploração.

## 🚀 Utilização

### Abrir Arquivos
- Arraste e solte qualquer arquivo `.ged`, `.gedcom` ou `.txt` na janela do aplicativo.
- Ou clique em **Abrir Arquivo GEDCOM** na barra superior para selecionar via diálogo do sistema operacional.
- Clique em **Carregar Árvore de Exemplo** para explorar a base de teste integrada.

## 💻 Desenvolvimento

### ⚙️ Configuração

```bash
# Clonar o repositório
git clone https://github.com/planetsLightningArrester/atavismo.git
cd atavismo

# Instalar dependências da raiz, backend e frontend
npm run preinstall

# Iniciar servidor de desenvolvimento (com hot-reload)
npm run start
```

### 🧪 Testes e Verificação

```bash
# Executar linters no backend e frontend
npm run lint

# Compilar frontend e backend
npm run build

# Executar testes ponta a ponta (E2E) com Playwright
npm run test
```

## 📜 Licença

Distribuído sob a licença [GNU GPLv3](LICENSE).
