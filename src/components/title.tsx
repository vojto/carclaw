import { type ReactNode } from 'react'

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="text-6xl font-bold text-white">{children}</h1>
}
