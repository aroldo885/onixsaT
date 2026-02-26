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
                              server_excessos.js (mapa + API)
                              gerar_relatorio_*.js (relatórios)
                              gerar_mapa_calor*.js (heatmaps)
```

- **Coletor**: `coletar_posicoes_e_violacoes.js` ou `coletar_posicoes_loop.js`
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
├── saida/                   # Dados gerados
│   ├── posicoes.jsonl       # Posições GPS (uma por linha)
│   ├── violacoes.jsonl      # Violações detectadas
│   ├── estado.json          # Estado do coletor (lastMid)
│   └── map_veiculos.json    # Mapeamento veiID → placa (via test_veiculos)
├── src/
│   ├── jobs/                # Jobs Bree
│   ├── services/            # OnixSat e Orquestrador
│   ├── functions/           # Lógica de negócio (ex.: tradução de eventos)
│   └── utils.js
├── scripts/
│   ├── coletar_posicoes_loop.js      # Coletor só posições
│   ├── coletar_posicoes_e_violacoes.js # Coletor posições + violações
│   ├── server_excessos.js            # Servidor mapa + API
│   ├── gerar_relatorio_hora.js       # Relatório CSV
│   ├── gerar_relatorio_hora_xlsx.js  # Relatório Excel
│   ├── gerar_relatorio_com_placa_xlsx.js
│   ├── gerar_mapa_calor.js           # Heatmap de posições
│   ├── gerar_mapa_calor_excesso80.js # Heatmap de excessos
│   ├── compilar_csv.js               # CSV histórico
│   ├── check-data.js                 # Diagnóstico rápido
│   ├── test_veiculos.js              # Testa busca de veículos + gera map_veiculos
│   └── test_posicoes.js              # Testa busca de posições
├── assets/leaflet/          # Leaflet local (opcional, ver get_leaflet)
├── get_leaflet.ps1 / .bat   # Download do Leaflet para uso offline
```

## Pré-requisitos

- Node.js 14+
- npm ou yarn

## Linting e Formatação

O projeto utiliza ESLint, Prettier e EditorConfig:

- **ESLint** — Regras de qualidade (`.eslintrc.json`)
- **Prettier** — Formatação consistente (`.prettierrc`)
- **EditorConfig** — Configuração básica de editor (`.editorconfig`)

Após `npm install`, execute `npm run lint` e `npm run format:check` para validar o código.

## Configuração

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

Coleta posições e violações a cada 5 minutos e sobe o mapa:

```bash
npm run onixsat:all
```

Ou manualmente em terminais separados:

```bash
# Terminal 1: coletor
npm run onixsat:coletor:all

# Terminal 2: servidor
npm run onixsat:server
```

### Apenas coletor de posições (sem violações)

```bash
npm run onixsat:coletor
```

### Apenas servidor (mapa + API)

Útil quando você já tem dados em `saida/`:

```bash
npm run onixsat:server
```

Porta padrão: **8081**. Para alterar: `PORT=8082 npm run onixsat:server`

### Scheduler Orquestrador (modo Bree)

```bash
npm start
# ou com reload: npm run dev
```

## Uso do Mapa e da API

Após iniciar o servidor:

- **Mapa com excessos de hoje**: http://localhost:8081/mapa
- **Mapa de teste** (sem API): http://localhost:8081/mapa_teste
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

| Script                                           | Saída                                                 | Descrição                       |
| ------------------------------------------------ | ----------------------------------------------------- | ------------------------------- |
| `node scripts/gerar_relatorio_hora.js`           | `saida/relatorio_hora.csv`                            | Posições por veículo/hora (CSV) |
| `node scripts/gerar_relatorio_hora_xlsx.js`      | `saida/relatorio_posicoes_hora_a_hora.xlsx`           | Mesmo relatório em Excel        |
| `node scripts/gerar_relatorio_com_placa_xlsx.js` | `saida/relatorio_posicoes_hora_a_hora_COM_PLACA.xlsx` | Excel com mapeamento de placa   |
| `node scripts/gerar_mapa_calor.js`               | `saida/mapa_calor.html`                               | Heatmap de posições             |
| `node scripts/gerar_mapa_calor_excesso80.js`     | `saida/mapa_calor_excesso_80.html`                    | Heatmap de excessos (>80)       |
| `node scripts/compilar_csv.js`                   | `saida/historico_posicoes.csv`                        | Histórico bruto em CSV          |
| `node scripts/check-data.js`                     | (console)                                             | Diagnóstico rápido dos dados    |

Filtros opcionais via `.env`:

- `HEATMAP_DATE=2026-02-25` — Data específica para heatmap
- `HEATMAP_PLACA=EJV1G53` — Filtrar por placa

## Leaflet Local (uso offline)

Se a rede bloquear o CDN do Leaflet, baixe os assets localmente:

- **PowerShell**: `./get_leaflet.ps1`
- **CMD**: `get_leaflet.bat`

Arquivos em `assets/leaflet/`: `leaflet.css` e `leaflet.js`.

## Referência de Comandos NPM

| Comando                       | Descrição                                   |
| ----------------------------- | ------------------------------------------- |
| `npm start`                   | Scheduler Bree (jobs Orquestrador)          |
| `npm run dev`                 | Scheduler com nodemon --inspect             |
| `npm run onixsat:veiculos`    | Testa busca de veículos + gera map_veiculos |
| `npm run onixsat:coletor`     | Coletor somente posições                    |
| `npm run onixsat:coletor:all` | Coletor posições + violações                |
| `npm run onixsat:server`      | Servidor mapa + API                         |
| `npm run onixsat:all`         | Coletor + servidor em paralelo              |
| `npm run lint`                | Executa ESLint                              |
| `npm run lint:fix`            | ESLint com auto-fix                         |
| `npm run format`              | Formata código com Prettier                 |
| `npm run format:check`        | Verifica formatação sem alterar             |

## Troubleshooting

- **Credenciais**: Garanta que `ONIXSAT_WS_URL`, `ONIXSAT_LOGIN` e `ONIXSAT_SENHA` estão corretos no `.env`.
- **Throttle OnixSat**: Se surgir erro de "tempo mínimo para reenvio", o coletor aplica backoff automático. Ajuste `ONIXSAT_BACKOFF_MAX_MS` se necessário.
- **Placas vazias no mapa**: Rode `npm run onixsat:veiculos` para gerar `saida/map_veiculos.json`.
- **mapa_teste**: Use para testar o carregamento do Leaflet sem depender da API de excessos.
