import { observer } from 'mobx-react-lite'
import { useViewModel } from '../view-models/view-model-context'

export const WelcomeScreen = observer(function WelcomeScreen() {
  const vm = useViewModel()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-12 gap-12">
      <h1 className="text-6xl font-bold text-white">Carclaw</h1>
      <p className="text-3xl text-gray-300 text-center max-w-3xl leading-relaxed">
        This app is designed to be used with a vehicle display. By continuing, you acknowledge that you are solely responsible for safe operation of your vehicle at all times. Do not interact with this app while driving.
      </p>
      <button
        onClick={() => vm.acceptDisclaimer()}
        className="mt-4 px-16 py-6 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-4xl font-semibold rounded-2xl cursor-pointer"
      >
        I Understand
      </button>
    </div>
  )
})
