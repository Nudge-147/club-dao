# ClubDAO

[中文文档](README.zh-CN.md)

ClubDAO is a club activity and chat platform built with React + TypeScript + Vite.
It supports activity publishing, joining, room-based chat, profile cards, notifications, and a lightweight admin panel.

## Features

- Username + password login/register flow
- Activity square with search and category filtering
- Create/join/quit/cancel/complete activities
- Room view with visual seats and member profile preview
- In-room chat and global square chat
- Notification center and message jump
- QR poster generation for activity sharing
- Basic admin operations for activity management

## Tech Stack

- React 19
- TypeScript
- Vite 7
- Tailwind CSS
- laf-client-sdk (cloud function calls)

## Project Structure

```text
src/
  App.tsx                  # Main app logic and UI
  main.tsx                 # App bootstrap
  index.css                # Global styles and animations
  components/
    AnnouncementModal.tsx
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run dev server

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Backend Dependency

The frontend invokes cloud functions through `laf-client-sdk` in `src/App.tsx`.
Current `baseUrl` is configured directly in code:

- `src/App.tsx`

If you deploy your own backend, update that URL and related cloud function contracts.

## Scripts

- `npm run dev` start local development
- `npm run build` type-check + production build
- `npm run lint` run ESLint
- `npm run preview` preview built assets

## Known Limitations

- Core business logic is still highly centralized in `src/App.tsx` (large file).
- API contracts are currently inferred from runtime responses; stronger shared typing between frontend and backend is still pending.
- The cloud `baseUrl` is still hardcoded in `src/App.tsx` and should be moved to env-driven config in a later refactor.

## Notes

- This repository currently focuses on product iteration speed.
- `src/App.tsx` is intentionally centralized and can be modularized later.
