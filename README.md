# Portal de Gastos da Câmara dos Deputados

Este é um portal interativo para visualização e análise de gastos parlamentares, desenvolvido como um projeto de portfólio profissional. O sistema consome dados da API oficial da Câmara dos Deputados, armazena em um banco de dados Supabase e apresenta insights através de dashboards modernos e responsivos.

## 🚀 Tecnologias Utilizadas

### Frontend
- **React 18** (com TypeScript)
- **Vite** (Build tool rápida)
- **Tailwind CSS** (Estilização utilitária e responsiva)
- **Recharts** (Biblioteca de gráficos composta e declarativa)
- **Lucide React** (Ícones modernos)
- **Axios** (Cliente HTTP)

### Backend & Dados
- **Node.js + Express** (API Proxy e lógica de sincronização)
- **Supabase** (PostgreSQL Database, Auth, Realtime)
- **Prisma** (Opcional - Estrutura preparada para ORM futuro)

## 📊 Funcionalidades

- **Dashboard Principal:** Visão geral dos gastos por categoria, partido e estado.
- **Filtros Avançados:** Segmentação por Ano, Mês, Partido (Sigla), Estado (UF) e Faixa de Valor.
- **Gráficos Interativos:**
  - Evolução temporal de gastos (Area Chart)
  - Distribuição por Categoria (Pie Chart)
  - Top 10 Deputados/Partidos (Bar Chart)
- **Sincronização de Dados:**
  - Script otimizado para busca em lote (Batch Processing) na API da Câmara.
  - Armazenamento histórico no Supabase.
- **Design Responsivo:** Layout adaptável para desktop e dispositivos móveis.
- **Modo Escuro/Claro:** (Preparado na estrutura base).

## 🛠️ Configuração do Projeto

1. **Instalação de dependências:**
   ```bash
   npm install
   ```

2. **Configuração de Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz com as chaves do Supabase:
   ```env
   VITE_SUPABASE_URL=sua_url_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima
   SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role
   ```

3. **Executar o Servidor de Desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Sincronizar Dados:**
   Acesse a interface e clique no botão de sincronização ou chame a rota `/api/sync`.

## 📂 Estrutura de Pastas

- `/src`: Código fonte do Frontend React.
- `/api`: Código do Backend (Express) e rotas de API.
- `/supabase_*.sql`: Scripts de migração e configuração do banco de dados.

---
Desenvolvido por Nicolas Lima Freitas.
