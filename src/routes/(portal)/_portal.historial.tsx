import { HistorialPesajesHeader } from '#/presentation/views/historial/HistorialPesajesView'
import { PesajesTable, type Pesaje } from '#/presentation/views/historial/PesajesTable'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(portal)/_portal/historial')({
  component: HIstorialPage,
})

function HIstorialPage() {
  const pesajesSimulados: Pesaje[] = [
    { id: '1', timestamp: '19 Oct, 14:23', scaleUnit: 'Scale Unit #04', loteId: '#LT-88421', cliente: 'AgroExport S.A.', peso: 1240.50, estado: 'Completo', supervisor: 'R. Martinez' },
    { id: '2', timestamp: '19 Oct, 13:45', scaleUnit: 'Scale Unit #02', loteId: '#LT-88419', cliente: 'Central Frutera', peso: 982.15, estado: 'Autorizado', supervisor: 'M. Solares (Auth)', hasWarning: true },
    { id: '3', timestamp: '19 Oct, 11:12', scaleUnit: 'Scale Unit #04', loteId: '#LT-88405', cliente: 'Distribuidora Norte', peso: 2150.00, estado: 'Corregido', supervisor: 'L. Herrera', hasEditIcon: true },
    { id: '4', timestamp: '19 Oct, 10:55', scaleUnit: 'Scale Unit #01', loteId: '#LT-88402', cliente: 'AgroExport S.A.', peso: 5432.80, estado: 'Completo', supervisor: 'R. Martinez' },
    { id: '5', hasEditIcon: true, timestamp: '19 Oct, 09:20', scaleUnit: 'Scale Unit #04', loteId: '#LT-88390', cliente: 'Ocean Produce', peso: 880.40, estado: 'Completo', supervisor: 'R. Martinez' },
  ]
  return <>

    <section>
      <HistorialPesajesHeader />
    </section>
    <section>
      <PesajesTable data={pesajesSimulados} />
    </section>
  </>
}
