-- Limite de tentativas compartilhado entre todas as instâncias da Vercel.
--
-- O limitador em memória (src/lib/rate-limit.ts) vive em cada instância
-- serverless; com várias instâncias ele quase não limita. Este guarda cada
-- tentativa numa tabela e conta numa janela deslizante: "no máximo N nos
-- últimos X segundos", sem o salto de janela fixa.
--
-- Pode rodar mais de uma vez. Cole no SQL Editor do Supabase.

create table if not exists rate_limit_hits (
  id bigint generated always as identity primary key,
  key text not null,
  at timestamptz not null default now()
);

create index if not exists idx_rate_limit_hits_key_at on rate_limit_hits (key, at);
create index if not exists idx_rate_limit_hits_at on rate_limit_hits (at);

-- Sem policy: só o servidor (service role), pela função abaixo.
alter table rate_limit_hits enable row level security;

-- Conta e registra numa operação só. A trava por chave (advisory lock da
-- transação) impede que dois pedidos simultâneos passem os dois no último
-- lugar livre.
create or replace function public.rate_limit_hit(p_key text, p_limit int, p_window_seconds int)
returns table (allowed boolean, remaining int, retry_after_seconds int)
language plpgsql security definer set search_path = public as $$
declare
  v_count int;
  v_oldest timestamptz;
  v_window interval;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 200 then
    raise exception 'invalid_key' using errcode = '22023';
  end if;
  if p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid_limit' using errcode = '22023';
  end if;
  v_window := make_interval(secs => p_window_seconds);

  perform pg_advisory_xact_lock(hashtextextended('rate_limit:' || p_key, 0));

  -- Limpeza, em toda chamada, para a tabela não crescer para sempre:
  --  1. as tentativas desta chave que já saíram da janela;
  --  2. qualquer linha mais velha que a maior janela aceita (1 dia), de
  --     chaves que ninguém mais usa. O índice em `at` deixa isso barato:
  --     normalmente não há nada para apagar.
  delete from rate_limit_hits where key = p_key and at <= now() - v_window;
  delete from rate_limit_hits where at < now() - interval '1 day';

  select count(*), min(at) into v_count, v_oldest from rate_limit_hits where key = p_key;

  if v_count >= p_limit then
    return query select
      false,
      0,
      greatest(1, ceil(extract(epoch from (v_oldest + v_window - now()))))::int;
    return;
  end if;

  insert into rate_limit_hits (key) values (p_key);
  return query select true, p_limit - v_count - 1, 0;
end $$;

revoke all on function public.rate_limit_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, int, int) to service_role;
