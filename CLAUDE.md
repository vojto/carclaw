# Carclaw

> **Keep this file up to date.** Whenever you learn something useful about this project — conventions, patterns, gotchas — update CLAUDE.md so future sessions benefit.

Voice-powered client for OpenClaw, built with Vite + React + TypeScript.

## UI Design

- **Target device: Tesla car screen.** All UI must be large, bold, and easy to tap — think CarPlay / automotive style.
- Use oversized text (`text-3xl` minimum for body, `text-6xl` for headings), large buttons (`py-6 px-16`, `text-4xl`), and generous spacing (`gap-12`, `p-12`).
- Dark background (`#000`), white text. Keep it high-contrast and glanceable.
- Rounded corners on interactive elements (`rounded-2xl` for buttons).
- No tiny controls, no dense layouts. Every tap target should be easy to hit without looking.

## Navigation

- Screen navigation uses the `Screen` enum in `src/view-models/screen.ts`.
- The current screen is tracked by `RootViewModel.screen`.
- `app.tsx` switches on the screen value to render the correct screen component.
- Screen components live in `src/screens/`.

## Naming Conventions

- **All filenames use dash-case** (e.g. `root-view-model.ts`, `claw-client.ts`, `welcome-screen.tsx`). No PascalCase or camelCase filenames.

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** v4 (via `@tailwindcss/vite` plugin)
- **MobX** for shared state, **mobx-react-lite** for React bindings
- **Lucide React** for icons
- **pnpm** as package manager, **mise** for Node.js version management

## State Management

- **Component-local state**: Use `useState` for state that only lives in a single component.
- **Shared state**: Use MobX view models. Never use `useState` for state shared between components.

### MobX View Model Architecture

- There is a single `RootViewModel` created at the app root and provided via React context (`ViewModelContext`).
- `RootViewModel` holds sub-models for different concerns (e.g. `RecordingViewModel`).
- Access the root view model in components with `useViewModel()` from `src/view-models/view-model-context.ts`.
- Feel free to refactor the view model hierarchy as the app grows — split, merge, or reorganize sub-models to keep things clean.

### MobX Conventions

- Use **TypeScript decorators** (`@observable`, `@action`, `@computed`) for marking class members.
- Always call `makeObservable(this)` in the constructor.
- Wrap **every** React component that reads observable state with the `observer()` HOC from `mobx-react-lite`.

```tsx
import { observer } from 'mobx-react-lite'
import { useViewModel } from '../view-models/view-model-context'

const MyComponent = observer(function MyComponent() {
  const vm = useViewModel()
  return <div>{vm.someModel.someValue}</div>
})
```

## Project Structure

```
src/
  lib/
    claw-client.ts           # WebSocket client for OpenClaw
  view-models/
    root-view-model.ts       # Root MobX view model
    recording-view-model.ts  # Recording state
    view-model-context.ts    # React context + useViewModel hook
    screen.ts                # Screen enum
  screens/
    welcome-screen.tsx       # Disclaimer / acceptance screen
    home-screen.tsx          # Main screen with mic button
  app.tsx                    # Screen router
  main.tsx                   # Entry point, sets up providers
```

- `src/lib/` — service classes, clients, utilities
- `src/view-models/` — MobX view models and enums for shared state
- `src/screens/` — top-level screen components
