# IA-HARI

Assistente para consulta de horários e orientação de salas da Escola SENAI
Anchieta.

## Configuração para desenvolvimento

### Pré-requisitos

- Node.js instalado;
- uma chave da API do Gemini;
- Android Studio, Android SDK e JDK 17 ou superior apenas para gerar o APK.

### Instalação

No terminal do VS Code, instale as dependências:

```bash
npm install
```

Se o PowerShell bloquear a execução de scripts, verifique e ajuste a política
de execução com responsabilidade:

```powershell
Get-ExecutionPolicy
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Configuração do backend

1. Copie `server/.env.example` para `server/.env`.
2. Preencha `GEMINI_API_KEY` no arquivo `server/.env`.
3. Mantenha a chave do Gemini somente no backend. Nunca a coloque no frontend
   ou em arquivos enviados para o navegador.
4. Em produção, defina `CLIENT_ORIGIN` com a URL pública do frontend.

Exemplo de configuração:

```env
GEMINI_API_KEY=sua_chave
GEMINI_MODEL=gemini-3.6-flash
GEMINI_FALLBACK_MODEL=gemini-3.5-flash
PORT=3000
CLIENT_ORIGIN=http://localhost:5500
```

### Configuração do frontend

O frontend é estático e não usa um bundler, então variáveis `.env` não são
carregadas automaticamente pelo navegador. Copie
`client/.env.example` apenas como referência e defina a URL da API antes dos
módulos do client em `client/index.html`:

```html
<script>
  window.HARI_API_URL = "https://sua-api.up.railway.app/api/chat";
</script>
```

Essa é a única variável necessária no frontend. A chave `GEMINI_API_KEY` deve
permanecer exclusivamente no backend.

### Execução local

Inicie o backend com:

```bash
npm start
```

O endpoint `GET /health` pode ser usado para verificar se o servidor está
funcionando. Para testar o frontend, abra `client/index.html` no navegador,
preferencialmente por um servidor local.

O endpoint de chat é `POST /api/chat`, com o corpo:

```json
{"message":"Onde fica a sala 304?"}
```

## Como gerar o APK Android

O projeto usa o [Capacitor](https://capacitorjs.com/) para empacotar o
frontend de `client/` em um aplicativo Android. A API continua separada em
`server/` e não é incluída no APK.

### Pré-requisitos

- Android Studio instalado;
- Android SDK e JDK 17 ou superior configurados pelo Android Studio;
- um emulador Android ou um celular com depuração USB ativada.

Se o Gradle informar que está usando Java 8, selecione o JDK do Android Studio
em **Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle
JDK** ou configure a variável `JAVA_HOME`.

### Sincronizar e abrir o projeto

Depois de alterar HTML, CSS ou JavaScript em `client/`, sincronize os arquivos:

```bash
npm run cap:sync
```

Para abrir o projeto no Android Studio:

```bash
npm run android:open
```

### Gerar um APK de teste

Com o Android Studio e o SDK configurados, execute:

```bash
npm run android:build
```

O APK será criado em:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Para instalar e executar em um dispositivo conectado:

```bash
npm run android:run
```

### Gerar uma versão de produção

Para distribuir o aplicativo, abra `android/` no Android Studio e use
**Build > Generate Signed App Bundle or APK**. Escolha **APK**, crie ou
selecione um keystore e mantenha esse arquivo e suas senhas fora do Git.

Antes de gerar a versão final:

1. Publique a API e configure o frontend para usar sua URL pública, não
   `http://localhost:3000`;
2. execute `npm run cap:sync`;
3. teste login, chat, mapa, voz, localização e funcionamento offline;
4. gere uma versão assinada e instale-a em um celular real.

Alterações apenas no `server/` não exigem um novo APK, desde que a URL da API
permaneça a mesma. Alterações no `client/` exigem nova sincronização e uma nova
build do aplicativo.

## Sobre o projeto

O IA-HARI combina um frontend web/Android com uma API Express integrada ao
Gemini. O frontend usa um ponto de entrada ES Module e módulos de domínio
carregados sequencialmente, sem bundler. Os módulos de domínio são scripts
clássicos intencionais para preservar os contratos globais usados pelos
callbacks do Android, eventos inline e mapa.

O backend concentra a chave e a integração com a IA. Seus casos de uso são
organizados em controllers, services, agent, data e routes, mantendo a
persistência separada da lógica da aplicação.

### Migração do frontend

1. Mapear funções por domínio: conversa, horários, salas, mapa e preferências.
2. Copiar dados estáticos para `server/src/data/`, mantendo-os sem lógica.
3. Encapsular cada consulta em uma tool com schema e handler.
4. Transferir a personalidade para `systemInstruction.js`.
5. Migrar o fluxo Gemini para `server/src/services/chatService.js`.
6. Expor somente contratos HTTP pelos controllers e routes.
7. Carregar os módulos do cliente por `client/src/main.js`.
8. Manter a chave de texto da IA no servidor e a ponte de plataforma para
   compatibilidade de voz e Android.

## Especificações gerais

### Modelos aprovados

- `gemini-3.6-flash`
- `gemini-3.5-flash`

### Estrutura principal

```text
client/                 # frontend usado na web e no APK
server/                 # API Express/Gemini
android/                # projeto nativo gerado pelo Capacitor
capacitor.config.json   # configuração do app Android
```

### Frontend

- `client/index.html`: estrutura semântica de todas as telas;
- `client/styles.css`: estilos da aplicação;
- `client/src/main.js`: carregador e orquestrador do frontend;
- `client/src/platform/platform.js`: ponte de plataforma, voz, microfone,
  notificações e compatibilidade Android;
- `client/src/data/appData.js`: dados de exemplo e constantes da unidade;
- `client/src/core/`: persistência, migrações e utilitários;
- `client/src/features/`: assistente, horários, formulários, autenticação,
  agenda e unidade;
- `client/src/map/`: mapa SVG, busca, rotas 2D e navegação 3D;
- `client/src/bootstrap.js`: composição final, eventos e inicialização.

### Backend

- `server/server.js`: inicialização do Express;
- `server/src/config/`: configuração do Gemini e ambiente;
- `server/src/controllers/`: entrada e validação HTTP;
- `server/src/services/`: casos de uso, sem persistência;
- `server/src/agent/`: personalidade e Function Calling;
- `server/src/data/`: mocks isolados de horários e salas;
- `server/src/routes/`: endpoints REST.

### Configuração do Capacitor

O diretório web usado no APK é definido em `capacitor.config.json`:

```json
{
  "appId": "br.com.senai.hari",
  "appName": "HARI",
  "webDir": "client"
}
```
