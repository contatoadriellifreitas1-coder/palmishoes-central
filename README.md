# Palmishoes Command Center

Aqui está o seu prompt estruturado e otimizado para o Lovable, consolidando todas as informações fornecidas para a criação do MVP.

[PROJECT OVERVIEW]

O "Painel de Gestão Interna da Palmishoes" é uma plataforma web de operações corporativas e CRM projetada para os proprietários de uma empresa de componentes calçadistas gerenciarem o negócio. O sistema centraliza o monitoramento de métricas de vendas e erros, triagem de leads, monitoramento de mídias sociais, configurações do site e um simulador automatizado de campanhas de chatbot. O objetivo é resolver a descentralização operacional, unificando a gestão em um único dashboard intuitivo.

[SCREENS AND USER FLOW]

Tela de Login / Autenticação: Tela limpa contendo campos para e-mail e senha, além de botão para login corporativo. Fluxo: Após autenticação bem-sucedida, o usuário é direcionado para o Dashboard Principal.

Dashboard Principal (Visão Geral): Centraliza os principais indicadores em tempo real. Inclui cards de métricas (Volume de Vendas, Taxa de Erros/Logística, Leads Recentes e Status do Chatbot) e gráficos de linha/barra para tendências de vendas. Navegação por menu lateral persistente para as outras seções.

Gestão de Leads & CRM (Triagem): Tabela avançada para triagem de clientes interessados em componentes. Filtros por status do lead (Novo, Em Contato, Fechado), detalhes de contato e histórico de interações.

Módulo de Chatbot (Funcionalidade Central): Tela de simulação e configuração de campanhas automatizadas de chatbot. Deve conter um construtor visual simples de fluxo de mensagens (Gatilho -> Resposta) e uma área de teste simulada (widget de chat em tempo real) para validar o comportamento das campanhas.

Monitoramento de Mídias Sociais & Catálogo: Feed consolidado simulando menções e mensagens das redes sociais da marca, integrado a uma área de sincronização rápida do catálogo de componentes e agenda.

Configurações do Site: Painel administrativo simples para atualizar informações básicas da marca, textos institucionais e visualizar logs do sistema.

[VISUAL IDENTITY]

Estilo: Corporativo, moderno e clean, focado em alta legibilidade e eficiência de dados.

Paleta de Cores:

Cor Primária: Azul Royal Intenso (#003399) para botões principais, links ativos e destaques de navegação.

Cor Secundária / Fundo: Branco (#FFFFFF) e Cinza Claro (#F8F9FA a #E9ECEF) para contêineres, tabelas e bordas nítidas.

Texto: Preto Nítido (#000000) e Cinza Escuro (#212529) para garantir excelente contraste.

Tipografia: Família de fontes Sans-Serif moderna (ex: Inter, Roboto ou Open Sans), limpa e sem serifa.

Assets: Incorporar de forma proeminente no cabeçalho/sidebar o logotipo oficial extraído de https://palmishoes.com.br/.

[PLATFORM]

Tipo: Aplicação exclusivamente Web (Desktop).

Responsividade: Layout otimizado para telas desktop e notebooks (breakpoints a partir de 1024px), priorizando o uso de dashboards densos em dados e tabelas horizontais longas.

[KEY FEATURES]

Prioridade 1 (MVP Obrigatório): Simulador de campanhas de chatbot com construtor de fluxo lógico e preview funcional de chat.

Prioridade 2: Dashboard de métricas operacionais (vendas, erros) com gráficos interativos e tabela de triagem de leads (CRM).

Prioridade 3: Módulo de monitoramento de mídias sociais, sincronização de catálogo/agenda e tela de configurações básicas do site.

[TECHNICAL REQUIREMENTS]

Backend & Banco de Dados: Sim, estrutura preparada para persistência de dados (Supabase/PostgreSQL integrado nativamente ao Lovable) para armazenar usuários, leads triados, fluxos de chatbot criados e configurações.

Autenticação: Sistema de login seguro via e-mail e senha integrado ao backend.

Integrações: Preparar a arquitetura da interface com componentes prontos e estados de loading para futuras conexões de APIs reais de mídias sociais, gateways de pagamento e webhooks de chatbot.

Dados da Interface: Utilizar conteúdo mockado (dados de exemplo) realista e bem estruturado para popular todas as tabelas, gráficos e feeds neste primeiro momento.

[ADDITIONAL CONTEXT]

O sistema é de uso estritamente interno para os tomadores de decisão da Palmishoes. Evitar elementos visuais puramente decorativos ou lúdicos. O foco do design deve ser a densidade de informação limpa (uso correto de espaços em branco, tabelas com paginação e ordenação, gráficos claros e feedbacks visuais imediatos ao salvar configurações ou testar o chatbot).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e9f17607-887c-48bf-9288-ce77094f7c9f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
