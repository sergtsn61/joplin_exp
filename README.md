# Joplin AI Manager

A desktop application built with **React + TypeScript + Tailwind CSS + Vite + Tauri** for managing, editing, and AI-enhancing your Joplin notes.

## Features

- **Joplin Integration** — Connect via the Joplin Web Clipper API to browse, create, edit, and delete notes and notebooks
- **Notebook & Tag Browser** — Hierarchical sidebar with notebooks, tags, and search
- **CodeMirror Editor** — Full-featured Markdown editor with syntax highlighting, line numbers, and autosave
- **Split View** — Edit and preview Markdown simultaneously
- **AI Assistant** — Chat with AI about your notes with full context
- **AI Quick Actions**:
  - Summarize note
  - Improve writing
  - Suggest tags
  - Translate to any language
- **Multiple AI Providers**:
  - **Ollama** (local, privacy-first)
  - **Anthropic Claude** (claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5)
  - **OpenAI** (GPT-4o, GPT-4o Mini, GPT-3.5)
  - **OpenRouter** (access to many models)
- **Export**:
  - Export to `.md` (Markdown with frontmatter metadata)
  - Export to `.html`
  - Print / Save as PDF
- **Note Sorting** — Sort by title, last updated, or created date
- **Persistent Settings** — All settings saved locally

## Setup

### Prerequisites

1. **Joplin** with Web Clipper enabled:
   - Open Joplin -> Tools -> Options -> Web Clipper
   - Enable the Web Clipper service
   - Copy the authorization token

2. **For AI** (choose one):
   - **Ollama**: Install from ollama.ai and pull a model: `ollama pull llama3.2`
   - **API key** for OpenAI, Anthropic, or OpenRouter

### Development

```bash
npm install
npm run dev          # Start Vite dev server
npm run tauri:dev    # Start Tauri desktop app (dev)
```

### Build

```bash
npm run build        # Build web app
npm run tauri:build  # Build desktop app
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Styling | Tailwind CSS v4 + Typography plugin |
| Build | Vite 8 |
| Desktop | Tauri 2 |
| Editor | CodeMirror 6 |
| State | Zustand (with persistence) |
| Markdown | react-markdown + remark-gfm |
| HTTP | Axios |
| Icons | Lucide React |

## Architecture

```
src/
├── components/
│   ├── ConnectionSetup.tsx   # Initial Joplin connection screen
│   ├── Sidebar.tsx           # Notebook/tag tree + search
│   ├── NoteList.tsx          # Sorted/filtered note list
│   ├── NoteEditor.tsx        # CodeMirror editor + preview
│   ├── AIPanel.tsx           # AI chat panel
│   ├── AIQuickActions.tsx    # Quick AI action dropdown
│   └── SettingsModal.tsx     # Settings (Joplin + AI + Editor)
├── services/
│   ├── joplin.ts             # Joplin REST API client
│   ├── ai.ts                 # AI providers (OpenAI/Anthropic/Ollama/OpenRouter)
│   └── export.ts             # Export to .md / .html / PDF
├── store/
│   └── index.ts              # Zustand global state
└── types/
    └── index.ts              # TypeScript types
```
