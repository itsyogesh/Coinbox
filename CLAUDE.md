# Claude Code Project Guide

This document provides context for Claude when working on the Coinbox project.

---

## Project Overview

**Coinbox** is a local-first, multi-chain cryptocurrency portfolio tracker with AI-powered transaction categorization and tax reporting.

**Tech Stack:**
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri 2.0 (Rust)
- **Database**: SQLite with SQLCipher encryption
- **Styling**: Tailwind CSS + shadcn/ui + Framer Motion
- **State**: Zustand + TanStack Query
- **Ethereum**: Viem (not Wagmi)
- **Bitcoin**: BDK (Bitcoin Dev Kit)

---

## Key Documents

### README.md - Live Product Document

**IMPORTANT**: The `README.md` file serves as our **live product document**. It contains:

- Current development status
- Sprint progress and task tracking
- Feature roadmap
- Technical decisions

**When making progress on features:**
1. Update the relevant section in README.md
2. Mark tasks as complete (✅) or in progress (⏳)
3. Add any new tasks discovered during implementation

### MODERNIZATION_PLAN.md - Technical Reference

Contains detailed technical specifications:
- Architecture diagrams
- Database schema
- API designs
- Code examples

### .claude/skills/ - Design Guidelines

- **frontend-design/SKILL.md**: General UI design principles
- **coinbox-brand/SKILL.md**: Coinbox-specific brand system (colors, typography, animations)

Always reference the brand skill when creating UI components.

---

## Code Conventions

### TypeScript

```typescript
// Use explicit types, avoid 'any'
interface WalletData {
  id: string;
  name: string;
  chain: 'bitcoin' | 'ethereum';
  address: string;
  isWatchOnly: boolean;
}

// Use functional components with explicit props
interface Props {
  wallet: WalletData;
  onSelect: (id: string) => void;
}

export function WalletCard({ wallet, onSelect }: Props) {
  // ...
}
```

### Rust

```rust
// Use Result types for error handling
pub async fn get_wallet(id: &str) -> Result<Wallet, Error> {
    // ...
}

// Use descriptive error types
#[derive(Error, Debug)]
pub enum WalletError {
    #[error("Wallet not found: {0}")]
    NotFound(String),
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
}
```

### CSS/Tailwind

```tsx
// Use Tailwind utilities, avoid custom CSS
<div className="flex items-center gap-4 p-6 rounded-lg bg-card border">

// Use design tokens from brand system
<button className="bg-primary text-primary-foreground hover:bg-primary/90">

// Use semantic colors for data
<span className="text-success">+$1,234.56</span>  // Gains
<span className="text-destructive">-$567.89</span> // Losses
```

### Animations (Framer Motion)

```tsx
// Import from our animation utilities
import { pageTransition, cardHover, staggerContainer, staggerItem } from "@/lib/animations";

// Page transitions
<motion.div {...pageTransition}>

// Interactive cards
<motion.div {...cardHover}>

// Staggered lists
<motion.div variants={staggerContainer} initial="initial" animate="animate">
  {items.map(item => (
    <motion.div key={item.id} variants={staggerItem}>
```

---

## Directory Structure

```
desktop/
├── src/
│   ├── components/
│   │   ├── layout/        # AppLayout, navigation
│   │   └── ui/            # Reusable UI components (Button, Card, etc.)
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities
│   │   ├── animations.ts  # Framer Motion presets
│   │   └── utils.ts       # cn() and other utilities
│   ├── pages/             # Page components (DashboardPage, etc.)
│   └── stores/            # Zustand stores (future)
├── src-tauri/
│   └── src/
│       ├── commands/      # Tauri IPC commands
│       ├── db/            # Database (mod.rs, schema.rs)
│       ├── error.rs       # Error types
│       ├── lib.rs         # Library root
│       └── main.rs        # Entry point
```

---

## Common Tasks

### Adding a New Page

1. Create page component in `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`
3. Add navigation item in `src/components/layout/AppLayout.tsx`
4. Use `pageTransition` for smooth entry animation

### Adding a New UI Component

1. Create in `src/components/ui/`
2. Follow shadcn/ui patterns
3. Add Framer Motion for interactions
4. Export from component file

### Adding a Tauri Command

1. Define command in `src-tauri/src/commands/mod.rs`
2. Register in `src-tauri/src/lib.rs` (invoke_handler)
3. Create TypeScript wrapper in `src/lib/tauri/`

### Updating Database Schema

1. Modify `src-tauri/src/db/schema.rs`
2. Add migration in `run_migrations()` function
3. Increment schema version
4. Update types in `src-tauri/src/commands/mod.rs`

---

## Brand Guidelines Quick Reference

### Colors

| Token | Light | Dark |
|-------|-------|------|
| `--primary` | Indigo-500 (#6366F1) | Indigo-400 (#818CF8) |
| `--accent` | Teal-400 (#2DD4BF) | Teal-500 (#14B8A6) |
| `--success` | Green-500 (#22C55E) | Green-400 (#4ADE80) |
| `--destructive` | Red-500 (#EF4444) | Red-400 (#F87171) |
| `--warning` | Amber-500 (#F59E0B) | Amber-400 (#FBBF24) |

### Typography

- **Font Family**: Geist, Plus Jakarta Sans (fallback)
- **Monospace**: Geist Mono, JetBrains Mono (fallback)
- **Financial Numbers**: Always use `tabular-nums font-mono`

### Shadows

- `shadow-soft`: Subtle lift
- `shadow-card`: Default card
- `shadow-card-hover`: Hover state
- `shadow-elevated`: Modals, dropdowns

---

## Testing Commands

```bash
# TypeScript type check
npm run typecheck

# Rust check (without building)
cd src-tauri && cargo check

# Run dev server
npm run tauri:dev

# Build production
npm run tauri:build
```

---

## Current Sprint Focus

Check `README.md > Current Status` for the active sprint and its tasks.

When completing tasks:
1. Implement the feature
2. Run typecheck and ensure no errors
3. Update README.md task status
4. Commit with descriptive message

---

## Commit Message Format

```
<type>: <short description>

[optional body with details]

Types:
- feat: New feature
- fix: Bug fix
- refactor: Code refactoring
- style: UI/styling changes
- docs: Documentation
- chore: Build/config changes
```

Example:
```
feat: Add wallet creation flow

- Implement HD wallet generation with BIP39
- Add mnemonic backup screen
- Store encrypted seed in SQLite
```

---

*This document should be updated as the project evolves.*
