interface TextInputProps {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export function TextInput({ label, value, placeholder, onChange }: TextInputProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <label className="text-2xl text-gray-400 font-medium">{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-900 text-white text-3xl px-6 py-5 rounded-2xl border border-gray-700 focus:border-blue-500 focus:outline-none"
      />
    </div>
  )
}
