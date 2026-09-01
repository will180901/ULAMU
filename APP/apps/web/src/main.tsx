import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@/styles/globals.css'
import { GardeFou } from '@/components/layout/GardeFou'
import { App } from './App.tsx'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      {/* Dernier recours : ce qui casse hors de la coquille — écrans d'entrée, coquille elle-même.
          Il ne peut que proposer de recharger, et c'est ce qu'il dit. */}
      <GardeFou portee="page">
        <App />
      </GardeFou>
    </QueryClientProvider>
  </StrictMode>,
)
