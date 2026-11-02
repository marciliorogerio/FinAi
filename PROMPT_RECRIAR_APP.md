# Prompt Mestre para Recriar o Aplicativo FinAI (Assistente Financeiro IA)

Copie e cole todo o bloco abaixo em um novo chat do Google AI Studio para recriar esta aplicação completa do zero já com todas as melhorias, gráficos Recharts, tela de login protegida e integração com Supabase e Vercel:

---

```markdown
Crie uma aplicação web full-stack moderna, responsiva e instalável (PWA) chamada **FinAI - Assistente Financeiro IA**, utilizando **React 19 + TypeScript + Tailwind CSS + Lucide React + Recharts** no frontend, **Express** no backend para rotas da API Gemini (`@google/genai`), e **Supabase (`@supabase/supabase-js`)** para autenticação e banco de dados PostgreSQL em tempo real.

### 1. Credenciais e Banco de Dados Supabase (Nuvem)
Configure o cliente Supabase em `src/services/supabase.ts` já conectado por padrão ao projeto:
- **SUPABASE_URL**: `https://klsgsvzokqfnccuwjqcb.supabase.co`
- **SUPABASE_ANON_KEY**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtsc2dzdnpva3FmbmNjdXdqcWNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4ODA0MDcsImV4cCI6MjEwODQ1NjQwN30.Rb9OuqxfqdYZnVg5qFBoSVrP0bOLTg409b4dPx7ABDU`
- **Importante**: Não adicione `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` no `.env.example` para evitar pop-ups desnecessários de variáveis de ambiente no AI Studio.
- **Tabelas utilizadas**:
  1. `transactions`: `id` (uuid), `type` ('receita' | 'despesa'), `description` (text), `amount` (numeric), `category` (text), `date` (date/text YYYY-MM-DD), `payment_method` (text), `notes` (text), `user_id` (uuid opcional).
  2. `category_budgets`: `category` (text PK), `monthly_limit` (numeric).
- Mantenha sincronização resiliente com cache em `localStorage` caso o usuário esteja temporariamente offline.

### 2. Autenticação Real (Auth Gate — Tela de Login Inicial)
- O aplicativo **DEVE** iniciar bloqueado na **Tela de Login dedicada (`LoginPage.tsx`)** sempre que o usuário não estiver autenticado no Supabase.
- **Nunca** exiba o painel financeiro para usuários deslogados nem coloque botão de "Entrar" dentro da área logada.
- Na `LoginPage`:
  - Design fintech sofisticado em tema escuro (`bg-neutral-950`) com destaques em verde esmeralda (`emerald-500`).
  - Botão principal oficial **"Continuar com o Google"** (`supabase.auth.signInWithOAuth({ provider: 'google' })`).
  - Abas **"Entrar"** e **"Criar Conta"** com Email e Senha via Supabase Auth:
    - No cadastro ("Criar Conta"), inclua os campos: **Nome Completo**, **Email**, **Senha** (mínimo 6 caracteres, com botão mostrar/ocultar) e **Confirmar Senha**. Grave o nome em `user_metadata.full_name`.
    - Trate erros de autenticação de forma amigável na interface (usando `console.warn` em vez de `console.error` para não disparar overlays de erro).
  - Opção secundária discreta *"Explorar no modo demonstração"* apenas na tela de login para testes rápidos (sem persistir após recarregar a página).
- No cabeçalho da área logada (`Header.tsx`):
  - Exiba o avatar do usuário, nome, e-mail e o botão **Sair (Logout)** que encerra a sessão no Supabase e retorna imediatamente para a `LoginPage`.
  - **Não** coloque botão "+ Lançar" no topo do cabeçalho desktop (mantenha o cabeçalho limpo).

### 3. Arquitetura Modular em 5 Abas + Central de Lançamentos
Organize a navegação principal (Header no desktop e BottomTabBar fixa no mobile) nos seguintes módulos:

1. **Início (`HomeOverviewView.tsx`)**:
   - Card Hero com Saldo Consolidado, Receitas do Mês, Despesas do Mês, Previsão de Fechamento (projeção linear de gastos até o fim do mês) e Taxa de Poupança (%).
   - Atalhos rápidos para os módulos e botões de ação rápida ("Gravar Despesa" e "Importar Extrato").
   - **Gráficos Recharts (`FinancialCharts.tsx`)**:
     - **Gráfico de Pizza (Donut `PieChart`)**: Distribuição de gastos por categoria com percentuais e legenda interativa.
     - **Gráfico de Barras (`BarChart`)**: Evolução mensal comparando Receitas vs. Despesas.
   - Resumo das próximas Contas a Vencer (com botão "Dar Baixa" em 1 clique) e as 5 últimas transações.

2. **Extrato (`StatementView.tsx`)**:
   - Tabela/lista completa de transações com busca por texto, filtro por tipo (Todos, Receitas, Despesas), filtro por categoria e filtro por método de pagamento.
   - Edição inline ou em modal de qualquer lançamento e exclusão sincronizada com o Supabase.
   - Exportação do extrato filtrado para CSV/Excel.

3. **Contas & Vencimentos (`AccountsAndBillsView.tsx`)**:
   - Gestão de contas fixas/boletos e lembretes de vencimento (`BillReminder`), destacando contas atrasadas, vencendo em breve e pagas.
   - Ao clicar em "Pagar / Dar Baixa", marca a conta como paga e cria automaticamente a transação de despesa correspondente no Supabase.
   - Visão de saldos por bancos/carteiras (Nubank, Itaú, Inter, Carteira física).

4. **Metas & Planejamento (`PlanningView.tsx`)**:
   - **Gráficos Recharts (`FinancialCharts.tsx`)** no topo (Gráfico de Pizza de categorias e Gráfico de Barras de evolução mensal).
   - **Limites de Gastos por Categoria**: Barras de progresso mostrando gasto atual vs. teto definido, alertas visuais quando atingir 80% ou estourar 100%, edição de limites salva no Supabase e criação de novas categorias.
   - **Regra 50/30/20**: Análise automática dividindo os gastos em Necessidades Essenciais (50%), Estilo de Vida/Desejos (30%) e Poupança/Metas (20%).
   - **Objetivos & Reserva de Emergência**: Criação de metas financeiras (ex: Reserva de Emergência, Viagem) com barra de evolução e registro rápido de aportes.

5. **Consultor Chat IA (`ChatAdvisorView.tsx`)**:
   - Chat financeiro consultivo integrado ao backend Gemini (`/api/gemini/chat`).
   - Envia o resumo financeiro real do usuário como contexto para que a IA responda perguntas sobre onde economizar, diagnóstico de orçamento e planejamento financeiro.

6. **Central de Lançamento Inteligente (`InputCenterView.tsx`) + Importação OFX/CSV**:
   - Acessível pelo botão central `+` na barra mobile ou pelos atalhos da Home:
     - **Voz**: Gravação de áudio no navegador transcrita e interpretada pelo Gemini (`/api/gemini/parse`).
     - **Foto de Cupom/Nota Fiscal**: Upload ou câmera para leitura automática de itens, valor, data e categoria via visão computacional do Gemini.
     - **Texto Livre**: Ex: *"Gastei 85 reais no mercado ontem no crédito e recebi 500 de freelance no PIX"* (suporte a múltiplos lançamentos de uma só vez).
   - Modal de confirmação (`ConfirmationModal.tsx`) antes de salvar no Supabase.
   - Modal de importação de extratos bancários (`BankStatementImportModal.tsx`) suportando arquivos **OFX** e **CSV** com categorização inteligente em lote.

### 4. Backend Gemini API & Preparação para Deploy na Vercel
- Crie um roteador Express em `server/apiRouter.ts` com as rotas `/api/health`, `/api/gemini/transcribe`, `/api/gemini/parse` e `/api/gemini/chat` usando o SDK `@google/genai` (`gemini-2.5-flash`).
- Configure `server.ts` na porta 3000 para desenvolvimento/preview e crie `api/index.ts` + `vercel.json` na raiz para permitir deploy serverless direto na **Vercel via GitHub**.
```
