import { useState } from "react"

export interface Pesaje {
    id: string
    timestamp: string
    scaleUnit: string
    loteId: string
    cliente: string
    peso: number
    estado: 'Completo' | 'Autorizado' | 'Corregido'
    supervisor: string
    hasWarning?: boolean
    hasEditIcon?: boolean
}

interface PesajesTableProps {
    data: Pesaje[]
}

export function PesajesTable({ data }: PesajesTableProps) {
    const [currentPage, setCurrentPage] = useState(1);

    const renderBadge = (estado: Pesaje['estado'], hasWarning?: boolean, hasEditIcon?: boolean) => {
        const baseClass = "px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1"

        switch (estado) {
            case 'Completo':
                return <span className={`${baseClass} bg-green-50 text-green-600 border border-green-200`}>Completo</span>
            case 'Autorizado':
                return (
                    <div className="flex flex-col items-center">
                        <span className={`${baseClass} bg-red-50 text-red-600 border border-red-100`}>Autorizado</span>
                        {hasWarning && <span className="text-red-500 text-xs mt-0.5">⚠️</span>}
                    </div>
                )
            case 'Corregido':
                return (
                    <div className="flex flex-col items-center">
                        <span className={`${baseClass} bg-amber-50 text-amber-600 border border-amber-200`}>Corregido</span>
                        {hasEditIcon && <span className="text-amber-500 text-xs mt-0.5">✏️</span>}
                    </div>
                )
        }
    }

    return (
        <section className="bg-white rounded-3xl shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="p-4 pl-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Timestamp</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Lote ID</th>
                            <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cliente</th>
                            <th className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Peso (KG)</th>
                            <th className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                            <th className="p-4 pr-6 text-xs font-bold text-slate-400 uppercase tracking-wider">Supervisor</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.map((p) => (
                            <tr
                                key={p.id}
                                className={`hover:bg-slate-50/80 transition-colors ${p.estado === 'Autorizado' ? 'bg-red-50/30' : p.estado === 'Corregido' ? 'bg-amber-50/20' : ''
                                    }`}
                            >
                                <td className="p-4 pl-6">
                                    <div className="text-sm font-bold text-slate-700">{p.timestamp}</div>
                                    <div className="text-[11px] font-semibold text-slate-400">{p.scaleUnit}</div>
                                </td>
                                <td className="p-4 text-sm font-bold text-indigo-600 cursor-pointer hover:underline">
                                    {p.loteId}
                                </td>
                                <td className="p-4 text-sm font-semibold text-slate-600">{p.cliente}</td>
                                <td className={`p-4 text-center text-base font-extrabold ${p.estado === 'Autorizado' ? 'text-red-600' : p.estado === 'Corregido' ? 'text-amber-500' : 'text-slate-800'
                                    }`}>
                                    {p.peso.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="p-4 text-center">{renderBadge(p.estado, p.hasWarning, p.hasEditIcon)}</td>
                                <td className="p-4 pr-6 text-sm font-medium text-slate-500">{p.supervisor}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="p-4 px-6 border-t border-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-slate-400">
                <div>
                    Mostrando <span className="text-slate-700">1-5</span> de <span className="text-slate-700">1,248</span> registros
                </div>
                <div className="flex items-center gap-1">
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100">‹</button>
                    <button onClick={() => setCurrentPage(1)} className={`w-7 h-7 rounded-lg flex items-center justify-center ${currentPage === 1 ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-100 text-slate-600'}`}>1</button>
                    <button onClick={() => setCurrentPage(2)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600">2</button>
                    <button onClick={() => setCurrentPage(3)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600">3</button>
                    <span>...</span>
                    <button className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-100 text-slate-600">42</button>
                    <button className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100">›</button>
                </div>
            </div>
        </section>
    )
}