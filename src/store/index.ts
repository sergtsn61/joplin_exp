import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  JoplinNote,
  JoplinNotebook,
  JoplinTag,
  AIConfig,
  AIMessage,
  ChatMessage,
  JoplinConfig,
  SortConfig,
  FilterConfig,
  ViewMode,
  AppSettings,
} from '../types';
import { joplinService } from '../services/joplin';
import { aiService } from '../services/ai';

interface AppState {
  // Connection
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // Data
  notes: JoplinNote[];
  notebooks: JoplinNotebook[];
  tags: JoplinTag[];
  selectedNote: JoplinNote | null;
  isLoadingNotes: boolean;
  isSaving: boolean;

  // UI state
  viewMode: ViewMode;
  sidebarOpen: boolean;
  aiPanelOpen: boolean;
  sort: SortConfig;
  filter: FilterConfig;

  // AI
  chatMessages: ChatMessage[];
  isAIThinking: boolean;
  aiError: string | null;

  // Settings
  settings: AppSettings;

  // Actions - Connection
  connect: (config: JoplinConfig) => Promise<void>;
  disconnect: () => void;

  // Actions - Notes
  loadNotes: () => Promise<void>;
  loadNotebooks: () => Promise<void>;
  loadTags: () => Promise<void>;
  selectNote: (note: JoplinNote | null) => void;
  openNote: (noteId: string) => Promise<void>;
  createNote: (title?: string, notebookId?: string) => Promise<void>;
  updateNote: (id: string, changes: Partial<JoplinNote>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  saveCurrentNote: (body: string) => Promise<void>;
  moveNoteToNotebook: (noteId: string, notebookId: string) => Promise<void>;
  bulkAddTag: (noteIds: string[], tagId: string) => Promise<void>;

  // Actions - UI
  setViewMode: (mode: ViewMode) => void;
  toggleSidebar: () => void;
  toggleAIPanel: () => void;
  setSort: (sort: SortConfig) => void;
  setFilter: (filter: Partial<FilterConfig>) => void;

  // Actions - AI
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  runAIAction: (action: 'summarize' | 'improve' | 'tags' | 'translate', lang?: string) => Promise<void>;

  // Actions - Settings
  updateSettings: (settings: Partial<AppSettings>) => void;
  updateAIConfig: (config: Partial<AIConfig>) => void;

  // Computed
  getFilteredNotes: () => JoplinNote[];
}

const defaultSettings: AppSettings = {
  joplin: {
    host: 'localhost',
    port: 41184,
    token: '',
  },
  ai: {
    provider: 'ollama',
    model: 'llama3.2',
    ollamaHost: 'http://localhost:11434',
    temperature: 0.7,
    maxTokens: 2048,
  },
  editor: {
    theme: 'dark',
    fontSize: 14,
    wordWrap: true,
    spellCheck: false,
  },
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      notes: [],
      notebooks: [],
      tags: [],
      selectedNote: null,
      isLoadingNotes: false,
      isSaving: false,
      viewMode: 'split',
      sidebarOpen: true,
      aiPanelOpen: false,
      sort: { field: 'updated_time', order: 'desc' },
      filter: { search: '', notebookId: null, tagIds: [], showTodos: null },
      chatMessages: [],
      isAIThinking: false,
      aiError: null,
      settings: defaultSettings,

      // Connection
      connect: async (config) => {
        set({ isConnecting: true, connectionError: null });
        try {
          joplinService.connect(config);
          const ok = await joplinService.ping();
          if (!ok) throw new Error('Cannot reach Joplin. Make sure it is running and the Web Clipper is enabled.');
          set({ isConnected: true, isConnecting: false });
          // Load data
          await Promise.all([get().loadNotes(), get().loadNotebooks(), get().loadTags()]);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Connection failed';
          set({ isConnecting: false, connectionError: msg, isConnected: false });
        }
      },

      disconnect: () => {
        set({
          isConnected: false,
          notes: [],
          notebooks: [],
          tags: [],
          selectedNote: null,
          chatMessages: [],
        });
      },

      // Notes
      loadNotes: async () => {
        set({ isLoadingNotes: true });
        try {
          const filter = get().filter;
          let notes: JoplinNote[];

          if (filter.notebookId) {
            notes = await joplinService.getNotesByNotebook(filter.notebookId);
          } else if (filter.tagIds.length > 0) {
            const tagNoteArrays = await Promise.all(
              filter.tagIds.map(tagId => joplinService.getNotesByTag(tagId))
            );
            // AND semantics: note must have ALL selected tags
            const countMap = new Map<string, { note: JoplinNote; count: number }>();
            for (const tagNotes of tagNoteArrays) {
              for (const note of tagNotes) {
                const entry = countMap.get(note.id);
                if (entry) entry.count++;
                else countMap.set(note.id, { note, count: 1 });
              }
            }
            notes = Array.from(countMap.values())
              .filter(e => e.count === filter.tagIds.length)
              .map(e => e.note);
          } else if (filter.search) {
            notes = await joplinService.searchNotes(filter.search);
          } else {
            notes = await joplinService.getAllNotes();
          }

          set({ notes, isLoadingNotes: false });
        } catch {
          set({ isLoadingNotes: false });
        }
      },

      loadNotebooks: async () => {
        try {
          const notebooks = await joplinService.getNotebooks();
          set({ notebooks });
        } catch {
          // ignore
        }
      },

      loadTags: async () => {
        try {
          const tags = await joplinService.getTags();
          set({ tags });
        } catch {
          // ignore
        }
      },

      selectNote: (note) => set({ selectedNote: note }),

      openNote: async (noteId) => {
        try {
          const note = await joplinService.getNote(noteId);
          set({ selectedNote: note });
        } catch {
          // ignore
        }
      },

      createNote: async (title = 'New Note', notebookId) => {
        try {
          const { filter } = get();
          const note = await joplinService.createNote({
            title,
            body: '',
            parent_id: notebookId || filter.notebookId || '',
          });
          set(state => ({ notes: [note, ...state.notes], selectedNote: note }));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Failed to create note';
          set({ connectionError: msg });
        }
      },

      updateNote: async (id, changes) => {
        try {
          await joplinService.updateNote(id, changes);
          set(state => ({
            notes: state.notes.map(n => n.id === id ? { ...n, ...changes } : n),
            selectedNote: state.selectedNote?.id === id
              ? { ...state.selectedNote, ...changes }
              : state.selectedNote,
          }));
        } catch {
          // ignore
        }
      },

      deleteNote: async (id) => {
        try {
          await joplinService.deleteNote(id);
          set(state => ({
            notes: state.notes.filter(n => n.id !== id),
            selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
          }));
        } catch {
          // ignore
        }
      },

      saveCurrentNote: async (body) => {
        const { selectedNote } = get();
        if (!selectedNote) return;
        set({ isSaving: true });
        try {
          await joplinService.updateNote(selectedNote.id, { body });
          set(state => ({
            selectedNote: state.selectedNote ? { ...state.selectedNote, body } : null,
            notes: state.notes.map(n =>
              n.id === selectedNote.id ? { ...n, body, updated_time: Date.now() } : n
            ),
            isSaving: false,
          }));
        } catch {
          set({ isSaving: false });
        }
      },

      moveNoteToNotebook: async (noteId, notebookId) => {
        try {
          await joplinService.updateNote(noteId, { parent_id: notebookId });
          set(state => ({
            notes: state.notes.map(n => n.id === noteId ? { ...n, parent_id: notebookId } : n),
          }));
        } catch { /* ignore */ }
      },

      bulkAddTag: async (noteIds, tagId) => {
        try {
          await Promise.all(noteIds.map(id => joplinService.addTagToNote(id, tagId)));
        } catch { /* ignore */ }
      },

      // UI
      setViewMode: (viewMode) => set({ viewMode }),
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      toggleAIPanel: () => set(state => ({ aiPanelOpen: !state.aiPanelOpen })),
      setSort: (sort) => set({ sort }),
      setFilter: (filter) => {
        set(state => ({ filter: { ...state.filter, ...filter } }));
        get().loadNotes();
      },

      // AI
      sendMessage: async (content) => {
        const { selectedNote, settings } = get();
        const userMsg: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          content,
          timestamp: Date.now(),
        };

        set(state => ({
          chatMessages: [...state.chatMessages, userMsg],
          isAIThinking: true,
          aiError: null,
        }));

        const messages: AIMessage[] = [
          {
            role: 'system',
            content: selectedNote
              ? `You are a helpful assistant. The user is working on a note titled "${selectedNote.title}". Help them with their note-taking tasks.`
              : 'You are a helpful assistant for note-taking and knowledge management.',
          },
          ...get().chatMessages.slice(-10).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content },
        ];

        if (selectedNote) {
          messages[0].content += `\n\nCurrent note content:\n${selectedNote.body.substring(0, 2000)}`;
        }

        const assistantMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
        };

        set(state => ({ chatMessages: [...state.chatMessages, assistantMsg] }));

        try {
          await aiService.chat(messages, settings.ai, (chunk) => {
            set(state => ({
              chatMessages: state.chatMessages.map(m =>
                m.id === assistantMsg.id ? { ...m, content: m.content + chunk } : m
              ),
            }));
          });
          set({ isAIThinking: false });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'AI error';
          set({
            isAIThinking: false,
            aiError: msg,
            chatMessages: get().chatMessages.map(m =>
              m.id === assistantMsg.id ? { ...m, content: `Error: ${msg}` } : m
            ),
          });
        }
      },

      clearChat: () => set({ chatMessages: [], aiError: null }),

      runAIAction: async (action, lang) => {
        const { selectedNote, settings } = get();
        if (!selectedNote) return;

        set({ isAIThinking: true, aiError: null });
        try {
          let result = '';
          switch (action) {
            case 'summarize':
              result = await aiService.summarizeNote(selectedNote.body, settings.ai);
              break;
            case 'improve':
              result = await aiService.improveNote(selectedNote.body, settings.ai);
              break;
            case 'tags': {
              const tags = await aiService.generateTags(selectedNote.title, selectedNote.body, settings.ai);
              result = `Suggested tags: ${tags.join(', ')}`;
              break;
            }
            case 'translate':
              result = await aiService.translateNote(selectedNote.body, lang || 'English', settings.ai);
              break;
          }

          const aiMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: result,
            timestamp: Date.now(),
          };
          set(state => ({
            chatMessages: [...state.chatMessages, aiMsg],
            isAIThinking: false,
            aiPanelOpen: true,
          }));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'AI error';
          set({ isAIThinking: false, aiError: msg });
        }
      },

      // Settings
      updateSettings: (newSettings) => {
        set(state => ({ settings: { ...state.settings, ...newSettings } }));
      },

      updateAIConfig: (config) => {
        set(state => ({
          settings: {
            ...state.settings,
            ai: { ...state.settings.ai, ...config },
          },
        }));
      },

      // Computed
      getFilteredNotes: () => {
        const { notes, sort, filter } = get();
        let filtered = [...notes];

        if (filter.search) {
          const q = filter.search.toLowerCase();
          filtered = filtered.filter(n =>
            (n.title ?? '').toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q)
          );
        }

        if (filter.showTodos !== null) {
          filtered = filtered.filter(n =>
            filter.showTodos ? n.is_todo === 1 : n.is_todo !== 1
          );
        }

        filtered.sort((a, b) => {
          let va: string | number = a[sort.field] || '';
          let vb: string | number = b[sort.field] || '';

          if (typeof va === 'string') va = va.toLowerCase();
          if (typeof vb === 'string') vb = vb.toLowerCase();

          if (va < vb) return sort.order === 'asc' ? -1 : 1;
          if (va > vb) return sort.order === 'asc' ? 1 : -1;
          return 0;
        });

        return filtered;
      },
    }),
    {
      name: 'joplin-ai-store',
      partialize: (state) => ({
        settings: state.settings,
        viewMode: state.viewMode,
        sort: state.sort,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
