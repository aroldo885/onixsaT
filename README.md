# OnixSat — Rastreamento de Frotas e Monitoramento de Excesso de Velocidade

Sistema de rastreamento de veículos e monitoramento de excessos de velocidade para operações de logística. Integra com a API OnixSat (rastreador de frota brasileiro) e suporta dois modos de operação: sincronização com o Orquestrador (backend corporativo) ou coleta local autônoma com visualização em mapa e relatórios.

## Visão Geral

O projeto oferece:

- **Coleta de posições GPS** — Busca incremental de mensagens de localização na API OnixSat
- **Detecção de violações** — Identifica excesso de velocidade (>80 km/h, configurável) e outros alertas
- **Mapa interativo** — Visualização de excessos no dia com filtro por placa
- **API REST** — Endpoints para consulta de excessos com filtros (período, placa, etc.)
- **Relatórios** — CSV e Excel com posições agrupadas por veículo/hora
- **Mapas de calor** — HTML estáticos com densidade de posições ou pontos de excesso
- **Sincronização Orquestrador** (opcional) — Jobs agendados que sincronizam equipamentos e posições com um backend externo

## Arquitetura

Existem dois fluxos independentes:

### 1. Modo Standalone (coletor local)

O fluxo mais comum para monitoramento em tempo real:

```
OnixSat API (XML/ZIP) → Coletor → saida/posicoes.jsonl
                                 → saida/violacoes.jsonl
                                 → saida/estado.json
                                         ↓
                              server_excessos.js (Express)
                              ├── /mapa    → React SPA (frontend/dist)
                              ├── /api/excessos
                              └── gerar.js (relatórios, heatmaps estáticos)
```

- **Coletor**: `coletar.js` (opções: `--with-violations`, `--once`, `--interval`)
- **Saída**: Arquivos JSONL na pasta `saida/`
- **Estado**: `estado.json` guarda o último `mId` para busca incremental

### 2. Modo Orquestrador (Bree jobs)

Para integração com o backend Smartcenter/Orquestrador:

```
OnixSat API → Jobs Bree (equipamento, posição) → Orquestrador API
```

- **Scheduler**: `index.js` com Bree
- **Jobs**: `src/jobs/equipamento.js` (sincroniza lista de veículos), `src/jobs/posicao.js` (sincroniza posições)
- Requer: `ORQUESTRADOR_API_BASE_URL` e variáveis de intervalo no `.env`

## Estrutura do Projeto

```
├── index.js                 # Scheduler Bree (modo Orquestrador)
├── package.json
├── .env                     # Configuração (copie de .env.example)
├── eslint.config.js         # ESLint flat config
├── saida/                   # Dados gerados
│   ├── posicoes.jsonl       # Posições GPS (uma por linha)
│   ├── violacoes.jsonl      # Violações detectadas
│   ├── estado.json          # Estado do coletor (lastMid)
│   └── map_veiculos.json    # Mapeamento veiID → placa (via test_onixsat --veiculos)
├── src/
│   ├── config.js            # Configuração centralizada (.env)
│   ├── utils.js
│   ├── jobs/                # Jobs Bree (equipamento, posição)
│   ├── services/            # OnixSat e Orquestrador
│   └── core/                # Módulos de negócio
│       ├── Collector.js     # Coleta mensagens OnixSat
│       ├── DataSource.js    # Leitura JSONL
│       ├── Defaults.js      # Valores padrão injetáveis
│       ├── ExcessosQuery.js # Filtro e query para API excessos
│       ├── HeatmapGenerator.js
│       ├── htmlFragments.js # Fragmentos HTML compartilhados
│       ├── OnixSatClient.js # Cliente API OnixSat + parsers
│       ├── ReportGenerator.js
│       └── enums.js
├── frontend/                # React SPA (mapa de excessos)
│   ├── index.html
│   ├── vite.config.js
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   └── components/      # MapContainer, ExcessMap, PlacaSelector, InfoPanel
│   └── dist/               # Build (gerado por npm run onixsat:frontend:build)
├── scripts/
│   ├── coletar.js           # Coletor (--with-violations, --once, --interval)
│   ├── server_excessos.js   # Express: /mapa (React SPA) + /api/excessos
│   ├── gerar.js             # mapa-calor | relatorio (--excesso, --format, --with-placa)
│   ├── data.js              # --check | --compilar (diagnóstico e CSV histórico)
│   └── test_onixsat.js      # --veiculos | --posicoes (testa API OnixSat)
├── assets/leaflet/          # Leaflet local (opcional, ver get_leaflet)
├── get_leaflet.ps1 / .bat   # Download do Leaflet para uso offline
```

## Pré-requisitos

- Node.js 14+
- npm ou yarn

## Linting e Formatação

O projeto utiliza ESLint e Prettier:

- **ESLint** — `eslint.config.js` (flat config), `eslint-plugin-react` para frontend JSX
- **Prettier** — Formatação consistente (`.prettierrc`)

Após `npm install`, execute `npm run lint` e `npm run format:check` para validar o código.

## Configuração

Toda a configuração é centralizada em `src/config.js`, que carrega variáveis do `.env` e exporta objetos tipados (`onixsat`, `orquestrador`, `coletor`, `server`, `paths`, etc.).

1. Copie o arquivo de exemplo e preencha as credenciais:

```bash
cp .env.example .env
```

2. Edite o `.env` com suas credenciais OnixSat:

```env
# Obrigatório para coleta e testes
ONIXSAT_WS_URL=http://webservice.newrastreamentoonline.com.br
ONIXSAT_LOGIN=seu_login
ONIXSAT_SENHA=sua_senha

# Servidor (mapa e API)
PORT=8081
EXCESSOS_MAX_POINTS=5000
SPEED_MIN=81
LAST_HOURS_DEFAULT=24

# Coletor (coletar_posicoes_loop; coletar_posicoes_e_violacoes usa 5 min fixo)
COLLECT_INTERVAL_MS=60000
SPEED_LIMIT=80
EXCESSO_TEXT=excesso de velocidade

# Throttle OnixSat (quando a API exige intervalo mínimo)
ONIXSAT_BACKOFF_MAX_MS=600000
ONIXSAT_BACKOFF_FACTOR=2
```

3. **Orquestrador** (somente para modo Bree):

```env
ORQUESTRADOR_API_BASE_URL=https://url-do-orquestrador
ONIXSAT_API_INTERVALO_SINCRONIZACAO_EQUIPAMENTO=0 0 * * * *
ONIXSAT_API_INTERVALO_SINCRONIZACAO_POSICAO=0 * * * * *
ONIXSAT_API_PASTA_ARQUIVO=/caminho/para/temp
SCHEDULE_PASTA_LOG=/caminho/para/logs
```

## Como Rodar

### Instalação

```bash
npm install
```

### Mapeamento de veículos (recomendado antes dos relatórios)

Gera `saida/map_veiculos.json` para exibir placas em vez de IDs internos:

```bash
npm run onixsat:veiculos
```

### Coletor + servidor (modo completo)

Coleta posições e violações e sobe o mapa. Buildar o frontend uma vez antes:

```bash
npm run onixsat:frontend:build
npm run onixsat:all
```

Ou manualmente em terminais separados:

```bash
# Build do mapa (uma vez)
npm run onixsat:frontend:build

# Terminal 1: coletor
npm run onixsat:coletor:all

# Terminal 2: servidor
npm run onixsat:server
```

### Apenas coletor de posições (sem violações)

```bash
npm run onixsat:coletor
# ou com intervalo customizado:
node scripts/coletar.js --interval 60000
```

### One-shot (uma execução, sai)

```bash
node scripts/coletar.js --once
```

### Apenas servidor (mapa + API)

Útil quando você já tem dados em `saida/`. O servidor entrega o React SPA em `/mapa`; é necessário buildar o frontend antes:

```bash
npm run onixsat:frontend:build
npm run onixsat:server
```

Ou use `npm run onixsat:build` para buildar e iniciar em um comando. Porta padrão: **8081**. Para alterar: `PORT=8082 npm run onixsat:server`

### Scheduler Orquestrador (modo Bree)

```bash
npm start
# ou com reload: npm run dev
```

## Uso do Mapa e da API

Após iniciar o servidor (com frontend buildado):

- **Mapa com excessos de hoje** (React SPA): http://localhost:8081/mapa
- **API de excessos** (JSON): http://localhost:8081/api/excessos

### Parâmetros da API `/api/excessos`

| Parâmetro   | Descrição                                        | Exemplo         |
| ----------- | ------------------------------------------------ | --------------- |
| `today`     | 1 = apenas excessos de hoje                      | `today=1`       |
| `company80` | 1 = regra empresa: velocidade > 80 km/h          | `company80=1`   |
| `lastHours` | Últimas N horas                                  | `lastHours=6`   |
| `placa`     | Filtrar por placa                                | `placa=ABC1234` |
| `speedMin`  | Velocidade mínima (km/h) para considerar excesso | `speedMin=81`   |
| `stats`     | 1 = incluir estatísticas na resposta             | `stats=1`       |
| `dedupe`    | 1 = deduplicar por mId                           | `dedupe=1`      |

Exemplo de diagnóstico:

```
http://localhost:8081/api/excessos?lastHours=6&officialOnly=0&dedupe=0&speedMin=1&stats=1
```

## Relatórios e Mapas de Calor

Execute manualmente após haver dados em `saida/posicoes.jsonl`:

| Comando                                                      | Saída                                                 | Descrição                       |
| ------------------------------------------------------------ | ----------------------------------------------------- | ------------------------------- |
| `node scripts/gerar.js relatorio`                            | `saida/relatorio_hora.csv`                            | Posições por veículo/hora (CSV) |
| `node scripts/gerar.js relatorio --format xlsx`              | `saida/relatorio_posicoes_hora_a_hora.xlsx`           | Mesmo relatório em Excel        |
| `node scripts/gerar.js relatorio --format xlsx --with-placa` | `saida/relatorio_posicoes_hora_a_hora_COM_PLACA.xlsx` | Excel com placa                 |
| `node scripts/gerar.js mapa-calor`                           | `saida/mapa_calor.html`                               | Heatmap de posições             |
| `node scripts/gerar.js mapa-calor --excesso`                 | `saida/mapa_calor_excesso_80.html`                    | Heatmap de excessos (>80)       |
| `node scripts/data.js --compilar`                            | `saida/historico_posicoes.csv`                        | Histórico bruto em CSV          |
| `node scripts/data.js --check`                               | (console)                                             | Diagnóstico rápido dos dados    |

Filtros opcionais via `.env`:

- `HEATMAP_DATE=2026-02-25` — Data específica para heatmap
- `HEATMAP_PLACA=EJV1G53` — Filtrar por placa

## Leaflet Local (uso offline)

Se a rede bloquear o CDN do Leaflet, baixe os assets localmente:

- **PowerShell**: `./get_leaflet.ps1`
- **CMD**: `get_leaflet.bat`

Arquivos em `assets/leaflet/`: `leaflet.css` e `leaflet.js`.

## Referência de Comandos NPM

| Comando                          | Descrição                                      |
| -------------------------------- | ---------------------------------------------- |
| `npm start`                      | Scheduler Bree (jobs Orquestrador)             |
| `npm run dev`                    | Scheduler com nodemon --inspect                |
| `npm run onixsat:veiculos`       | Testa busca de veículos + gera map_veiculos    |
| `npm run onixsat:coletor`        | Coletor somente posições                       |
| `npm run onixsat:coletor:all`    | Coletor posições + violações                   |
| `npm run onixsat:frontend:build` | Build do React SPA (Vite)                      |
| `npm run onixsat:frontend:dev`   | Dev server do frontend (Vite)                  |
| `npm run onixsat:server`         | Servidor mapa + API (requer frontend buildado) |
| `npm run onixsat:build`          | Build frontend + inicia servidor               |
| `npm run onixsat:all`            | Coletor + servidor em paralelo                 |
| `npm run lint`                   | Executa ESLint                                 |
| `npm run lint:fix`               | ESLint com auto-fix                            |
| `npm run format`                 | Formata código com Prettier                    |
| `npm run format:check`           | Verifica formatação sem alterar                |

## Troubleshooting

- **Credenciais**: Garanta que `ONIXSAT_WS_URL`, `ONIXSAT_LOGIN` e `ONIXSAT_SENHA` estão corretos no `.env`.
- **Throttle OnixSat**: Se surgir erro de "tempo mínimo para reenvio", o coletor aplica backoff automático. Ajuste `ONIXSAT_BACKOFF_MAX_MS` se necessário.
- **Placas vazias no mapa**: Rode `npm run onixsat:veiculos` para gerar `saida/map_veiculos.json`.
- **Mapa em branco**: Execute `npm run onixsat:frontend:build` antes de `npm run onixsat:server`.
