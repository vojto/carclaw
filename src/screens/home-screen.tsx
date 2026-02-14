import { Mic } from 'lucide-react'
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/store-context'
import { Title } from '../components/title'

export const HomeScreen = observer(function HomeScreen() {
  const store = useStore()

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Title>Carclaw</Title>
      {store.recordingVisible && (
        <button className="fixed bottom-8 left-8 w-32 h-32 bg-red-500 active:bg-red-700 text-white rounded-full shadow-sm flex items-center justify-center cursor-pointer">
          <Mic size={56} />
        </button>
      )}
    </div>
  )
})
