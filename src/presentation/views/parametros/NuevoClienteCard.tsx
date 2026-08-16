import { Plus } from 'lucide-react'

export function NuevoClienteCard() {
  return (
    <div className="w-full min-h-[140px] flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 dark:border-zinc-800 rounded-3xl text-slate-400">
      <span className="w-10 h-10 rounded-full bg-slate-50 dark:bg-zinc-900 flex items-center justify-center">
        <Plus className="w-5 h-5" strokeWidth={2.5} />
      </span>
      <span className="text-sm font-bold text-center leading-tight">
        Nuevo Cliente /<br />Configuración
      </span>
    </div>
  )
}
