// Esqueleto da aba Aplicativo enquanto o servidor lê a ficha e os builds.

function Bar({ className }: { className: string }) {
  return <div className={`rounded-md bg-bg-3 animate-pulse ${className}`} />;
}

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando o aplicativo">
      <div className="px-6 lg:px-8 pt-8 pb-6 border-b border-border space-y-3">
        <Bar className="h-3 w-24" />
        <Bar className="h-7 w-64" />
        <Bar className="h-4 w-96 max-w-full" />
      </div>
      <div className="px-6 lg:px-8 py-6 grid xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-5">
          {[0, 1, 2].map((card) => (
            <div key={card} className="lh-card p-5 space-y-4">
              <Bar className="h-4 w-40" />
              <Bar className="h-3 w-64" />
              <div className="grid sm:grid-cols-2 gap-5">
                <Bar className="h-11 w-full" />
                <Bar className="h-11 w-full" />
              </div>
            </div>
          ))}
          <div className="lh-card p-5 space-y-2">
            <Bar className="h-4 w-20" />
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-center gap-3 p-3 rounded-[10px] border border-border">
                <Bar className="h-[22px] w-16 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Bar className="h-3.5 w-28" />
                  <Bar className="h-3 w-40" />
                </div>
                <Bar className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
        <div className="lh-card p-5 space-y-3 hidden xl:block">
          <Bar className="h-20 w-20 mx-auto rounded-[22px]" />
          <Bar className="h-3 w-24 mx-auto" />
        </div>
      </div>
    </div>
  );
}
