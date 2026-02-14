# Carclaw

> **Keep this file up to date.** Whenever you learn something useful about this project — conventions, patterns, gotchas — update CLAUDE.md so future sessions benefit. Notes should capture **general principles**, not specific implementation details. Good: "Keep small enums co-located with the store that uses them." Bad: "The Screen enum lives in root-store.ts."

Voice-powered client for OpenClaw, built with Vite + React + TypeScript.

## UI Design

- **Target device: Tesla car screen.** All UI must be large, bold, and easy to tap — think CarPlay / automotive style.
- Use oversized text (`text-3xl` minimum for body, `text-6xl` for headings), large buttons (`py-6 px-16`, `text-4xl`), and generous spacing (`gap-12`, `p-12`).
- Dark background (`#000`), white text. Keep it high-contrast and glanceable.
- Rounded corners on interactive elements (`rounded-2xl` for buttons).
- No tiny controls, no dense layouts. Every tap target should be easy to hit without looking.
- **No hover states** — this is a touchscreen. Only use `active:` for press feedback.

## Navigation

- Keep small enums co-located with the store that uses them.
- The current screen is tracked by `RootStore.screen`.
- `app.tsx` switches on the screen value to render the correct screen component.
- Screen components live in `src/screens/`.

## Naming Conventions

- **All filenames use dash-case** (e.g. `root-store.ts`, `claw-client.ts`, `welcome-screen.tsx`). No PascalCase or camelCase filenames.

## Tech Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** v4 (via `@tailwindcss/vite` plugin)
- **mobx-keystone** for state management, **mobx-react-lite** for React bindings
- **Lucide React** for icons
- **pnpm** as package manager, **mise** for Node.js version management

## State Management

- **Component-local state**: Use `useState` for state that only lives in a single component.
- **Shared state**: Use mobx-keystone stores. Never use `useState` for state shared between components.

### mobx-keystone Store Architecture

- There is a single `RootStore` created at app startup, registered as the root store, and provided via React context (`StoreContext`).
- Access the store in components with `useStore()` from `src/stores/store-context.ts`.
- The entire root store is auto-persisted to `localStorage` via `onSnapshot`. On startup, the store is restored from `localStorage` with `fromSnapshot`.
- Feel free to split into sub-stores as the app grows. Keep everything in `RootStore` until it gets unwieldy.

### mobx-keystone Conventions

- Use `@model('carclaw/ModelName')` decorator on store classes.
- Extend `Model({...})` with `prop<T>()` / `prop(default)` for observable, snapshotable properties.
- Use `@modelAction` for methods that mutate store state.
- Non-serializable state (like WebSocket clients) should be plain class properties, not `prop`.
- Wrap **every** React component that reads store state with the `observer()` HOC from `mobx-react-lite`.

```tsx
import { observer } from 'mobx-react-lite'
import { useStore } from '../stores/store-context'

const MyComponent = observer(function MyComponent() {
  const store = useStore()
  return <div>{store.someValue}</div>
})
```

## Project Structure

```
src/
  lib/
    claw-client.ts           # WebSocket client for OpenClaw
  stores/
    root-store.ts            # Root mobx-keystone store
    store-context.ts         # React context + useStore hook
  screens/
    welcome-screen.tsx       # Disclaimer / acceptance screen
    setup-screen.tsx         # Gateway connection setup
    home-screen.tsx          # Main screen with mic button
  components/
    big-button.tsx           # Large tap-friendly button
    text-input.tsx           # Large text input field
    title.tsx                # Heading component
    text.tsx                 # Body text component
  app.tsx                    # Screen router
  main.tsx                   # Entry point, store setup + persistence
```

- `src/lib/` — service classes, clients, utilities
- `src/stores/` — mobx-keystone stores
- `src/screens/` — top-level screen components
- `src/components/` — reusable UI components
