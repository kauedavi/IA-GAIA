🤖 AGENT.md - Diretrizes de Desenvolvimento do Projeto G.A.I.A

Este documento define os padrões obrigatórios de arquitetura, qualidade de código, nomenclatura e design de interface (UX/UI) para qualquer Agente de Inteligência Artificial ou desenvolvedor atuando no repositório G.A.I.A.

📌 1. Visão Geral do Projeto

O G.A.I.A (Assistente de Acessibilidade e Rotas Inteligentes) é uma plataforma de suporte e orientação aos alunos.

Backend: Node.js (Express) em arquitetura monolítica modularizada por camadas (/server), integrado à API do Google Gemini via Function Calling.

Frontend: Aplicação Web estática e moderna em Vanilla JavaScript usando ES Modules nativos (/client).

Hospedagem Alvo: Backend na Railway e Frontend estático (Vercel/GitHub Pages).

🧼 2. Princípios de Código Limpo (Clean Code)

Todo código gerado ou modificado pelo agente DEVE seguir estes princípios:

2.1 Nomenclatura Clara e Autoexplicativa

Variáveis e Funções: Em inglês (padrão da indústria) ou português consistente com o domínio do negócio, mantendo o padrão camelCase.

Nomes Verbosos > Nomes Curtos: Prefira nomes expressivos que dispensem comentários para entender o propósito.

❌ const d = await getH(t);

✅ const classSchedule = await fetchScheduleByClassId(classId);

Constantes: Em UPPER_SNAKE_CASE (ex: MAX_CHAT_HISTORY_LENGTH, DEFAULT_ROOM_CAPACITY).

Classes e Interfaces: Em PascalCase (ex: ChatController, MapEngine).

Booleanos: Devem começar com verbos auxiliares (is, has, should).

✅ isLoading, hasActiveRoute, shouldTriggerGps.

2.2 Funções Pequenas e com Responsabilidade Única (SRP)

Cada função deve fazer apenas uma coisa e fazê-la bem.

Evite funções com mais de 25-30 linhas. Se exceder, extraia partes da lógica em funções auxiliares organizadas no diretório utils/.

Limite máximo de 3 parâmetros por função. Para mais parâmetros, utilize desestruturação de objetos:

// ✅ Bom
function createMessageBubble({ text, sender, timestamp, hasAction = false }) { ... }


2.3 Tratamento de Erros e Defensividade

Nunca utilize blocos catch vazios.

Trate requisições assíncronas com async/await e blocos try/catch explícitos.

Retorne erros estruturados e padronizados no backend:

return res.status(400).json({
  success: false,
  error: {
    code: 'INVALID_INPUT',
    message: 'O parâmetro turmaId é obrigatório.'
  }
});


🟢 3. Padrões do Backend (Node.js & Express)

3.1 Arquitetura em Camadas (Layered Monolith)

Respeite estritamente o isolamento de pastas em /server/src/:

routes/: Definição de endpoints HTTP sem regras de negócio.

controllers/: Recebe a requisição (req), valida payload e delega para o serviço (res).

services/: Contém a regra de negócio e chamadas ao Gemini SDK.

agent/tools/: Implementação de cada Function Calling individual.

data/: Apenas dados estáticos/mocks isolados.

3.2 Integração Gemini (Google AI Studio)

Utilize o SDK oficial (@google/genai).

Prompts de sistema (systemInstruction.js) devem ser mantidos como variáveis de texto multilinhas formatadas e limpas.

Nunca faça hardcode de chaves de API. Use sempre process.env.GEMINI_API_KEY.

🎨 4. Padrões do Frontend (HTML, CSS, JS Vanilla)

4.1 Estrutura Modular (ES Modules)

Todo código JS frontend em /client/src/ deve usar sintaxe import/export.

O index.html deve importar apenas o ponto de entrada principal:

<script type="module" src="src/main.js"></script>


Proibido escrever código JS inline no HTML (atributos onclick="", etc.).

4.2 Manipulação do DOM

Separe completamente a lógica de dados da renderização visual (chatUI.js).

Use element.querySelector e element.querySelectorAll com seletores CSS limpos.

Ao criar elementos dinâmicos, prefira a criação explícita ou template literals sanitizados para evitar ataques XSS.

🎨 5. Padrões de UX/UI Moderno

O visual do G.A.I.A deve seguir uma estética moderna, profissional, acessível e limpa.

5.1 Sistema de Cores e Variáveis CSS (styles/main.css)

Utilize um tema dark/light refinado com foco em acessibilidade visual (alto contraste):

:root {
  /* Paleta Principal */
  --primary-color: #2563eb;       /* Azul institucional moderno */
  --primary-hover: #1d4ed8;
  --bg-dark: #0f172a;              /* Slate escuro para visual elegante */
  --surface-dark: #1e293b;        /* Card / Container background */
  --surface-border: #334155;
  
  /* Texto */
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  
  /* Estado e Feedback */
  --agent-bubble-bg: #334155;
  --user-bubble-bg: #2563eb;
  --accent-color: #10b981;        /* Verde para status/rotas */
  
  /* Tipografia & Formas */
  --font-family: 'Inter', system-ui, -apple-system, sans-serif;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --transition-fast: 0.2s ease-in-out;
}


5.2 Estética e Layout (UX/UI Rules)

Glassmorphism Suave: Uso moderado de backdrop-filter: blur(10px) e bordas sutis (1px solid var(--surface-border)).

Tipografia: Hierarquia visual nítida. Títulos com pesos 600/700, texto corrido com peso 400 e altura de linha (line-height: 1.5).

Micro-interações: Todos os botões e elementos interativos devem possuir transições suaves nos estados :hover, :focus e :active.

.btn-primary {
  transition: transform var(--transition-fast), background-color var(--transition-fast);
}
.btn-primary:hover {
  background-color: var(--primary-hover);
  transform: translateY(-1px);
}


Feedback Visual de Ação: O indicador de digitação da IA ("G.A.I.A está a pensar...") deve conter animação sutil de pulso ou pontos em carregamento.

Scroll Automático: A janela do chat deve sempre rolar automaticamente para a última mensagem com comportamento suave (behavior: 'smooth').

🤖 6. Instruções Específicas para o Agente AI

Ao ser solicitado para gerar ou alterar código neste repositório:

Analise o impacto geral: Antes de responder, verifique se a alteração afeta a separação entre backend e frontend.

Forneça arquivos completos: Sempre que atualizar um arquivo modular, prefira gerar o código completo do módulo em vez de trechos soltos, mantendo as declarações import/export intactas.

Não introduza bibliotecas desnecessárias: Mantenha o backend enxuto e o frontend em Vanilla JS (a menos que a instalação de uma lib específica seja aprovada, ex: Three.js para o 3D).

Formatação de código: Utilize identação de 2 espaços para JavaScript/JSON/HTML/CSS.

Comentários de código: Escreva comentários apenas quando a regra de negócio for complexa ou para documentar blocos de Function Calling do Gemini. Não comente o óbvio.

eof
