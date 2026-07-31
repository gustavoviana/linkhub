// Esqueleto que aparece no instante em que o assinante troca de aba.
//
// Sem ele o navegador segurava a tela antiga até o servidor responder — meio
// segundo largo em que nada acontecia e a central parecia travada. O Next só
// consegue mostrar algo na hora quando a rota tem uma fronteira de carregamento
// como esta; e, com ela, ainda passa a pré-carregar a casca da rota no hover.
//
// Fica neutro de propósito: cinza translúcido funciona no tema claro e no
// escuro de qualquer provedor, sem depender das cores da marca (que só chegam
// depois, com os dados).

const bloco = 'rgba(128,128,128,0.14)';

function Barra({ h, w, r = 10 }: { h: number; w: number | string; r?: number }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: bloco }} />;
}

export default function PortalLoading() {
  return (
    <div style={{ minHeight: '100vh' }} className="animate-pulse">
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        {/* Mesma faixa da barra lateral: assim ela não pisca durante a troca. */}
        <aside
          className="hidden lg:flex"
          style={{
            width: 240,
            height: '100vh',
            flexShrink: 0,
            borderRight: '1px solid rgba(128,128,128,0.18)',
            flexDirection: 'column',
            gap: 10,
            padding: '18px 14px',
          }}
        >
          <Barra h={32} w={120} />
          <div style={{ height: 12 }} />
          <Barra h={38} w="100%" />
          <Barra h={38} w="100%" />
          <Barra h={38} w="100%" />
          <Barra h={38} w="100%" />
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          <div style={{ maxWidth: 640, margin: '0 auto', padding: '16px 20px 120px' }}>
            <Barra h={22} w={160} />
            <div style={{ height: 18 }} />
            <Barra h={132} w="100%" r={16} />
            <div style={{ height: 12 }} />
            <Barra h={92} w="100%" r={16} />
            <div style={{ height: 12 }} />
            <Barra h={92} w="100%" r={16} />
          </div>
        </main>
      </div>

      {/* Barra de abas do celular, para o rodapé também não sumir. */}
      <div
        className="lg:hidden"
        style={{
          position: 'fixed',
          left: 12,
          right: 12,
          bottom: 12,
          height: 62,
          borderRadius: 20,
          background: bloco,
        }}
      />
    </div>
  );
}
