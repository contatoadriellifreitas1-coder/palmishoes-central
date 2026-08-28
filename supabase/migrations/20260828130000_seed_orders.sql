-- Sample orders for local dashboard previews.
INSERT INTO public.orders (
  customer_name,
  company,
  customer_email,
  customer_phone,
  product_name,
  quantity,
  unit_price,
  total_value,
  status,
  notes,
  due_date
)
VALUES
  ('Mariana Costa', 'Costa Calçados', 'mariana@costacalçados.com.br', '+55 18 99888-1101', 'Palmilha EVA Esportiva', 320, 21.50, 6880.00, 'em_producao', 'Pedido com entrega programada para fábrica de linha esportiva.', now() + interval '8 days'),
  ('Rafael Souza', 'Souza Atelier', 'rafael@souzaatelier.com', '+55 11 98877-3344', 'Palmilha Gel para Sapato Social', 180, 34.90, 6282.00, 'em_transito', 'Carga enviada via transporte próprio.', now() + interval '4 days'),
  ('Letícia Martins', 'Martins Indústria', 'leticia@martinsindustria.com.br', '+55 41 97777-2211', 'Palmilha Comfort Premium', 540, 19.20, 10368.00, 'pendente', 'Aguardando aprovação de última revisão do cliente.', now() + interval '12 days'),
  ('João Pereira', 'Pereira Couros', 'joao@pereiracouros.com.br', '+55 17 99112-7766', 'Palmilha Anticongelante', 140, 45.60, 6384.00, 'entregue', 'Entrega concluída e faturada no mês atual.', now() - interval '3 days'),
  ('Aline Barros', 'Barros & Cia', 'aline@barroscia.com.br', '+55 21 98654-1230', 'Palmilha Ortholite', 260, 26.75, 6955.00, 'cancelado', 'Pedido cancelado após alteração de especificação do cliente.', now() - interval '10 days');
