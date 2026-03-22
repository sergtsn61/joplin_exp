import { useState, useRef, useCallback } from 'react';
import {
  X, Bot, Play, Check, SkipForward, Save, Loader2,
  ChevronRight, CheckCheck, RotateCcw,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store';
import { aiService } from '../services/ai';
import { joplinService } from '../services/joplin';
import type { JoplinNote } from '../types';

type NoteStatus = 'pending' | 'processing' | 'done' | 'approved' | 'skipped' | 'saved';

interface NoteAgentState {
  note: JoplinNote;
  newBody: string;
  status: NoteStatus;
}

const PRESET_INSTRUCTIONS = [
  'Fix grammar and improve writing quality',
  'Translate to English',
  'Translate to Russian',
  'Add a TL;DR summary at the top',
  'Convert to bullet points',
  'Expand with more details and examples',
  'Make it shorter and more concise',
  'Add code examples where relevant',
];

interface Props {
  onClose: () => void;
}

export function NotebookAgentModal({ onClose }: Props) {
  const { getFilteredNotes, settings } = useStore();
  const allNotes = getFilteredNotes();

  const [instruction, setInstruction] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(allNotes.map(n => n.id))
  );
  const [noteStates, setNoteStates] = useState<NoteAgentState[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('after');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const abortRef = useRef(false);

  const started = noteStates.length > 0;
  const current = noteStates[currentIdx] ?? null;
  const processedNotes = noteStates.filter(ns => ns.status !== 'pending' && ns.status !== 'processing');
  const approved = noteStates.filter(ns => ns.status === 'approved');
  const savedCount = noteStates.filter(ns => ns.status === 'saved').length;

  const updateNote = useCallback((id: string, patch: Partial<NoteAgentState>) => {
    setNoteStates(prev => prev.map(ns => ns.note.id === id ? { ...ns, ...patch } : ns));
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(allNotes.map(n => n.id)));
  const selectNone = () => setSelectedIds(new Set());

  const runAgent = async () => {
    if (!instruction.trim()) return;
    abortRef.current = false;

    const toProcess = allNotes.filter(n => selectedIds.has(n.id));
    const initial: NoteAgentState[] = toProcess.map(note => ({
      note,
      newBody: '',
      status: 'pending',
    }));
    setNoteStates(initial);
    setCurrentIdx(0);
    setRunning(true);

    for (let i = 0; i < initial.length; i++) {
      if (abortRef.current) break;
      const { note } = initial[i];

      setCurrentIdx(i);
      setNoteStates(prev => prev.map((ns, idx) =>
        idx === i ? { ...ns, status: 'processing', newBody: '' } : ns
      ));
      setActiveTab('after');

      const messages = [
        {
          role: 'system' as const,
          content: `You are a note editor. The user will give you a note in Markdown and an instruction. Apply the instruction and return ONLY the updated Markdown content — no explanations, no preamble, no code fences.`,
        },
        {
          role: 'user' as const,
          content: `Instruction: ${instruction.trim()}\n\n---\n\n${note.body ?? ''}`,
        },
      ];

      try {
        let accumulated = '';
        await aiService.chat(messages, settings.ai, (chunk) => {
          accumulated += chunk;
          setNoteStates(prev => prev.map((ns, idx) =>
            idx === i ? { ...ns, newBody: accumulated } : ns
          ));
        });

        setNoteStates(prev => prev.map((ns, idx) =>
          idx === i ? { ...ns, status: 'done' } : ns
        ));
      } catch (err) {
        setNoteStates(prev => prev.map((ns, idx) =>
          idx === i ? { ...ns, status: 'skipped', newBody: `Error: ${(err as Error).message}` } : ns
        ));
      }

      // Pause before next note to let user review
      // (user can click Approve/Skip to advance, or we wait briefly)
      if (!abortRef.current) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    setRunning(false);
  };

  const stopAgent = () => {
    abortRef.current = true;
    setRunning(false);
  };

  const approveNote = (id: string) => {
    updateNote(id, { status: 'approved' });
    advanceCurrent();
  };

  const skipNote = (id: string) => {
    updateNote(id, { status: 'skipped' });
    advanceCurrent();
  };

  const advanceCurrent = () => {
    setCurrentIdx(prev => {
      const next = prev + 1;
      return next < noteStates.length ? next : prev;
    });
  };

  const applyAll = async () => {
    setSaving(true);
    setSaveError('');
    try {
      for (const ns of noteStates) {
        if (ns.status === 'approved') {
          await joplinService.updateNote(ns.note.id, { body: ns.newBody });
          updateNote(ns.note.id, { status: 'saved' });
        }
      }
    } catch (err) {
      setSaveError((err as Error).message);
    }
    setSaving(false);
  };

  const reset = () => {
    setNoteStates([]);
    setCurrentIdx(0);
    setRunning(false);
    abortRef.current = false;
  };

  const progressPct = started
    ? Math.round((processedNotes.length / noteStates.length) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-gray-900 border border-gray-700 rounded-2xl flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 shrink-0">
          <Bot className="w-5 h-5 text-emerald-400" />
          <h2 className="text-white font-semibold text-base">AI Agent — Notebook</h2>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
            {allNotes.length} notes
          </span>
          {started && (
            <div className="flex-1 flex items-center gap-2 ml-2">
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 shrink-0">
                {processedNotes.length}/{noteStates.length}
              </span>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {started && (
              <button
                onClick={reset}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left panel — setup */}
          <div className="w-64 flex flex-col border-r border-gray-800 shrink-0">
            {/* Instruction */}
            <div className="p-4 border-b border-gray-800">
              <label className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2 block">
                Instruction
              </label>
              <div className="relative">
                <textarea
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  placeholder="e.g. Fix grammar and improve writing…"
                  rows={4}
                  disabled={running}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
                <button
                  onClick={() => setShowPresets(v => !v)}
                  className="absolute bottom-2 right-2 text-xs text-gray-500 hover:text-emerald-400 transition-colors"
                  title="Preset instructions"
                >
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showPresets ? 'rotate-90' : ''}`} />
                </button>
              </div>
              {showPresets && (
                <div className="mt-2 space-y-1">
                  {PRESET_INSTRUCTIONS.map(p => (
                    <button
                      key={p}
                      onClick={() => { setInstruction(p); setShowPresets(false); }}
                      className="w-full text-left text-xs px-2 py-1.5 rounded text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Note selection */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
              <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Notes</span>
              <div className="flex items-center gap-2">
                <button onClick={selectAll} className="text-xs text-gray-500 hover:text-white transition-colors">All</button>
                <span className="text-gray-700">·</span>
                <button onClick={selectNone} className="text-xs text-gray-500 hover:text-white transition-colors">None</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {allNotes.map((note, idx) => {
                const ns = noteStates.find(s => s.note.id === note.id);
                const isSelected = selectedIds.has(note.id);
                const isCurrent = started && noteStates[currentIdx]?.note.id === note.id;

                return (
                  <button
                    key={note.id}
                    onClick={() => {
                      if (!started) {
                        toggleSelect(note.id);
                      } else {
                        const nsIdx = noteStates.findIndex(s => s.note.id === note.id);
                        if (nsIdx >= 0) setCurrentIdx(nsIdx);
                      }
                    }}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/50 transition-colors ${
                      isCurrent ? 'bg-emerald-900/20 border-l-2 border-l-emerald-500' :
                      'hover:bg-gray-800/50'
                    }`}
                  >
                    {/* Status indicator */}
                    {!started ? (
                      <div className={`w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                    ) : (
                      <div className="shrink-0 w-4 h-4 flex items-center justify-center">
                        {ns?.status === 'processing' && <Loader2 className="w-3.5 h-3.5 text-emerald-400 animate-spin" />}
                        {ns?.status === 'done' && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                        {ns?.status === 'approved' && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                        {(ns?.status === 'skipped') && <SkipForward className="w-3 h-3 text-gray-500" />}
                        {ns?.status === 'saved' && <CheckCheck className="w-3.5 h-3.5 text-blue-400" />}
                        {ns?.status === 'pending' && <div className="w-2 h-2 rounded-full bg-gray-600" />}
                      </div>
                    )}
                    <span className="text-xs text-gray-300 truncate flex-1">
                      {note.title || `Note ${idx + 1}`}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Run / Stop button */}
            <div className="p-4 border-t border-gray-800 shrink-0">
              {!started || (!running && processedNotes.length === 0) ? (
                <button
                  onClick={runAgent}
                  disabled={!instruction.trim() || selectedIds.size === 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium transition-colors"
                >
                  <Play className="w-4 h-4" /> Run Agent ({selectedIds.size})
                </button>
              ) : running ? (
                <button
                  onClick={stopAgent}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-700 hover:bg-red-600 rounded-xl text-sm font-medium transition-colors"
                >
                  <X className="w-4 h-4" /> Stop
                </button>
              ) : (
                <div className="space-y-2">
                  {approved.length > 0 && (
                    <button
                      onClick={applyAll}
                      disabled={saving}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Apply {approved.length} to Joplin
                    </button>
                  )}
                  {saveError && <p className="text-xs text-red-400">{saveError}</p>}
                  {savedCount > 0 && (
                    <p className="text-xs text-center text-emerald-400">
                      ✓ {savedCount} note{savedCount !== 1 ? 's' : ''} saved
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right panel — note preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!started ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-600 gap-3">
                <Bot className="w-12 h-12 opacity-30" />
                <p className="text-sm">Enter an instruction and click Run Agent</p>
                <p className="text-xs text-gray-700">
                  The agent will process each selected note and show results here
                </p>
              </div>
            ) : current ? (
              <>
                {/* Note header */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800 shrink-0">
                  <span className="text-sm font-medium text-white truncate flex-1">
                    {current.note.title || 'Untitled'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {currentIdx + 1} / {noteStates.length}
                  </span>
                  {/* Before / After tabs */}
                  <div className="flex rounded-lg overflow-hidden border border-gray-700">
                    {(['before', 'after'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1 text-xs font-medium transition-colors ${
                          activeTab === tab
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {tab === 'before' ? 'Before' : 'After'}
                      </button>
                    ))}
                  </div>
                  {/* Approve / Skip (only when done) */}
                  {current.status === 'done' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveNote(current.note.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => skipNote(current.note.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs font-medium transition-colors"
                      >
                        <SkipForward className="w-3.5 h-3.5" /> Skip
                      </button>
                    </div>
                  )}
                  {current.status === 'approved' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> Approved
                    </span>
                  )}
                  {current.status === 'skipped' && (
                    <span className="flex items-center gap-1 text-xs text-gray-500">
                      <SkipForward className="w-3.5 h-3.5" /> Skipped
                    </span>
                  )}
                  {current.status === 'saved' && (
                    <span className="flex items-center gap-1 text-xs text-blue-400">
                      <CheckCheck className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  {current.status === 'processing' && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 animate-pulse">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing…
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {activeTab === 'before'
                        ? (current.note.body ?? '*No content*')
                        : (current.newBody || (current.status === 'processing' ? '*Generating…*' : '*No content yet*'))
                      }
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Navigate between notes */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800 shrink-0">
                  <button
                    onClick={() => setCurrentIdx(i => Math.max(0, i - 1))}
                    disabled={currentIdx === 0}
                    className="text-xs text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    ← Prev
                  </button>
                  <div className="flex gap-1">
                    {noteStates.map((ns, i) => (
                      <button
                        key={ns.note.id}
                        onClick={() => setCurrentIdx(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          i === currentIdx ? 'bg-white' :
                          ns.status === 'approved' ? 'bg-emerald-500' :
                          ns.status === 'saved' ? 'bg-blue-500' :
                          ns.status === 'skipped' ? 'bg-gray-600' :
                          ns.status === 'done' ? 'bg-yellow-400' :
                          ns.status === 'processing' ? 'bg-emerald-400 animate-pulse' :
                          'bg-gray-700'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentIdx(i => Math.min(noteStates.length - 1, i + 1))}
                    disabled={currentIdx === noteStates.length - 1}
                    className="text-xs text-gray-500 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    Next →
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
