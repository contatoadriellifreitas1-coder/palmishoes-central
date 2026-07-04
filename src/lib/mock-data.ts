// Realistic mock data to populate dashboards, feeds and catalog while real
// integrations (social APIs, payment gateways, chatbot webhooks) are pending.

export const salesTrend = [
  { month: "Jan", vendas: 128000, meta: 120000 },
  { month: "Fev", vendas: 142500, meta: 130000 },
  { month: "Mar", vendas: 137800, meta: 135000 },
  { month: "Abr", vendas: 165200, meta: 145000 },
  { month: "Mai", vendas: 158900, meta: 150000 },
  { month: "Jun", vendas: 189400, meta: 160000 },
  { month: "Jul", vendas: 203100, meta: 175000 },
];

export const errorsByType = [
  { tipo: "Logística", qtd: 14 },
  { tipo: "Produção", qtd: 8 },
  { tipo: "Faturamento", qtd: 5 },
  { tipo: "Qualidade", qtd: 3 },
  { tipo: "Estoque", qtd: 6 },
];

export const channelSplit = [
  { canal: "WhatsApp", valor: 46 },
  { canal: "Site", valor: 27 },
  { canal: "Indicação", valor: 18 },
  { canal: "Feiras", valor: 9 },
];

export type SocialMention = {
  id: string;
  platform: "instagram" | "facebook" | "whatsapp" | "linkedin";
  author: string;
  handle: string;
  message: string;
  time: string;
  sentiment: "positivo" | "neutro" | "negativo";
};

export const socialMentions: SocialMention[] = [
  {
    id: "1",
    platform: "whatsapp",
    author: "Calçados Bella",
    handle: "+55 18 99123-4567",
    message: "Vocês têm palmilhas pré-prontas para tênis infantil em pronta entrega?",
    time: "há 4 min",
    sentiment: "neutro",
  },
  {
    id: "2",
    platform: "instagram",
    author: "Ana Ferreira",
    handle: "@anaf.calcados",
    message: "Recebi a amostra das palmilhas personalizadas, acabamento impecável! 👏",
    time: "há 22 min",
    sentiment: "positivo",
  },
  {
    id: "3",
    platform: "facebook",
    author: "Indústria Passo Firme",
    handle: "Passo Firme Calçados",
    message: "Qual o prazo mínimo de entrega para pedidos de 5.000 pares?",
    time: "há 1 h",
    sentiment: "neutro",
  },
  {
    id: "4",
    platform: "instagram",
    author: "Marcos Lima",
    handle: "@marcoslima.shoes",
    message: "O último lote veio com atraso de 3 dias, precisamos ajustar isso.",
    time: "há 2 h",
    sentiment: "negativo",
  },
  {
    id: "5",
    platform: "linkedin",
    author: "Grupo Ortopé",
    handle: "Ortopé Componentes",
    message: "Interesse em parceria para linha de palmilhas anatômicas premium.",
    time: "há 5 h",
    sentiment: "positivo",
  },
];

export type CatalogItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  stock: number;
  synced: boolean;
};

export const catalogItems: CatalogItem[] = [
  { id: "1", name: "Palmilha Pré-Pronta EVA", sku: "PP-EVA-001", category: "Pré-Prontas", stock: 12400, synced: true },
  { id: "2", name: "Palmilha Personalizada Couro", sku: "PC-CR-014", category: "Personalizadas", stock: 3200, synced: true },
  { id: "3", name: "Palmilha Anatômica Premium", sku: "PA-PR-007", category: "Anatômicas", stock: 850, synced: false },
  { id: "4", name: "Palmilha Infantil Antibacteriana", sku: "PI-AB-022", category: "Infantil", stock: 6700, synced: true },
  { id: "5", name: "Palmilha Esportiva Gel", sku: "PE-GEL-009", category: "Esportivas", stock: 1980, synced: false },
];

export type AgendaEvent = {
  id: string;
  title: string;
  date: string;
  type: "reunião" | "entrega" | "feira" | "produção";
};

export const agenda: AgendaEvent[] = [
  { id: "1", title: "Entrega — Passo Firme (5.000 pares)", date: "08 Jul, 09:00", type: "entrega" },
  { id: "2", title: "Reunião comercial — Grupo Ortopé", date: "09 Jul, 14:30", type: "reunião" },
  { id: "3", title: "Início produção lote PA-PR-007", date: "10 Jul, 07:00", type: "produção" },
  { id: "4", title: "Feira Couromoda — estande B12", date: "15 Jul, 10:00", type: "feira" },
];

export type SystemLog = {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  time: string;
};

export const systemLogs: SystemLog[] = [
  { id: "1", level: "info", message: "Sincronização de catálogo concluída (5 itens).", time: "04 Jul, 08:12" },
  { id: "2", level: "warn", message: "Item PA-PR-007 com estoque abaixo do mínimo.", time: "04 Jul, 07:55" },
  { id: "3", level: "info", message: "Campanha de chatbot 'Boas-vindas' ativada.", time: "03 Jul, 18:40" },
  { id: "4", level: "error", message: "Falha temporária na integração de WhatsApp (reconectado).", time: "03 Jul, 15:21" },
  { id: "5", level: "info", message: "Novo lead importado do formulário do site.", time: "03 Jul, 11:03" },
];

export const sampleLeads = [
  { name: "Calçados Bella", company: "Bella Indústria de Calçados", email: "compras@calcadosbella.com.br", phone: "+55 18 99123-4567", product_interest: "Palmilhas Pré-Prontas", status: "novo", estimated_value: 48000, notes: "Interesse em pronta entrega para linha infantil." },
  { name: "Passo Firme", company: "Passo Firme Calçados", email: "suprimentos@passofirme.com", phone: "+55 51 98877-1200", product_interest: "Palmilhas Personalizadas", status: "em_contato", estimated_value: 125000, notes: "Aguardando aprovação de amostra." },
  { name: "Grupo Ortopé", company: "Ortopé Componentes", email: "parcerias@ortope.com.br", phone: "+55 11 3456-7890", product_interest: "Palmilhas Anatômicas Premium", status: "em_contato", estimated_value: 320000, notes: "Parceria de longo prazo em negociação." },
  { name: "Marcos Lima", company: "Lima Shoes", email: "marcos@limashoes.com", phone: "+55 47 99999-0011", product_interest: "Palmilhas Esportivas Gel", status: "fechado", estimated_value: 62000, notes: "Contrato assinado, primeiro pedido enviado." },
  { name: "Ana Ferreira", company: "AF Calçados", email: "ana@afcalcados.com.br", phone: "+55 85 98123-4455", product_interest: "Palmilhas Personalizadas", status: "novo", estimated_value: 27000, notes: "Elogiou o acabamento da amostra." },
];