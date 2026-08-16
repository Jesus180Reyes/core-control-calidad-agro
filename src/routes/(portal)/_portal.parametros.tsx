import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/(portal)/_portal/parametros')({
  component: ParametrosPage,
})

function ParametrosPage() {
  return <div>Hello "/(portal)/_portal/parametros"!</div>
}
