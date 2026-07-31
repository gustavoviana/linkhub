// Quanto o assinante paga por mês, quando o ERP não diz.
//
// O SGP não manda valor de plano no contrato — a API da URA devolve o nome do
// plano e mais nada sobre preço. Por isso a central mostrava "R$ 0,00" na
// mensalidade de todo mundo.
//
// O que existe é o histórico de faturas. E ali a resposta não é "a última":
// uma fatura em atraso vem com juros embutidos (foi o caso de R$ 81,55 numa
// mensalidade de R$ 79,90) e mentiria o valor. O valor que mais se repete é o
// da mensalidade; as exceções são exceção.

export function mensalidadeDeFaturas(valores: (number | null | undefined)[]): number | null {
  const validos = valores.filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0);
  if (!validos.length) return null;

  const vezes = new Map<number, number>();
  for (const v of validos) vezes.set(v, (vezes.get(v) ?? 0) + 1);

  // Empate fica com quem apareceu primeiro na lista — quem chama manda em
  // ordem decrescente de vencimento, então o empate cai na fatura mais nova.
  let escolhido = validos[0];
  let maior = 0;
  for (const [valor, n] of vezes) {
    if (n > maior) {
      escolhido = valor;
      maior = n;
    }
  }
  return escolhido;
}
