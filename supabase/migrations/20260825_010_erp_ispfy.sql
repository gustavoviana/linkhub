-- ISPFY entra na lista de ERPs suportados.
--
-- `erp_type` é enum, não texto: sem este valor o painel salvaria a integração
-- e o banco recusaria o UPDATE, com um erro que não diz nada ao provedor.
--
-- `add value if not exists` é idempotente, mas o valor novo não pode ser usado
-- na mesma transação em que nasce — por isso esta migração só declara o tipo e
-- nada mais. Quem grava é o painel, depois.

alter type erp_type add value if not exists 'ispfy';
