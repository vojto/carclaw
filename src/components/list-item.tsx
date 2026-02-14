interface ListItemProps {
  title: string
  subtitle?: string
  onClick?: () => void
}

export function ListItem({ title, subtitle, onClick }: ListItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-neutral-900 active:bg-neutral-700 rounded-2xl px-8 py-6 cursor-pointer"
    >
      <div className="text-3xl font-semibold text-white truncate">{title}</div>
      {subtitle && (
        <div className="text-2xl text-gray-400 truncate mt-1">{subtitle}</div>
      )}
    </button>
  )
}
