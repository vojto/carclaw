import { Mic } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useViewModel } from '../view-models/view-model-context'

export const HomeScreen = observer(function HomeScreen() {
  const vm = useViewModel()

  return (
    <div className="flex items-center justify-center min-h-screen">
      <h1 className="text-6xl font-bold text-white">Carclaw</h1>
      {vm.recording.isVisible && (
        <button className="fixed bottom-8 left-8 w-32 h-32 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-sm flex items-center justify-center cursor-pointer">
          <Mic size={56} />
        </button>
      )}
    </div>
  )
})
