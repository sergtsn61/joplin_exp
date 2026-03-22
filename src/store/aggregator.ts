import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  JoplinInstance,
  AggregatedNote,
  NoteTopicMap,
  AppSettings,
} from '../types';
import { aggregatorService } from '../services/aggregator';

const defaultAISettings: AppSettings['ai'] = {
  provider: 'ollama',
  model: 'llama3.2',
  ollamaHost: 'http://localhost:11434',
  temperature: 0.7,
  maxTokens: 2048,
};

interface AggregatorState {
  instances: JoplinInstance[];
  aggregatedNotes: AggregatedNote[];
  isAggregating: boolean;
  topicMaps: NoteTopicMap[];
  settings: { ai: AppSettings['ai'] };

  // Instance management
  addInstance: (instance: JoplinInstance) => void;
  removeInstance: (id: string) => void;
  connectInstance: (id: string) => Promise<void>;
  disconnectInstance: (id: string) => void;
  updateInstanceConfig: (id: string, updates: Partial<JoplinInstance>) => void;

  // Aggregation
  aggregate: () => Promise<void>;
  clearAggregated: () => void;

  // Topic maps (written by TopicClassifier)
  setTopicMaps: (maps: NoteTopicMap[]) => void;

  // Delete a note from aggregated list (and optionally from Joplin)
  deleteNoteFromAggregated: (instanceId: string, noteId: string) => void;

  // Settings passthrough
  updateAISettings: (ai: Partial<AppSettings['ai']>) => void;
}

export const useAggregatorStore = create<AggregatorState>()(
  persist(
    (set, get) => ({
      instances: [],
      aggregatedNotes: [],
      isAggregating: false,
      topicMaps: [],
      settings: { ai: defaultAISettings },

      addInstance: (instance) => {
        set(state => ({ instances: [...state.instances, instance] }));
      },

      removeInstance: (id) => {
        set(state => ({ instances: state.instances.filter(i => i.id !== id) }));
      },

      connectInstance: async (id) => {
        const inst = get().instances.find(i => i.id === id);
        if (!inst) return;

        set(state => ({
          instances: state.instances.map(i =>
            i.id === id ? { ...i, isConnecting: true, error: null } : i
          ),
        }));

        aggregatorService.connect(inst);
        const ok = await aggregatorService.pingInstance(id);

        set(state => ({
          instances: state.instances.map(i =>
            i.id === id
              ? { ...i, isConnecting: false, isConnected: ok, error: ok ? null : 'Cannot connect to Joplin' }
              : i
          ),
        }));
      },

      disconnectInstance: (id) => {
        aggregatorService.disconnect(id);
        set(state => ({
          instances: state.instances.map(i =>
            i.id === id ? { ...i, isConnected: false } : i
          ),
        }));
      },

      updateInstanceConfig: (id, updates) => {
        set(state => ({
          instances: state.instances.map(i => i.id === id ? { ...i, ...updates } : i),
        }));
      },

      aggregate: async () => {
        const { instances } = get();
        set({ isAggregating: true });
        try {
          const notes = await aggregatorService.aggregateAllNotes(instances);
          set({ aggregatedNotes: notes, isAggregating: false });
        } catch {
          set({ isAggregating: false });
        }
      },

      clearAggregated: () => set({ aggregatedNotes: [], topicMaps: [] }),

      setTopicMaps: (maps) => set({ topicMaps: maps }),

      deleteNoteFromAggregated: (instanceId, noteId) => {
        // Remove from local aggregated list; fire-and-forget delete from Joplin
        aggregatorService.deleteNoteFromInstance(instanceId, noteId).catch(() => {});
        set(state => ({
          aggregatedNotes: state.aggregatedNotes.filter(
            n => !(n.id === noteId && n.instanceId === instanceId)
          ),
        }));
      },

      updateAISettings: (ai) => {
        set(state => ({ settings: { ...state.settings, ai: { ...state.settings.ai, ...ai } } }));
      },
    }),
    {
      name: 'joplin-aggregator-store',
      partialize: (state) => ({
        instances: state.instances.map(i => ({ ...i, isConnected: false, isConnecting: false })),
        settings: state.settings,
        topicMaps: state.topicMaps,
      }),
    }
  )
);
