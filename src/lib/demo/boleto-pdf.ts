// PDF do boleto de exemplo.
//
// A central baixa o boleto do ERP do provedor; na demonstração não existe ERP
// para pedir, e o botão "Baixar boleto em PDF" não pode ser o único da tela
// que não faz nada — é justamente um dos que o visitante vai clicar.
//
// Então o arquivo é desenhado aqui, à mão. É um PDF mínimo e legítimo: uma
// página, duas fontes do conjunto básico (que todo leitor já tem, sem
// embutir), texto e retângulos. Sem dependência nova no projeto por causa de
// uma folha de demonstração.
//
// O documento se anuncia como demonstração no topo, no meio e no pé: ele vai
// parar na pasta de downloads de quem visitou, e um boleto que se pareça com
// cobrança sem ser cobrança é problema de todo mundo.

import { formatBRL, formatDate, formatMonthYear } from '@/lib/utils';
import type { Invoice } from '@/lib/supabase/types';

const A4 = { largura: 595, altura: 842 };

/** Fontes do conjunto básico do PDF: nada para embutir. */
const F_NORMAL = '/F1';
const F_NEGRITO = '/F2';

// Pontuação tipográfica que o latin1 não representa, e o equivalente de
// máquina de escrever. Escritos como \u… de propósito: travessão, aspa curva
// e espaço fixo são invisíveis ou parecidos demais com os primos ASCII
// dentro de um regex, e um deles some sem deixar rastro na revisão.
const FORA_DO_LATIN1: [RegExp, string][] = [
  [/[\u2010-\u2015]/g, '-'], // hífens e travessões
  [/[\u2018\u2019\u201b]/g, "'"], // aspas simples curvas
  [/[\u201c\u201d]/g, '"'], // aspas duplas curvas
  [/\u2026/g, '...'], // reticências
  [/\u00a0/g, ' '], // espaço que não quebra
];

/**
 * Prepara um texto para entrar num literal do PDF.
 *
 * Primeiro escapa o que o PDF lê como sintaxe. Depois rebaixa a pontuação
 * tipográfica: o arquivo é escrito em latin1, que é o que a WinAnsiEncoding
 * das fontes básicas espera, e o travessão não existe lá — ele saía como um
 * buraco no meio da frase, e "Sua Logo — Provedor" virava "Sua Logo  Provedor".
 * Acento, esse, o latin1 tem: é por isso que "Acácias" e "DEMONSTRAÇÃO" saem
 * inteiros.
 */
function txt(valor: string): string {
  let saida = valor.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  for (const [de, para] of FORA_DO_LATIN1) saida = saida.replace(de, para);
  // Rede de segurança para o que não estiver na lista: um caractere que o
  // latin1 não representa vira lixo dentro do arquivo, e perder o caractere
  // é melhor do que corromper a linha inteira.
  return saida.replace(/[^ -\u00ff]/g, '');
}

class Pagina {
  private ops: string[] = [];

  texto(x: number, y: number, conteudo: string, tamanho = 10, negrito = false, cinza = 0) {
    this.ops.push(
      `BT ${negrito ? F_NEGRITO : F_NORMAL} ${tamanho} Tf ${cinza} g ` +
        `1 0 0 1 ${x} ${A4.altura - y} Tm (${txt(conteudo)}) Tj ET`,
    );
    return this;
  }

  /** Texto alinhado à direita de `x`, medido pela largura média da Helvetica. */
  textoDireita(x: number, y: number, conteudo: string, tamanho = 10, negrito = false, cinza = 0) {
    const largura = conteudo.length * tamanho * (negrito ? 0.55 : 0.5);
    return this.texto(x - largura, y, conteudo, tamanho, negrito, cinza);
  }

  retangulo(x: number, y: number, largura: number, altura: number, cinza: number) {
    this.ops.push(`${cinza} g ${x} ${A4.altura - y - altura} ${largura} ${altura} re f`);
    return this;
  }

  linha(x1: number, y: number, x2: number, cinza = 0.8) {
    this.ops.push(`${cinza} G 0.7 w ${x1} ${A4.altura - y} m ${x2} ${A4.altura - y} l S`);
    return this;
  }

  build(): string {
    return this.ops.join('\n');
  }
}

/**
 * Barras a partir dos dígitos da linha. Não é um código de barras válido —
 * seria errado gerar um que um leitor de caixa aceitasse — mas tem a
 * aparência e a irregularidade de um, que é o que a folha precisa mostrar.
 */
function barras(pagina: Pagina, x: number, y: number, digitos: string) {
  let cursor = x;
  for (const caractere of digitos.replace(/\D/g, '').slice(0, 44)) {
    const largura = (Number(caractere) % 3) + 1;
    pagina.retangulo(cursor, y, largura, 42, 0);
    cursor += largura + 2.4;
  }
}

export function demoBoletoPdf(invoice: Invoice, pagador: string, provedor: string) {
  const p = new Pagina();
  const M = 56; // margem
  const D = A4.largura - M; // borda direita

  // Tarja de demonstração, antes de qualquer outra coisa na folha.
  p.retangulo(0, 0, A4.largura, 34, 0.93);
  p.texto(M, 22, 'DOCUMENTO DE DEMONSTRAÇÃO - SEM VALOR FISCAL E NÃO PAGÁVEL', 9, true, 0.25);

  p.texto(M, 74, provedor, 18, true);
  p.texto(M, 92, 'Central do assinante - 2ª via de fatura', 10, false, 0.4);
  p.textoDireita(D, 74, 'Vencimento', 9, false, 0.4);
  p.textoDireita(D, 90, formatDate(invoice.due_date), 15, true);
  p.linha(M, 108, D);

  p.texto(M, 134, 'PAGADOR', 8, true, 0.45);
  p.texto(M, 150, pagador, 12);
  p.texto(M, 166, 'CPF 123.456.789-09', 10, false, 0.4);

  p.textoDireita(D, 134, 'VALOR DO DOCUMENTO', 8, true, 0.45);
  p.textoDireita(D, 154, formatBRL(invoice.amount_cents), 20, true);
  p.linha(M, 184, D);

  p.texto(M, 210, 'BENEFICIÁRIO', 8, true, 0.45);
  p.texto(M, 226, `${provedor} - Provedor de Demonstração LTDA`, 11);
  p.texto(M, 242, 'Agência/Código do beneficiário  1790 / 0104351-0', 10, false, 0.4);

  p.texto(M, 274, 'REFERÊNCIA', 8, true, 0.45);
  // O mês, não a data: a fatura cobre setembro inteiro, e "01/09/2026" fazia
  // a folha parecer cobrar um dia.
  p.texto(
    M,
    290,
    invoice.reference_month ? formatMonthYear(invoice.reference_month) : formatDate(invoice.due_date),
    11,
  );
  p.texto(M, 306, `Nosso número ${invoice.external_id ?? '-'}`, 10, false, 0.4);
  p.linha(M, 330, D);

  p.texto(M, 356, 'LINHA DIGITÁVEL', 8, true, 0.45);
  p.texto(M, 376, invoice.boleto_line ?? '-', 12, true);

  barras(p, M, 400, invoice.boleto_line ?? '0');

  p.linha(M, 470, D);
  p.texto(M, 494, 'INSTRUÇÕES', 8, true, 0.45);
  p.texto(M, 512, 'Esta folha faz parte de uma demonstração da plataforma LinkHub.', 10, false, 0.25);
  p.texto(M, 528, 'Não representa cobrança, não pode ser paga e não tem validade fiscal.', 10, false, 0.25);
  p.texto(M, 544, 'O boleto do seu provedor sai com os dados bancários reais dele.', 10, false, 0.25);

  p.retangulo(M, 574, D - M, 1, 0.85);
  p.texto(M, 600, 'Na central de verdade este arquivo vem do sistema do provedor,', 9, false, 0.5);
  p.texto(M, 614, 'com o mesmo botão e no mesmo lugar desta tela.', 9, false, 0.5);

  p.texto(M, A4.altura - 56, 'linkhub.api.br  ·  demonstração', 9, false, 0.55);

  return montarPdf(p.build());
}

/**
 * Monta o arquivo. A tabela xref precisa do byte exato onde cada objeto
 * começa, então os objetos são escritos em sequência e as posições anotadas
 * no caminho — daí a montagem por acumulação em vez de um template.
 */
function montarPdf(conteudo: string) {
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.largura} ${A4.altura}] ` +
      '/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(conteudo, 'latin1')} >>\nstream\n${conteudo}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
  ];

  let arquivo = '%PDF-1.4\n';
  const posicoes: number[] = [];
  objetos.forEach((corpo, i) => {
    posicoes.push(Buffer.byteLength(arquivo, 'latin1'));
    arquivo += `${i + 1} 0 obj\n${corpo}\nendobj\n`;
  });

  const inicioXref = Buffer.byteLength(arquivo, 'latin1');
  arquivo += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`;
  for (const posicao of posicoes) {
    arquivo += `${String(posicao).padStart(10, '0')} 00000 n \n`;
  }
  arquivo +=
    `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${inicioXref}\n%%EOF\n`;

  return Buffer.from(arquivo, 'latin1');
}
