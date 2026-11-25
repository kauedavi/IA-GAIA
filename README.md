# IA-GAIA

![Logotipo do GAIA](client/src/img/logo-android.png)

Aplicação web e Android para consulta de horários, localização de salas e orientação na Escola SENAI Anchieta.

## Visão rápida

- **Frontend:** HTML, CSS e JavaScript Vanilla com ES Modules.
- **Backend:** Node.js, Express e Google Gemini via SDK `@google/genai`.
- **Dados:** planilhas `.xlsx`, `.xls` ou `.csv` carregadas pelo backend; SQLite mantido para dados legados e importações.
- **Android:** pacote híbrido gerado pelo Capacitor.
- **Streaming:** o chat tenta SSE em `/api/chat/stream` e usa fallback para JSON em `/api/chat`.
- **Produção:** a API pode ser publicada no Railway e o frontend pode ser hospedado separadamente.

## Índice

- [Pré-requisitos](#pré-requisitos)
- [Início rápido](#início-rápido)
- [Configuração](#configuração)
- [Executar a aplicação](#executar-a-aplicação)
- [Arquitetura](#arquitetura)
- [API HTTP](#api-http)
- [Fonte de horários e salas](#fonte-de-horários-e-salas)
- [Streaming e otimizações](#streaming-e-otimizações)
- [Testes](#testes)
- [Gerar o APK Android](#gerar-o-apk-android)
- [Diagnóstico de latência](#diagnóstico-de-latência)

## Pré-requisitos

### Desenvolvimento web

- Node.js 18 ou superior.
- Chave da API Google Gemini.
- Navegador moderno.

### Desenvolvimento Android

- Tudo acima.
- Android Studio.
- Android SDK.
- JDK 17 ou superior.

## Início rápido

Na raiz do projeto:

```bash
npm install
npm start
```

A API fica disponível em `http://localhost:3000`.

Para verificar se o backend iniciou:

```bash
curl http://localhost:3000/health
```

Para abrir o frontend, sirva o diretório `client/` em um servidor estático. Por exemplo:

```bash
npx http-server client -p 5500
```

Acesse `http://localhost:5500`.

## Configuração

### Backend

Copie o exemplo de ambiente:

```bash
copy server\.env.example server\.env
```

Variáveis suportadas:

| Variável | Obrigatória | Padrão | Uso |
|---|---:|---|---|
| `GEMINI_API_KEY` | Sim | - | Autentica as chamadas ao Google Gemini |
| `GEMINI_MODEL` | Não | `gemini-3.8-flash` | Modelo principal |
| `GEMINI_FALLBACK_MODEL` | Não | `gemini-3.7-flash` | Modelo usado após falhas do principal |
| `PORT` | Não | `3000` | Porta HTTP da API |
| `CLIENT_ORIGIN` | Não | - | Origens adicionais permitidas pelo CORS, separadas por vírgula |
| `GAIA_SPREADSHEET_PATH` | Não | `server/src/data/gaia.xlsx` | Caminho da planilha de horários, salas e cursos |

Exemplo:

```env
PORT=3000
CLIENT_ORIGIN=http://localhost:5500
GEMINI_API_KEY=sua_chave
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.7-flash
GAIA_SPREADSHEET_PATH=C:\caminho\para\gaia.xlsx
```

> Nunca envie `GEMINI_API_KEY` para o frontend. Ela deve existir apenas no processo do backend.

### Frontend

O frontend não usa bundler nem carrega arquivos `.env`.

Defina o endereço da API em `client/src/config.js`:

```js
export const GAIA_API_URL =
  "http://localhost:3000/api/chat";
```

Para desenvolvimento local, use a URL local. Para produção, use a URL pública da API, sem a chave do Gemini no código do cliente.

## Executar a aplicação

### Backend

```bash
npm start
```

O processo inicia o Express e o observador da planilha.

### Frontend

Sirva `client/` com qualquer servidor estático. Abrir `client/index.html` diretamente pode impedir o carregamento correto dos ES Modules em alguns navegadores.

### Testar uma conversa

```bash
curl -X POST http://localhost:3000/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Onde fica a sala 304?\"}"
```

No PowerShell, use `Invoke-RestMethod` caso `^` não faça parte do comando desejado:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/chat" `
  -Method Post `
  -ContentType "application/json" `
  -Body '{"message":"Onde fica a sala 304?"}'
```

## Arquitetura

```text
IA-HARI/
├── client/
│   ├── index.html
│   ├── styles.css
│   └── src/
│       ├── main.js
│       ├── config.js
│       ├── bootstrap.js
│       ├── core/
│       ├── features/
│       ├── map/
│       ├── platform/
│       └── data/
├── server/
│   ├── app.js
│   ├── server.js
│   ├── scripts/
│   ├── src/
│   │   ├── agent/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── data/
│   │   ├── database/
│   │   ├── middleware/
│   │   ├── observability/
│   │   ├── routes/
│   │   └── services/
│   └── test/
├── android/
└── capacitor.config.json
```

### Frontend

- `client/src/main.js`: ponto de entrada dos módulos.
- `client/src/bootstrap.js`: composição da interface e inicialização.
- `client/src/features/`: chat, agenda, autenticação, horários e dados da unidade.
- `client/src/map/`: mapa 2D e visualizações 3D.
- `client/src/platform/platform.js`: voz, microfone, notificações e ponte Android.
- `client/src/features/chatStream.js`: consumo de SSE e fallback JSON.

### Backend

- `server/app.js`: criação da aplicação Express, CORS e rotas.
- `server/server.js`: inicialização do servidor e observação da planilha.
- `routes/`: contratos HTTP.
- `controllers/`: validação da requisição e resposta.
- `services/`: regras de aplicação.
- `agent/tools/`: ferramentas disponíveis ao Gemini.
- `agent/systemInstruction.js`: instruções de personalidade e comportamento.
- `data/`: dados de fallback e arquivos legados.
- `database/`: implementação SQLite legada e esquema.
- `middleware/` e `observability/`: métricas e logs estruturados.

## API HTTP

### Saúde

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/health` | Estado básico da API |

### Chat

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/api/chat` | Resposta JSON completa |
| `POST` | `/api/chat/stream` | Resposta progressiva via Server-Sent Events |

Corpo JSON:

```json
{
  "message": "Qual sala pertence à turma T1?"
}
```

Limite do corpo JSON: 32 KB.

### Planilha

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/planilha/status` | Fonte atual e contagens |
| `GET` | `/api/planilha/dados` | Dados completos em memória |
| `POST` | `/api/planilha/recarregar` | Recarrega o arquivo configurado |
| `POST` | `/api/planilha/upload` | Envia uma planilha no campo multipart `arquivo` |
| `GET` | `/api/planilha/eventos` | Notificações SSE de recarga |

Exemplo de upload no PowerShell:

```powershell
curl.exe -F "arquivo=@C:\caminho\gaia.xlsx" http://localhost:3000/api/planilha/upload
```

## Fonte de horários e salas

O backend aceita arquivos `.xlsx`, `.xls` e `.csv`. O arquivo padrão é `server/src/data/gaia.xlsx`, mas pode ser definido por `GAIA_SPREADSHEET_PATH` ou enviado pela API.

Alterações no arquivo são monitoradas e carregadas automaticamente. Após recarregar, o cache de consultas determinísticas é limpo.

Abas reconhecidas:

### Horários

Colunas aceitas:

- `Turma`
- `Dia`
- `Início`
- `Fim`
- `Disciplina`
- `Professor`
- `Sala`

### Salas

Colunas aceitas:

- `ID`
- `Nome`
- `Bloco`
- `Andar`
- `Tipo`
- `X`
- `Y`
- `Dica`

### Cursos

Colunas aceitas:

- `Nome`
- `Código`
- `Nível`
- `Turma`
- `Turno`
- `Modalidade`
- `Descrição`

Os nomes de abas e colunas são normalizados: não diferenciam maiúsculas, minúsculas, acentos, espaços ou sublinhados.

O frontend pode enviar uma nova planilha pela tela de Configurações. A API informa a quantidade de horários, salas e cursos carregados.

## Streaming e otimizações

### Chat com SSE

O cliente tenta `POST /api/chat/stream` primeiro.

- A resposta usa eventos `chunk`, `reset`, `done` e `error`.
- Quando há uma chamada de ferramenta Gemini entre partes de texto, o cliente remove o texto anterior e aplica a resposta final.
- Quando SSE não está disponível ou retorna um status legado, o cliente volta automaticamente para `POST /api/chat`.

### Respostas locais

Consultas simples de salas podem ser resolvidas diretamente no backend sem chamar o Gemini. Isso reduz latência e consumo de tokens.

### Cache de horários

As consultas determinísticas de horários usam um cache em memória limitado a 128 combinações.

- É local ao processo da API.
- Não é compartilhado entre instâncias.
- Não persiste após reiniciar.
- Não guarda respostas completas do chat.
- Não elimina a chamada inicial ao Gemini em todos os fluxos.

Os logs registram hits, misses e duração do cache sem armazenar filtros ou resultados.

### Deadline e fallback

Uma chamada de chat tem limite máximo de 25 segundos, até quatro rodadas de ferramentas e até três tentativas por modelo. Em falhas transitórias, o backend pode tentar o modelo fallback configurado em `GEMINI_FALLBACK_MODEL`.

## Testes

Execute todos os testes automatizados na raiz:

```bash
npm test
```

Os testes cobrem backend, ferramentas Gemini, métricas, intenção local de salas e transporte de streaming do cliente.

Arquivos importantes:

- `server/test/*.test.js`: Express, chat, ferramentas, cache, métricas e planilha.
- `client/test/*.test.js`: transporte SSE e fallback do frontend.

## Gerar o APK Android

O projeto usa Capacitor para empacotar `client/` em um aplicativo Android. A API não é incluída no APK.

### Sincronizar o frontend

Após alterar o conteúdo de `client/`:

```bash
npm run cap:sync
```

### Gerar um APK de depuração

```bash
npm run android:build
```

O resultado fica em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Para executar em um dispositivo ou emulador configurado:

```bash
npm run android:run
```

Para abrir o projeto no Android Studio:

```bash
npm run android:open
```

### Produção Android

No Android Studio, use **Build > Generate Signed App Bundle or APK**.

Antes da build final:

1. Configure `client/src/config.js` para apontar à API pública.
2. Configure `GEMINI_API_KEY` no ambiente da API.
3. Adicione a URL pública do frontend em `CLIENT_ORIGIN`.
4. Execute `npm run cap:sync`.
5. Teste login, chat, mapa, voz, localização e comportamento offline.
6. Gere e instale uma versão assinada em um dispositivo real.

O WebView do Capacitor usa `https://localhost`. Essa origem já está liberada pelo CORS do backend.

Alterações somente no backend não exigem novo APK. Alterações em `client/` exigem nova sincronização e build.

## Diagnóstico de latência

Cada `POST /api/chat` registra uma linha JSON `api_latency`. Os dados não incluem a mensagem, argumentos das ferramentas, chaves de API nem texto de erro completo do Gemini.

A métrica contém:

- Duração total e chamadas Gemini.
- Retries, fallback e backoff.
- Duração das ferramentas.
- Número de rodadas.
- Status HTTP e tamanho aproximado da resposta.
- Bytes das respostas de ferramentas enviadas ao Gemini.
- Intervalo desde a requisição anterior.
- Estado `first_call`, `active_calls` ou `idle_5m`.

Salve os logs estruturados em um arquivo `.jsonl` e execute:

```bash
node server/scripts/summarize-latency.js caminho/para/api-logs.jsonl
```

O resumo calcula:

- Latência p50/p95 geral e por estado de atividade.
- Taxa de erros e uso de fallback.
- Tamanho médio das respostas das ferramentas.
- Tamanho médio, p50 e p95 da resposta HTTP.
- Métricas de cache de horários.

Os dados são processados localmente e não são enviados a serviços externos.
