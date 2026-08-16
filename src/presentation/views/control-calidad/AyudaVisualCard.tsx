export function AyudaVisualCard() {
    return (
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.015)] space-y-3">
            <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-zinc-200">Ayuda Visual</h3>
                <p className="text-[11px] text-slate-400 font-semibold">Protocolo de Ajuste para Azúcar S-88</p>
            </div>

            <div className="w-full h-32 rounded-xl overflow-hidden border border-slate-100 dark:border-zinc-800">
                <img
                    src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=350"
                    alt="Protocolo de llenado"
                    className="w-full h-full object-cover grayscale opacity-90 contrast-110"
                />
            </div>
        </div>
    )
}