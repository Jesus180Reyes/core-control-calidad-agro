import { createFileRoute } from '@tanstack/react-router'
import { useParametros } from '#/presentation/hooks/parametros/useParametros'
import { ClienteParametroCard } from '#/presentation/views/parametros/ClienteParametroCard'
import { NuevoClienteCard } from '#/presentation/views/parametros/NuevoClienteCard'

export const Route = createFileRoute('/(portal)/_portal/parametros')({
  component: ParametrosPage,
})

function ParametrosPage() {
  const { clientes } = useParametros()

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-slate-800 dark:text-zinc-100">Parámetros</h1>
        <p className="text-sm text-slate-400 font-medium">
          Configura el peso ideal y las tolerancias de calidad por cliente y SKU
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {clientes.map((cliente) => (
          <ClienteParametroCard key={cliente.id} cliente={cliente} />
        ))}

        <NuevoClienteCard />
      </div>
    </div>
  )
}
