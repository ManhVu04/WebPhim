import { createContext, useContext } from 'react'

const PrerenderDataContext = createContext({})

export function PrerenderDataProvider({ initialData = {}, children }) {
  return (
    <PrerenderDataContext.Provider value={initialData || {}}>
      {children}
    </PrerenderDataContext.Provider>
  )
}

export function usePrerenderData() {
  return useContext(PrerenderDataContext)
}
