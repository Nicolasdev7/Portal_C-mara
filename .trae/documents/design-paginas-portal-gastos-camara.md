# Design de Páginas — Portal de Gastos (desktop-first)

## Global Styles (tokens)
- Background: #0B1220 (surface), cards #111B2E
- Text: primário #E6EDF7, secundário #A9B4C7
- Accent: #3B82F6; sucesso #22C55E; alerta #F59E0B; erro #EF4444
- Tipografia: Inter/Roboto; escala: 12/14/16/20/24/32
- Botões: primário (accent, texto branco), secundário (outline), hover +6% brilho; disabled 40% opacity
- Links: accent com underline no hover
- Espaçamento: grid 8px; containers 1200–1280px; gutter 24px
- Componentes: Card com radius 12px, shadow suave; Table com header sticky

## Página: Início (Visão Geral)
### Layout
- Desktop: CSS Grid 12 colunas; header full-width; conteúdo em 2 colunas (8/4) com cards empilhados.
- Breakpoints: >=1280 (12 col), 768–1279 (stack 1 col), <768 (stack + tabelas viram cards).

### Meta Information
- Title: “Gastos da Câmara — Visão Geral”
- Description: “Painel público para explorar gastos por período, categoria e fornecedor.”
- Open Graph: title/description + url + image (thumbnail do dashboard)

### Page Structure
1. **Top Bar (fixa)**
   - Logo/nome “Portal de Gastos” (à esquerda)
   - Navegação: Início | Explorar
   - Badge: “Última atualização: dd/mm hh:mm” (consumindo `sync_runs`)
2. **Filtro rápido (card)**
   - Ano (select), Mês (select opcional), CTA “Explorar”
   - Chips de recortes rápidos: “Top categorias”, “Top fornecedores”, “Último mês”
3. **KPIs (linha de 3–4 cards)**
   - Total no período, Nº de lançamentos, Maior fornecedor, Maior categoria
4. **Gráficos-resumo (2 cards)**
   - Série temporal (linha/colunas) com tooltip e clique (aplica filtro e navega)
   - Barras horizontais (Top 10 categorias ou fornecedores) com clique
5. **Rodapé**
   - Texto: “Dados: API pública da Câmara dos Deputados” + link de fonte

## Página: Explorar Gastos
### Layout
- Desktop: layout “filter rail + content” (Flexbox)
  - Coluna esquerda fixa (320px) para filtros
  - Área direita fluida com tabela e gráficos

### Meta Information
- Title: “Explorar Gastos — Câmara dos Deputados”
- Description: “Filtre, compare e exporte gastos por múltiplos critérios.”
- OG: parâmetros no URL para compartilhamento

### Sections & Components
1. **Cabeçalho da página**
   - Título “Explorar Gastos”
   - Breadcrumb: Início / Explorar
   - Ações: “Exportar CSV” e “Copiar link”
2. **Painel de filtros (esquerda)**
   - Período: Ano obrigatório, Mês opcional
   - Categoria (select), Fornecedor (autocomplete), Unidade/Órgão (select)
   - Texto livre (input) para descrição
   - Faixa de valor (min/max)
   - Botões: “Aplicar”, “Limpar”
   - Estados: loading (skeleton), erro (mensagem + tentar novamente)
3. **Resumo do recorte (topo da direita)**
   - Chips com filtros ativos (removíveis)
   - KPIs do conjunto filtrado (total, contagem)
4. **Gráficos (tabs)**
   - Tabs: “Por mês”, “Por categoria”, “Por fornecedor”
   - Interação: clique em barra/linha adiciona filtro e recarrega resultados
5. **Tabela de resultados (principal)**
   - Colunas: Data, Descrição, Categoria, Fornecedor, Valor, Ação
   - Ordenação por coluna, paginação, header sticky
   - Linha clicável abre Detalhe da Despesa mantendo querystring

## Página: Detalhe da Despesa
### Layout
- Desktop: coluna única com cards; topo com resumo e ações; abaixo seções em acordeão.

### Meta Information
- Title: “Detalhe da despesa — {id}”
- Description: “Detalhamento do lançamento, atributos e referência oficial.”
- OG: id + valor + período

### Sections & Components
1. **Header do registro**
   - Título: “Despesa {id}”
   - Subtítulo: data + fornecedor + categoria
   - Ações: “Voltar para Explorar” e “Abrir na fonte oficial”
2. **Resumo (card)**
   - Valor em destaque
   - Campos-chave em grid 2xN (ex.: órgão/unidade, período)
3. **Atributos completos (acordeão)**
   - Lista de campos disponíveis (nome: valor), com formatação (data/moeda)
   - Se existir `raw`, mostrar JSON em viewer colapsável (read-only)
4. **Relacionados (card)**
   - Mini-tabela com itens do mesmo fornecedor/categoria no período
   - CTA “Ver mais” (leva para Explorar com filtros pré-aplicados)

## Diretrizes de interação e acessibilidade
- Feedback: skeleton para gráficos/tabelas; toast para export/link copiado
- A11y: contraste AA, foco visível, navegação por teclado, labels em inputs
- Performance: debounce em autocomplete; paginação server-side; cache no Supabase