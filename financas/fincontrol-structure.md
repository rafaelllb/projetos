# FinControl - Estrutura Completa do Projeto

## Visão Geral

FinControl é uma aplicação de gestão financeira pessoal com arquitetura modular, implementada com JavaScript vanilla no frontend e Python no backend. A aplicação usa estratégias mistas de persistência de dados e prioriza validação e sanitização.

## Estrutura de Diretórios

```
fincontrol/
├── frontend/
│   ├── index.html
│   ├── pages/
│   │   ├── login.html
│   │   └── register.html
│   ├── css/
│   │   ├── normalize.css
│   │   ├── main.css
│   │   ├── components.css
│   │   ├── dashboard.css
│   │   └── auth.css
│   └── js/
│       ├── app.js
│       ├── router.js
│       ├── auth/
│       │   ├── auth-manager.js
│       │   ├── login-controller.js
│       │   └── register-controller.js
│       ├── budgets/
│       │   ├── budget-manager.js
│       │   └── budget-model.js
│       ├── dashboard/
│       │   └── dashboard-manager.js
│       ├── goals/
│       │   ├── goals-manager.js
│       │   └── goal-model.js
│       ├── reports/
│       │   ├── report-manager.js
│       │   └── export-service.js
│       ├── storage/
│       │   └── storage-manager.js
│       ├── transactions/
│       │   ├── transaction-manager.js
│       │   ├── transaction-model.js
│       │   └── transaction-validation.js
│       ├── ui/
│       │   └── ui-manager.js
│       └── utils/
│           ├── currency-utils.js
│           ├── date-utils.js
│           ├── sanitize-utils.js
│           └── validation-utils.js
├── backend/
│   ├── app.py
│   ├── config.py
│   ├── wsgi.py
│   ├── requirements.txt
│   ├── migrations/
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── models.py
│   │   └── controllers.py
│   ├── transactions/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── models.py
│   │   └── controllers.py
│   ├── budgets/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── models.py
│   │   └── controllers.py
│   ├── goals/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── models.py
│   │   └── controllers.py
│   ├── reports/
│   │   ├── __init__.py
│   │   ├── routes.py
│   │   ├── models.py
│   │   └── generators.py
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── validators.py
│   │   ├── sanitizers.py
│   │   └── date_helpers.py
│   └── database/
│       ├── __init__.py
│       ├── models.py
│       └── db.py
└── mobile/
    ├── android/
    ├── ios/
    ├── assets/
    └── src/
```

## Frontend

### HTML

#### `index.html`
- **Função**: Página principal da aplicação que contém o dashboard financeiro.
- **Componentes**: Estrutura de navegação, resumo financeiro, gráficos, listas de transações.

#### `login.html`
- **Função**: Página de login de usuários.
- **Componentes**: Formulário de login, opção de conta demo, recuperação de senha.

#### `register.html`
- **Função**: Página de cadastro de novos usuários.
- **Componentes**: Formulário de registro, validação de força de senha.

### CSS

#### `normalize.css`
- **Função**: Normaliza estilos entre navegadores.

#### `main.css`
- **Função**: Estilos globais, variáveis CSS, layouts principais.

#### `components.css`
- **Função**: Estilos de componentes reutilizáveis (cards, botões, alerts).

#### `dashboard.css`
- **Função**: Estilos específicos para o dashboard financeiro.

#### `auth.css`
- **Função**: Estilos para as páginas de autenticação.

### JavaScript

#### Core

#### `app.js`
- **Função**: Inicialização da aplicação e orquestração dos módulos.
- **Métodos**:
  - `init()`: Inicializa a aplicação, verificando autenticação e carregando dados.
  - `checkAuth()`: Verifica o estado de autenticação do usuário.
  - `loadInitialData()`: Carrega categorias e transações iniciais.

#### `router.js`
- **Função**: Gerencia navegação entre páginas sem recarregar (SPA).
- **Métodos**:
  - `navigateTo(route)`: Navega para uma rota específica.
  - `handleRoute(route, addToHistory)`: Processa mudanças de rota.

#### Autenticação

#### `auth-manager.js`
- **Função**: Gerencia autenticação e autorização.
- **Métodos**:
  - `login(email, password)`: Autentica usuário.
  - `register(userData)`: Registra novo usuário.
  - `logout()`: Finaliza sessão.
  - `isAuthenticated()`: Verifica se há usuário autenticado.

#### `login-controller.js`
- **Função**: Controla interações da página de login.
- **Métodos**:
  - `handleLoginSubmit(event)`: Processa envio do formulário.
  - `saveCredentials(email, password)`: Salva credenciais para "lembrar de mim".

#### `register-controller.js`
- **Função**: Controla interações da página de registro.
- **Métodos**:
  - `handleRegisterSubmit(event)`: Processa envio do formulário.
  - `checkPasswordStrength()`: Valida força da senha.

#### Transações

#### `transaction-manager.js`
- **Função**: Gerencia operações CRUD de transações.
- **Métodos**:
  - `addTransaction(transaction)`: Adiciona nova transação.
  - `getTransactions()`: Recupera todas as transações.
  - `updateTransaction(id, updatedData)`: Atualiza transação existente.
  - `removeTransaction(id)`: Remove uma transação.
  - `filterTransactions(filters)`: Filtra transações por critérios.

#### `transaction-model.js`
- **Função**: Modelo de dados de transações.
- **Métodos**:
  - `validate()`: Valida dados da transação.
  - `toObject()`: Converte para objeto simples.

#### `transaction-validation.js`
- **Função**: Validação específica para transações.
- **Métodos**:
  - `validateTransaction(transaction)`: Valida dados completos.
  - `isValidType(type)`: Verifica se tipo é válido.

#### Orçamentos

#### `budget-manager.js`
- **Função**: Gerencia orçamentos financeiros.
- **Métodos**:
  - `addBudget(budget)`: Adiciona novo orçamento.
  - `calculateBudgetProgress()`: Calcula progresso dos orçamentos.

#### `budget-model.js`
- **Função**: Modelo de dados de orçamentos.
- **Métodos**:
  - `validate()`: Valida dados do orçamento.
  - `getDurationInDays()`: Calcula duração em dias.

#### Metas

#### `goals-manager.js`
- **Função**: Gerencia metas financeiras.
- **Métodos**:
  - `addGoal(goal)`: Adiciona nova meta.
  - `updateGoalProgress(id, amount)`: Atualiza progresso.

#### `goal-model.js`
- **Função**: Modelo de dados de metas.
- **Métodos**:
  - `addAmount(amount)`: Adiciona valor ao montante atual.
  - `getProgressPercentage()`: Calcula percentual de progresso.

#### Dashboard

#### `dashboard-manager.js`
- **Função**: Gerencia visualizações do dashboard.
- **Métodos**:
  - `updateSummary()`: Atualiza resumo financeiro.
  - `updateExpensesByCategoryChart()`: Atualiza gráfico de despesas.
  - `updateCashFlowChart()`: Atualiza gráfico de fluxo de caixa.

#### Relatórios

#### `report-manager.js`
- **Função**: Gera relatórios financeiros.
- **Métodos**:
  - `generateSummaryReport(startDate, endDate)`: Gera relatório resumido.
  - `renderIncomeExpenseChart(container, data)`: Renderiza gráfico.

#### `export-service.js`
- **Função**: Exporta dados em diferentes formatos.
- **Métodos**:
  - `exportToCSV(data, options)`: Exporta para CSV.
  - `exportToJSON(data, options)`: Exporta para JSON.

#### Armazenamento

#### `storage-manager.js`
- **Função**: Gerencia persistência de dados com estratégias múltiplas.
- **Métodos**:
  - `initIndexedDB()`: Inicializa IndexedDB.
  - `storeInIndexedDB(storeName, data)`: Armazena no IndexedDB.
  - `getLocalStorage(key)`: Recupera do localStorage.
  - `setTransactions(transactions)`: Salva transações.

#### UI

#### `ui-manager.js`
- **Função**: Gerencia elementos de interface.
- **Métodos**:
  - `navigateTo(pageName)`: Navega entre páginas.
  - `openModal(modalId)`: Abre um modal.
  - `showSuccess(message)`: Exibe mensagem de sucesso.

#### Utilitários

#### `currency-utils.js`
- **Função**: Formatação e cálculos monetários.
- **Métodos**:
  - `formatCurrency(value, currency)`: Formata valor monetário.
  - `calculateCompoundInterest(principal, rate, periods)`: Calcula juros compostos.

#### `date-utils.js`
- **Função**: Manipulação de datas.
- **Métodos**:
  - `formatDate(date, includeTime)`: Formata data.
  - `getDateRangeFromPeriod(period)`: Retorna período de datas.

#### `sanitize-utils.js`
- **Função**: Sanitização de dados de entrada.
- **Métodos**:
  - `sanitizeText(text)`: Remove tags HTML e scripts.
  - `sanitizeNumber(value, options)`: Sanitiza valores numéricos.

#### `validation-utils.js`
- **Função**: Validação de dados genérica.
- **Métodos**:
  - `isValidEmail(email)`: Valida formato de email.
  - `validateObject(obj, schema)`: Valida objeto com schema.

## Backend (Sugerido)

### Core

#### `app.py`
- **Função**: Inicialização da API Flask.
- **Funcionalidades**: Configuração da aplicação, registro de blueprints.

#### `config.py`
- **Função**: Configurações da aplicação.
- **Funcionalidades**: Configurações para ambientes diferentes (dev, prod, test).

#### `wsgi.py`
- **Função**: Ponto de entrada para servidor WSGI.

### Auth

#### `auth/routes.py`
- **Função**: Rotas de autenticação.
- **Endpoints**:
  - `POST /auth/login`: Autenticação de usuário.
  - `POST /auth/register`: Registro de novo usuário.
  - `POST /auth/logout`: Logout.
  - `GET /auth/me`: Informações do usuário atual.

#### `auth/models.py`
- **Função**: Modelos de dados relacionados à autenticação.
- **Modelos**: `User`, `UserSettings`.

#### `auth/controllers.py`
- **Função**: Lógica de negócio de autenticação.
- **Métodos**:
  - `authenticate_user(email, password)`: Autentica usuário.
  - `register_user(user_data)`: Registra novo usuário.

### Transactions

#### `transactions/routes.py`
- **Função**: Rotas de transações.
- **Endpoints**:
  - `GET /transactions`: Lista transações.
  - `POST /transactions`: Cria transação.
  - `PUT /transactions/{id}`: Atualiza transação.
  - `DELETE /transactions/{id}`: Remove transação.

#### `transactions/models.py`
- **Função**: Modelos de dados de transações.
- **Modelos**: `Transaction`, `Category`.

#### `transactions/controllers.py`
- **Função**: Lógica de negócio de transações.
- **Métodos**:
  - `create_transaction(data)`: Cria nova transação.
  - `get_user_transactions(user_id, filters)`: Recupera transações.

### Budgets

#### `budgets/routes.py`
- **Função**: Rotas de orçamentos.
- **Endpoints**:
  - `GET /budgets`: Lista orçamentos.
  - `POST /budgets`: Cria orçamento.
  - `GET /budgets/progress`: Progresso dos orçamentos.

#### `budgets/models.py`
- **Função**: Modelos de dados de orçamentos.
- **Modelos**: `Budget`, `BudgetCategory`.

#### `budgets/controllers.py`
- **Função**: Lógica de negócio de orçamentos.
- **Métodos**:
  - `create_budget(data)`: Cria novo orçamento.
  - `calculate_budget_progress(budget_id)`: Calcula progresso.

### Goals

#### `goals/routes.py`
- **Função**: Rotas de metas financeiras.
- **Endpoints**:
  - `GET /goals`: Lista metas.
  - `POST /goals`: Cria meta.
  - `PUT /goals/{id}/progress`: Atualiza progresso.

#### `goals/models.py`
- **Função**: Modelos de dados de metas.
- **Modelos**: `Goal`, `GoalContribution`.

#### `goals/controllers.py`
- **Função**: Lógica de negócio de metas.
- **Métodos**:
  - `create_goal(data)`: Cria nova meta.
  - `update_goal_progress(goal_id, amount)`: Atualiza progresso.

### Reports

#### `reports/routes.py`
- **Função**: Rotas de relatórios.
- **Endpoints**:
  - `GET /reports/summary`: Relatório de resumo.
  - `GET /reports/categories`: Relatório por categorias.
  - `GET /reports/export`: Exporta dados em formato específico.

#### `reports/models.py`
- **Função**: Modelos de dados de relatórios.
- **Modelos**: `Report`, `ReportSchedule`.

#### `reports/generators.py`
- **Função**: Geração de relatórios.
- **Métodos**:
  - `generate_summary_report(user_id, start_date, end_date)`: Gera relatório resumido.
  - `generate_category_report(user_id, start_date, end_date)`: Gera relatório por categoria.

### Database

#### `database/db.py`
- **Função**: Configuração do banco de dados.
- **Funcionalidades**: Inicialização e conexão com banco de dados.

#### `database/models.py`
- **Função**: Modelos base de dados.
- **Funcionalidades**: Classe base para todos os modelos.

### Utils

#### `utils/validators.py`
- **Função**: Validação de dados.
- **Métodos**:
  - `validate_transaction(data)`: Valida dados de transação.
  - `validate_email(email)`: Valida formato de email.

#### `utils/sanitizers.py`
- **Função**: Sanitização de dados.
- **Métodos**:
  - `sanitize_text(text)`: Remove tags HTML e scripts.
  - `sanitize_number(value)`: Sanitiza valores numéricos.

#### `utils/date_helpers.py`
- **Função**: Manipulação de datas.
- **Métodos**:
  - `get_date_range(period)`: Obtém intervalo de datas.
  - `format_date(date)`: Formata data para padronização.

## Mobile (Sugerido)

### Estrutura
- Segue padrão do framework escolhido (React Native, Flutter, etc.)
- Reutiliza lógica e modelos do frontend web
- Implementa interfaces nativas para Android e iOS

## Estratégias de Persistência

1. **Frontend**:
   - **Usuário não autenticado**: localStorage para preferências, sessionStorage para dados temporários
   - **Usuário autenticado**: IndexedDB para cache, sincronização com backend

2. **Backend**:
   - PostgreSQL para armazenamento relacional principal
   - Redis para cache de sessões e dados frequentemente acessados

3. **Sincronização**:
   - Sistema de fila para operações offline
   - Resolução de conflitos baseada em timestamps

## Validação e Sanitização

1. **Frontend**:
   - Validação em tempo real nos formulários
   - Sanitização antes de envio ao backend
   - Validação final antes de persistência local

2. **Backend**:
   - Validação de todas as entradas de API
   - Sanitização de dados antes do processamento
   - Validação de regras de negócio

## Segurança

1. **Autenticação**:
   - JWT para sessões stateless
   - HTTPS para todas as comunicações
   - Rate limiting para prevenção de força bruta

2. **Dados**:
   - Criptografia de dados sensíveis
   - Validação estrita de entradas
   - Proteção contra ataques XSS e CSRF