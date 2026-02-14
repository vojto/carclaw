import { type ReactNode } from 'react'

interface BigButtonProps {
  children: ReactNode
  color?: 'blue' | 'red'
  onClick?: () => void
}

const colorClasses = {
  blue: 'bg-blue-500 active:bg-blue-700',
  red: 'bg-red-500 active:bg-red-700',
}

export function BigButton({ children, color = 'blue', onClick }: BigButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-16 py-6 ${colorClasses[color]} text-white text-4xl font-semibold rounded-2xl cursor-pointer`}
    >
      {children}
    </button>
  )
}
