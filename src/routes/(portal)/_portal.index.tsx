import { createFileRoute } from '@tanstack/react-router'

import { HomeView } from '#/presentation/views/home/HomeView'

export const Route = createFileRoute('/(portal)/_portal/')({ component: HomeView })
