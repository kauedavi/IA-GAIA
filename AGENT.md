# AGENT.md - Diretrizes do projeto G.A.I.A

Este documento define como agentes e desenvolvedores devem analisar, implementar, validar e manter o G.A.I.A.

## 1. Visão geral

O G.A.I.A ajuda alunos e funcionários da Escola SENAI Anchieta a consultar horários, localizar salas e usar o mapa da unidade.

O projeto possui três superfícies integradas:

- `client/`: aplicação web estática em Vanilla JavaScript.
- `server/`: API Node.js/Express com Gemini, planilhas e métricas.
- `android/`: aplicativo híbrido criado pelo Capacitor a partir de `client/`.

A entrega deve preservar a separação de responsabilidades: a chave Gemini nunca sai do backend; dados operacionais vêm da planilha quando disponíveis; e o código Android não replica a lógica do frontend.

## 2. Metodologia obrigatória

Antes de alterar código:

1. Leia os arquivos diretamente relacionados e o README.
2. Determine se a mudança afeta frontend, backend, planilha, streaming ou Android.
3. Localize o padrão existente no mesmo domínio.
4. Faça uma mudança completa e cirúrgica.
5. Atualize testes e documentação diretamente relacionadas.
6. Execute o menor conjunto de validações que cobre a alteração.

Fluxo para bugs:

1. Reproduza ou confirme o cenário.
2. Identifique a causa raiz.
3. Corrija o módulo responsável.
4. Evite ampliar o escopo para problemas não relacionados.
5. Adicione ou ajuste um teste que falhe sem a correção.

Não assuma comportamento não presente no repositório. Não introduza framework, biblioteca ou padrão arquitetural apenas para modernizar o projeto.

## 3. Convenções gerais

### Idioma e nomenclatura

- Use português para nomes que representam diretamente o domínio do projeto: `horarios`, `sala`, `turma`, `planilha`.
- Use inglês em nomes técnicos de transporte e infraestrutura quando seguir o padrão já existente: `chatService`, `chatStream`, `latencyMetrics`.
- Use `camelCase` para variáveis e funções.
- Use `UPPER_SNAKE_CASE` para constantes.
- Use `PascalCase` para classes Java e somente quando o projeto realmente utilizar classes.
- Use nomes que expressem intenção, não abreviações ambíguas.

Exemplo:

```js
// Evite
const d = await getH(t);

// Prefira
const classSchedule = await getHorarios({ turma: classId });
```

### JavaScript

- Use indentações de 2 espaços.
- Use ponto e vírgula.
- Use `async/await` para operações assíncronas.
- Não deixe blocos `catch` vazios.
- Não use casts ou contornos artificiais em JavaScript.
- Preserve a API pública existente quando uma alteração puder afetar módulos carregados globalmente.
- Evite comentário que apenas repita o código.
- Comente regras não óbvias, compatibilidade legada, limites de rede ou invariantes importantes.
- Não deixe `console.log` temporário em produção.

### Arquivos

- Prefira arquivos e funções com responsabilidade única.
- Extraia helpers locais quando um bloco estiver difícil de testar ou entender.
- Não crie abstrações antes que haja repetição ou responsabilidade clara.
- Atualize imports, exports e referências globais em conjunto.
- Remova somente código morto relacionado à alteração.

## 4. Backend

### Estrutura

```text
server/
├── app.js
├── server.js
├── scripts/
├── src/
│   ├── agent/
│   ├── config/
│   ├── controllers/
│   ├── data/
│   ├── database/
│   ├── middleware/
│   ├── observability/
│   ├── routes/
│   └── services/
└── test/
```

Respeite esta divisão:

- `routes/`: declaração de endpoints, sem regra de negócio.
- `controllers/`: validação HTTP, status, envelopes e delegação.
- `services/`: regras da aplicação e integração com Gemini ou planilha.
- `agent/`: instrução de sistema e ferramentas de Function Calling.
- `data/`: fallbacks isolados e dados estáticos.
- `database/`: SQLite de horários, esquema e scripts de conferência (o `.db` é gerado, não versionado).
- `middleware/`: enriquecimento da requisição, CORS e observabilidade.
- `observability/`: preparação e sumarização de métricas.

### Express e respostas

- Use o formato existente:

```json
{
  "success": true,
  "data": {}
}
```

- Em falhas HTTP, use `success: false` e uma mensagem clara.
- Controllers não acessam Gemini, planilhas ou arquivos diretamente.
- Serviços não formatam respostas Express.
- Encaminhe erros para o middleware existente com `next(error)`.
- Preserve os limites já usados pela API, como 32 KB no corpo JSON e 2000 caracteres no chat.
- Não exponha chave, stack trace, payload completo do Gemini ou dados sensíveis em respostas ou logs.

### Gemini

- Use somente `@google/genai`.
- Leia a chave e os modelos por ambiente em `server/src/config/gemini.js`.
- Nunca coloque a chave em clientes, logs, testes ou arquivos versionados.
- Mantenha `GEMINI_MODEL` e `GEMINI_FALLBACK_MODEL` configuráveis.
- Preserve o deadline, os retries transitórios e o limite de rodadas antes de alterar o fluxo.
- Não envie mensagens completas ou metadados desnecessários para ferramentas.
- Novas ferramentas devem declarar nome, schema e handler consistentes com `agent/tools/index.js`.
- Respeite o cache e os limites de tamanho usados para economizar tokens.

### Planilhas e dados

- A fonte operacional atual é uma planilha `.xlsx`, `.xls` ou `.csv`.
- Use `spreadsheetService.js` como fonte central dos dados carregados.
- Normalize nomes de abas e colunas sem alterar a identificação oficial.
- Preserve o comportamento de fallback de salas apenas quando não houver correspondência na planilha.
- Não mantenha consultas novas baseadas nos mocks como fonte principal.
- Recarregar uma planilha deve invalidar dados derivados e cache de consultas.
- Upload deve validar extensão e tamanho antes de persistir.
- Mudanças no formato da planilha precisam atualizar o parser, os testes e o README.

### SQLite

O SQLite guarda a grade de horários importada da planilha, em cinco tabelas (`turmas`, `disciplinas`, `professores`, `ambientes`, `horarios`). Ele **não** é a fonte que o app consulta: `agent/tools/horariosTool.js` usa `spreadsheetService.js`, porque a planilha também alimenta salas e cursos (`gpsTool`, `localRoomIntent`) e tem o fluxo de upload e recarga a quente.

O schema existe como protótipo do que vai para o Postgres do Supabase. Não troque o serviço da planilha pelo do banco sem antes resolver três coisas: o upload precisa disparar o importador, `findSchedules` precisa aceitar o parâmetro `metrics` que `getHorarios` usa para `schedule_cache_hits`, e salas e cursos precisam de origem equivalente.

- Centralize o acesso ao banco no módulo `database.js`.
- Use consultas parametrizadas.
- Mantenha índices e chaves estrangeiras existentes.
- Não misture acesso SQL com controllers.
- O arquivo `.db` não é versionado: é gerado por `npm run db:import`. Não volte a comitá-lo.
- O caminho do banco vem de `GAIA_DATABASE_PATH`, com `server/src/database/gaia.db` como padrão.
- Casos esperados das consultas ficam em `src/database/consultasEsperadas.js`, usados pelo script manual e pelo `npm test`. Altere nos dois lugares de uma vez só: o arquivo é compartilhado.

### Autenticação

Quando `SUPABASE_URL` e `SUPABASE_ANON_KEY` existem, as contas ficam no Supabase Auth; sem elas, o cliente volta ao login local do `localStorage`. Os dois caminhos convivem — não remova o local sem a decisão explícita de exigir internet para entrar.

- Nunca crie coluna de senha no banco. Senha é responsabilidade do Supabase Auth.
- A `service_role` key ignora o RLS: só no servidor, nunca em `client/`.
- Toda tabela nova com dado de usuário nasce com RLS habilitado e policy por `auth.uid()`.
- `role` não pode ser editável pelo cliente: promoção de perfil só por `service_role` ou SQL Editor.
- Valide o token pelos middlewares de `middleware/supabaseAuth.js`. Não decodifique JWT à mão em controllers.
- Use `autenticacaoOpcional` em rota que o visitante precisa usar; `autenticar` onde a sessão é obrigatória.
- Erros de autenticação usam status 401 e 403, que o handler de `app.js` repassa com a mensagem própria.

### Streaming

- Preserve `/api/chat/stream` como transporte progressivo.
- Preserve `/api/chat` como fallback JSON.
- SSE deve emitir frames claros para `chunk`, `reset`, `done` ou `error`.
- Streaming deve respeitar desconexão, abort e fechamento do cliente.
- Não tente ler ou reproduzir respostas completas apenas para contornar o transport.
- Métricas de latência devem continuar sem mensagem, ferramenta com argumentos, chave ou texto de erro sensível.

### Node.js

- Instale novas dependências apenas quando o problema não puder ser resolvido com APIs nativas.
- Não adicione arquivos de configuração duplicados.
- Use imports ES Module, pois a raiz possui `"type": "module"`.
- Mantenha o inicializador enxuto em `server/server.js`.
- Use portas e origens configuráveis por ambiente.

## 5. Frontend

### Módulos

O frontend utiliza dois modelos de carregamento que devem ser preservados:

- `client/src/main.js` é o ponto de entrada ES Module.
- `main.js` carrega os módulos de domínio antigos como scripts clássicos deliberadamente, mantendo contratos globais usados pela interface e pelo Android.
- `chatStream.js` é um ES Module exposto via `window.GAIA_CHAT_TRANSPORT`.

Não converta todo o domínio em ES Module por uma alteração localizada. Quando houver migração, faça-a por módulo completo e atualize o carregamento em `main.js`, dependências globais e testes.

### Separação

- `core/`: armazenamento, persistência e utilitários.
- `features/`: telas e casos de uso da interface.
- `map/`: mapa 2D e visualizações 3D.
- `platform/`: voz, notificações e integração com o navegador/Android.
- `data/`: dados estáticos e configuração local.
- `bootstrap.js`: composição final e inicialização.

Não misture chamada HTTP, renderização visual e persistência em uma única função além do necessário.

### Estado e compatibilidade

- Preserve nomes globais já usados por eventos inline, pontes Android e módulos clássicos.
- Use `window.GAIA_API_URL` para configurar o endereço da API.
- Preserve compatibilidade com `window.Nativo` para voz e recursos disponíveis no app.
- Mudanças no formato de `localStorage` devem incluir migração.
- Não remova dados locais válidos durante uma migração.

### DOM e segurança

- Não introduza atributos `onclick` ou código JavaScript inline novo no HTML.
- Use `querySelector` e `querySelectorAll` com seletores claros.
- Evite reconstruções desnecessárias de grandes partes da interface.
- Sanitize dados externos antes de inserir em `innerHTML`.
- Prefira criar elementos com texto separado de HTML quando houver entrada do usuário.
- Não use `eval`, interpolação insegura ou atribuição dinâmica em nomes globais sem necessidade.

### API e streaming

- O cliente deve tentar `POST /api/chat/stream` e usar fallback para `POST /api/chat` em erro de transporte legado.
- Preserve cancelamento pelo navegador.
- Atualize a interface somente depois de estados consistentes.
- Remova texto temporário com o evento `reset` quando a resposta muda para uma tool call.
- Trate falha de rede, corpo inválido e desconexão com mensagens visíveis.

### CSS e acessibilidade

- Mantenha a hierarquia visual e as classes já usadas em `client/styles.css`.
- Preserve variáveis CSS existentes e adicione novas variáveis somente para estados reutilizáveis.
- Use contraste adequado para texto, controles e estados de foco.
- Todos os controles devem ser operáveis por teclado.
- Use rótulos, `aria-*` e texto alternativo coerentes.
- Botões e links devem manter estados `hover`, `focus`, `active` e `disabled`.
- Não use apenas cor para comunicar uma ação ou erro.
- Preserve `prefers-reduced-motion` quando houver animação.
- A interface deve continuar legível em desktop, celular e WebView.

## 6. Android e Capacitor

### Organização atual

- `capacitor.config.json` define `webDir: "client"` e o app `br.com.senai.gaia`.
- `android/app/src/main/java/br/com/senai/gaia/MainActivity.java` usa `BridgeActivity`.
- O conteúdo Android publicado é gerado a partir de `client/` pelo Capacitor.
- A API continua separada e não é empacotada no APK.
- `https://localhost` é uma origem permitida pelo CORS.

### Método de alteração

- Alterações no frontend exigem `npm run cap:sync`.
- Não edite arquivos gerados em `android/app/src/main/assets/public/` manualmente.
- Não implemente lógica funcional Java duplicada quando ela já existe no cliente.
- Preserve o `applicationId`, `namespace` e contrato com a bridge ao alterar o pacote.
- Não aumente `minSdk`, `targetSdk` ou versões sem motivo confirmado.
- Não adicione plugins ou permissões sem uso real.

### Permissões e configuração

- Mantenha somente permissões necessárias.
- Limite acessos de rede e origens CORS.
- Não coloque URL de API ou chave Gemini em recursos Android sem justificativa.
- Teste voz, microfone, localização, notificação e navegação em celular real.
- Teste a rota pública da API e o fallback offline do frontend.

### Build

Comandos oficiais da raiz:

```bash
npm run cap:sync
npm run android:build
npm run android:run
npm run android:open
```

Saída de depuração:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Não versionar keystores, senhas ou artefatos locais de build.

## 7. Segurança

- Mantenha `GEMINI_API_KEY` somente no servidor.
- Use `CLIENT_ORIGIN` ou a lista CORS controlada.
- Valide tamanho e tipo de uploads.
- Use parâmetros preparados no SQLite.
- Não registre mensagens pessoais, filtros completos ou resultados completos como dados de telemetria.
- Não aceite HTML ou URLs fornecidos pelo usuário sem sanitização.
- Revise origens, permissões e dados persistidos antes de publicar.

## 8. Qualidade e testes

### Testes existentes

Execute na raiz:

```bash
npm test
```

A cobertura atual inclui:

- ferramentas Gemini e resposta compacta;
- streaming JSON/SSE;
- consultas locais de salas;
- cache de horários;
- métricas de latência;
- transporte de chat no frontend.

Testes ficam em:

- `server/test/*.test.js`
- `client/test/*.test.js`

### Quando adicionar teste

Adicione ou ajuste testes para:

- comportamento novo;
- correção de bug;
- mudança de contrato HTTP;
- alteração de parser de planilha;
- fallback JSON/SSE;
- migração de dados ou compatibilidade Android;
- mudança em cache, Gemini ou métricas.

Um teste deve verificar o comportamento observável, não detalhes internos triviais.

Use dados temporários para planilhas e remova arquivos temporários ao finalizar.

### Checklist de entrega

Antes de concluir:

- [ ] A alteração está limitada ao problema solicitado.
- [ ] Imports, exports e referências globais continuam válidos.
- [ ] Frontend e backend não vazam a chave do Gemini.
- [ ] Planilhas e dados legados preservam fallback adequado.
- [ ] Streaming continua com fallback JSON.
- [ ] CORS e limites da API continuam seguros.
- [ ] A interface mantém teclado e acessibilidade.
- [ ] Android foi sincronizado quando `client/` mudou.
- [ ] Testes e documentação relacionados foram atualizados.
- [ ] `npm test` passou.
