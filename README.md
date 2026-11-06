# IA-HARI

Assistente para consulta de horários e orientação de salas da Escola SENAI
Anchieta.

## Arquitetura

O frontend usa um ponto de entrada ES Module e módulos de domínio carregados
sequencialmente, sem bundler. Os módulos de domínio são scripts clássicos
intencionais: isso preserva os contratos globais já usados pelos callbacks do
Android, pelos eventos inline e pelo mapa, sem alterar o comportamento durante a
migração.

- `client/index.html`: estrutura semântica de todas as telas.
- `client/styles.css`: estilos existentes preservados.
- `client/src/main.js`: carregador e orquestrador do frontend.
- `client/src/platform/platform.js`: ponte de plataforma, voz, microfone, notificações e compatibilidade Android.
- `client/src/data/appData.js`: dados de exemplo e constantes da unidade.
- `client/src/core/storage.js`: persistência, migrações e configurações.
- `client/src/core/utils.js`: utilitários, situação da aula e esfera visual.
- `client/src/features/assistant.js`: navegação, chat, contexto e modo offline.
- `client/src/features/schedule.js`: horários e edição de aulas.
- `client/src/features/forms.js`: folhas, ajustes, salas e blocos.
- `client/src/features/auth.js`: contas e perfis locais.
- `client/src/features/agenda.js`: agenda, eventos e conflitos.
- `client/src/features/unit.js`: cursos, unidade, voz e lembretes.
- `client/src/map/map2d.js`: mapa SVG, busca e rotas 2D.
- `client/src/map/map3d.js`: Canvas 3D, câmera e navegação passo a passo.
- `client/src/bootstrap.js`: composição final, eventos e inicialização.


- `server/server.js`: bootstrap do Express.
- `server/src/config/`: configuração do Gemini e ambiente.
- `server/src/controllers/`: entrada e validação HTTP.
- `server/src/services/`: casos de uso, sem persistência.
- `server/src/agent/`: personalidade e Function Calling.
- `server/src/data/`: mocks isolados de horários e salas.
- `server/src/routes/`: endpoints REST.

## Execução

Configure a chave no `.env` da raiz ou no ambiente da Railway:

```env
GEMINI_API_KEY=sua_chave
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FALLBACK_MODEL=gemini-3.7-flash
PORT=3000
CLIENT_ORIGIN=http://localhost:5500
```

Depois execute:

```bash
npm install
npm start
```

Verificação: `GET /health`. Chat: `POST /api/chat` com
`{"message":"Onde fica a sala 304?"}`.

## Migração do frontend

1. Mapear funções por domínio: conversa, horários, salas, mapa e preferências.
2. Copiar dados estáticos para `server/src/data/`, mantendo-os sem lógica.
3. Encapsular cada consulta em uma tool com schema e handler.
4. Transferir a personalidade para `systemInstruction.js`.
5. Migrar o fluxo Gemini para `server/src/services/chatService.js`.
6. Expor somente contratos HTTP pelos controllers e routes.
7. Carregar os módulos do cliente por `client/src/main.js`.
8. Manter a chave de texto da IA no servidor; a ponte de plataforma permanece para compatibilidade de voz/Android.
