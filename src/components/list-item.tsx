interface ListItemProps {
  title: string
  subtitle?: string
  label?: string
  onClick?: () => void
}

export function ListItem({ title, subtitle, label, onClick }: ListItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-neutral-900 active:bg-neutral-700 rounded-2xl px-8 py-6 cursor-pointer flex items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="text-3xl font-semibold text-white truncate">{title}</div>
        {subtitle && (
          <div className="text-2xl text-gray-400 truncate mt-1">{subtitle}</div>
        )}
      </div>
      {label && (
        <div className="text-xl text-gray-400 shrink-0">{label}</div>
      )}
    </button>
  )
}
