import { createContext, useContext } from 'react'
import { RootViewModel } from './root-view-model'

export const ViewModelContext = createContext<RootViewModel>(null!)

export function useViewModel() {
  return useContext(ViewModelContext)
}
