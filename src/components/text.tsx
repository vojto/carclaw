import { type ReactNode } from 'react'

export function Text({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-3xl text-gray-300 leading-relaxed ${className}`}>{children}</p>
}
