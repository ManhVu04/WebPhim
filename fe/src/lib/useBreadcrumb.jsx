import { createContext, useContext, useState } from 'react'

const BreadcrumbCtx = createContext(null)

export function BreadcrumbProvider({ children }) {
  const [items, setItems] = useState(null)
  return <BreadcrumbCtx.Provider value={{ items, setItems }}>{children}</BreadcrumbCtx.Provider>
}

export function useBreadcrumb() {
  return useContext(BreadcrumbCtx)
}
