INSERT INTO public.leads (name, company, email, phone, product_interest, status, estimated_value, notes, last_contact_at)
VALUES
  ('Ana Paula Souza', 'Calçados Norte', 'ana@calcadosnorte.com.br', '(11) 99877-1234', 'Palmilha para calçados esportivos', 'novo', 4200.00, 'Solicitou orçamento para 3 modelos diferentes.', NOW() - INTERVAL '2 days'),
  ('Carlos Mendes', 'Fábrica Forte Pe', 'carlos@fortepe.com.br', '(19) 99765-4321', 'Palmilha com tecnologia antiimpacto', 'em_contato', 6800.00, 'Interessado em amostra com material de maior conforto.', NOW() - INTERVAL '5 days'),
  ('Beatriz Rocha', 'Mãos de Couro', 'beatriz@maosdecouro.com.br', '(21) 98888-1122', 'Palmilha para produção em série', 'fechado', 12500.00, 'Pedido fechado com entrega no próximo mês.', NOW() - INTERVAL '10 days'),
  ('Eduardo Lima', 'Sol do Pampa', 'eduardo@soldopampa.com', '(41) 99123-4567', 'Palmilha para botas industriais', 'novo', 3900.00, 'Entrou pelo Instagram e pediu informações sobre volume.', NOW() - INTERVAL '1 day'),
  ('Fernanda Costa', 'Bota Premium', 'fernanda@botapremium.com.br', '(31) 98555-7788', 'Palmilha premium para calçados femininos', 'em_contato', 5400.00, 'Pediu retorno após envio de catálogo digital.', NOW() - INTERVAL '4 days');
