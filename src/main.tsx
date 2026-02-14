import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app.tsx'
import { RootViewModel } from './view-models/root-view-model'
import { ViewModelContext } from './view-models/view-model-context'

const viewModel = new RootViewModel()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ViewModelContext.Provider value={viewModel}>
      <App />
    </ViewModelContext.Provider>
  </StrictMode>,
)
