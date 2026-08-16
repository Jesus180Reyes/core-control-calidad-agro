import { Bike, Building2, ShieldCheck } from 'lucide-react'
import type { ClienteParametro, IconoCliente, SkuParametro } from '#/presentation/types/parametros/parametros.types'

const ICONOS_CLIENTE: Record<IconoCliente, typeof Bike> = {
  bike: Bike,
  shield: ShieldCheck,
  building: Building2,
}

const ESTADO_ESTILOS: Record<ClienteParametro['estado'], string> = {
  ACTIVO: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  PENDIENTE: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
  INACTIVO: 'bg-slate-100 text-slate-500 dark:bg-zinc-800 dark:text-zinc-400',
}

interface ClienteParametroCardProps {
  cliente: ClienteParametro
}

export function ClienteParametroCard({ cliente }: ClienteParametroCardProps) {
  const Icono = ICONOS_CLIENTE[cliente.icono]

  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
            <Icono className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">{cliente.nombre}</h3>
            <p className="text-[11px] text-slate-400 font-semibold">
              {cliente.segmento} · {cliente.skus.length} SKUs
            </p>
          </div>
        </div>
        <span
          className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0 ${ESTADO_ESTILOS[cliente.estado]}`}
        >
          {cliente.estado}
        </span>
      </div>

      <div className="space-y-2.5">
        {cliente.skus.map((sku) => (
          <SkuParametroRow key={sku.id} sku={sku} />
        ))}
      </div>
    </div>
  )
}

interface SkuParametroRowProps {
  sku: SkuParametro
}

function SkuParametroRow({ sku }: SkuParametroRowProps) {
  return (
    <div className="bg-slate-50/60 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-800 rounded-2xl p-3.5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-black text-slate-500 dark:text-zinc-400 uppercase tracking-wide">
            {sku.nombre}
          </p>
          <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{sku.sku}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Peso Objetivo</p>
          <p className="text-sm font-extrabold text-slate-800 dark:text-zinc-100">
            {sku.pesoIdealKg.toLocaleString('es-HN')} <span className="text-slate-400 font-semibold text-xs">kg</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl px-3 py-1.5">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Tolerancia Min</p>
          <p className="text-xs font-extrabold text-red-500">-{sku.toleranciaMinPct.toLocaleString('es-HN')}%</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-xl px-3 py-1.5">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-wide">Tolerancia Max</p>
          <p className="text-xs font-extrabold text-emerald-500">+{sku.toleranciaMaxPct.toLocaleString('es-HN')}%</p>
        </div>
      </div>
    </div>
  )
}
