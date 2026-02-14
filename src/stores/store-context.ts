import { createContext, useContext } from 'react'
import { RootStore } from './root-store'

export const StoreContext = createContext<RootStore>(null!)

export function useStore() {
  return useContext(StoreContext)
}
