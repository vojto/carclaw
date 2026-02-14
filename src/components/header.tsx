import { type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'

interface HeaderProps {
  children: ReactNode
  onBack?: () => void
  action?: ReactNode
}

export function Header({ children, onBack, action }: HeaderProps) {
  return (
    <div className="flex items-center gap-6">
      {onBack ? (
        <button
          onClick={onBack}
          className="w-32 h-32 rounded-full bg-neutral-800 active:bg-neutral-600 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <ArrowLeft size={56} className="text-white" />
        </button>
      ) : (
        <div className="w-32 h-32 shrink-0" />
      )}
      <h1 className="text-6xl font-bold text-white text-center flex-1">
        {children}
      </h1>
      {action ? (
        <div className="shrink-0">{action}</div>
      ) : (
        <div className="w-32 h-32 shrink-0" />
      )}
    </div>
  )
}
