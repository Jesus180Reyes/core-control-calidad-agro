export function BannerEstabilizacion({ tiempo }: { tiempo: number }) {
    return (
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4 text-center animate-pulse flex items-center justify-center gap-2">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <span className="inline-block w-2.5 h-2.5 bg-blue-600 rounded-full animate-ping mr-1"></span>
                ⏳ Detectando peso estable... Por favor, no retire el producto (esperando {tiempo}s).
            </span>
        </div>
    )
}