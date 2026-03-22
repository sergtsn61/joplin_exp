import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  X, Sparkles, Loader2, Save, Copy, Check, ChevronDown, ChevronRight,
  FileText, BookOpen, GraduationCap, ListChecks, HelpCircle, Newspaper,
  MessageSquare, GitCompare, BookMarked, Plus, Trash2, Send, SlidersHorizontal,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store';
import { aiService } from '../services/ai';
import { joplinService } from '../services/joplin';
import type { JoplinNote } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { id: 'manual',    label: 'Методичка',  icon: GraduationCap, prompt: 'structured methodical guide with clear sections, explanations, and examples' },
  { id: 'article',   label: 'Статья',     icon: Newspaper,     prompt: 'coherent article with introduction, body, and conclusion' },
  { id: 'summary',   label: 'Конспект',   icon: FileText,      prompt: 'concise summary preserving key points and structure' },
  { id: 'tutorial',  label: 'Туториал',   icon: BookOpen,      prompt: 'step-by-step tutorial with numbered steps and code examples where relevant' },
  { id: 'checklist', label: 'Чеклист',    icon: ListChecks,    prompt: 'actionable checklist with organized categories' },
  { id: 'faq',       label: 'FAQ',        icon: HelpCircle,    prompt: 'FAQ document with clear questions and answers' },
];

interface DocVersion {
  id: string;
  label: string;
  content: string;
  ts: Date;
}

interface PromptTemplate {
  id: string;
  name: string;
  docTypeId: string;
  language: string;
  customInstructions: string;
}

const TEMPLATES_KEY = 'nc_prompt_templates';

// Rough token estimator: ~3.5 chars per token (mixed RU/EN)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

// Context window presets by provider/model keyword
function defaultContextSize(model: string, provider: string): number {
  if (provider === 'anthropic') return 200000;
  if (provider === 'openai') {
    if (model.includes('gpt-4o')) return 128000;
    if (model.includes('gpt-4-turbo')) return 128000;
    if (model.includes('gpt-4')) return 8192;
    if (model.includes('gpt-3.5')) return 16385;
    return 128000;
  }
  if (provider === 'openrouter') return 128000;
  if (provider === 'gemini') {
    if (model.includes('1.5')) return 1000000;
    return 1000000; // gemini-2.0-flash also 1M
  }
  // Ollama — local models vary widely, default 8k
  if (model.includes('llama3')) return 8192;
  if (model.includes('mistral')) return 32768;
  if (model.includes('qwen')) return 32768;
  if (model.includes('gemma')) return 8192;
  return 8192;
}

function loadTemplates(): PromptTemplate[] {
  try { return JSON.parse(localStorage.getItem(TEMPLATES_KEY) || '[]'); } catch { return []; }
}
function saveTemplates(t: PromptTemplate[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t));
}

// ─── Simple line diff ─────────────────────────────────────────────────────────
type DiffLine = { type: 'same' | 'add' | 'remove'; text: string };

function diffText(oldText: string, newText: string): { left: DiffLine[]; right: DiffLine[] } {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // LCS-based diff (simplified: Myers-like)
  const m = oldLines.length, n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = oldLines[i] === newLines[j]
        ? dp[i + 1][j + 1] + 1
        : Math.max(dp[i + 1][j], dp[i][j + 1]);

  const left: DiffLine[] = [];
  const right: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < m || j < n) {
    if (i < m && j < n && oldLines[i] === newLines[j]) {
      left.push({ type: 'same', text: oldLines[i] });
      right.push({ type: 'same', text: newLines[j] });
      i++; j++;
    } else if (j < n && (i >= m || dp[i][j + 1] >= dp[i + 1][j])) {
      left.push({ type: 'same', text: '' }); // placeholder
      right.push({ type: 'add', text: newLines[j] });
      j++;
    } else {
      left.push({ type: 'remove', text: oldLines[i] });
      right.push({ type: 'same', text: '' }); // placeholder
      i++;
    }
  }
  return { left, right };
}

function DiffPane({ lines, side }: { lines: DiffLine[]; side: 'left' | 'right' }) {
  return (
    <div className="flex-1 overflow-auto font-mono text-xs leading-5 p-4 min-w-0">
      {lines.map((l, i) => (
        <div
          key={i}
          className={
            l.type === 'add' ? 'bg-green-900/40 text-green-300' :
            l.type === 'remove' ? 'bg-red-900/40 text-red-300' :
            'text-gray-400'
          }
        >
          <span className={`select-none mr-2 ${side === 'left' ? 'text-red-600' : 'text-green-600'} ${l.type === 'same' ? 'invisible' : ''}`}>
            {side === 'left' ? '−' : '+'}
          </span>
          {l.text || ' '}
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { onClose: () => void }

export function NotebookCompiler({ onClose }: Props) {
  const { notes, notebooks, filter, settings, createNote } = useStore();

  const notebookName = filter.notebookId
    ? notebooks.find(nb => nb.id === filter.notebookId)?.title ?? 'Выбранный блокнот'
    : 'Все заметки';

  // ── Notes selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(notes.map(n => n.id)));
  const [notesExpanded, setNotesExpanded] = useState(true);

  // ── Settings
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [language, setLanguage] = useState('auto');

  // ── Versions
  const [versions, setVersions] = useState<DocVersion[]>([]);
  const [versionIdx, setVersionIdx] = useState(0);
  const [showDiff, setShowDiff] = useState(false);

  // ── Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // ── Refinement
  const [refineInput, setRefineInput] = useState('');
  const refineInputRef = useRef<HTMLTextAreaElement>(null);

  // ── Copy / Save
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Templates
  const [templates, setTemplates] = useState<PromptTemplate[]>(loadTemplates);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTplName, setNewTplName] = useState('');
  const [savingTpl, setSavingTpl] = useState(false);

  // ── AI params (local overrides for this session)
  const [aiParamsOpen, setAiParamsOpen] = useState(false);
  const [localSystemPrompt, setLocalSystemPrompt] = useState(settings.ai.systemPrompt ?? '');
  const [localTemp, setLocalTemp] = useState(settings.ai.temperature ?? 0.7);
  const [localTopP, setLocalTopP] = useState(settings.ai.topP ?? 1.0);
  const [localMaxTokens, setLocalMaxTokens] = useState(settings.ai.maxTokens ?? 2048);
  const [localContextSize, setLocalContextSize] = useState(
    settings.ai.contextSize ?? defaultContextSize(settings.ai.model, settings.ai.provider)
  );

  const currentOutput = versions[versionIdx]?.content ?? '';
  const prevOutput = versions[versionIdx - 1]?.content ?? '';

  // ── Context fill estimation
  const contextUsed = useMemo(() => {
    const selected = notes.filter(n => selectedIds.has(n.id));
    const corpusText = selected.map(n => n.title + '\n' + (n.body || '')).join('\n\n');
    const systemText = localSystemPrompt + (customInstructions || '');
    const historyText = currentOutput; // previous output fed back during refine
    return estimateTokens(corpusText + systemText + historyText);
  }, [notes, selectedIds, localSystemPrompt, customInstructions, currentOutput]);

  const contextPct = localContextSize > 0
    ? Math.min(100, Math.round((contextUsed / localContextSize) * 100))
    : 100;
  const ctxColor = contextPct < 50 ? 'bg-green-500' : contextPct < 80 ? 'bg-yellow-500' : 'bg-red-500';

  // Auto-scroll during generation
  useEffect(() => {
    if (outputRef.current && isGenerating) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [versions, isGenerating]);

  // ── Helpers
  const toggleNote = (id: string) =>
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleAll = () =>
    setSelectedIds(selectedIds.size === notes.length ? new Set() : new Set(notes.map(n => n.id)));

  const buildCorpus = useCallback(() => {
    const selected = notes.filter(n => selectedIds.has(n.id));
    return selected.map((n: JoplinNote, i: number) =>
      `## Заметка ${i + 1}: ${n.title}\n\n${n.body || '(пусто)'}`
    ).join('\n\n---\n\n');
  }, [notes, selectedIds]);

  const stop = () => {
    abortRef.current = true;
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  // ── Shared streaming helper — prevents code duplication between generate/refine
  const runStream = async (
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    errorMsg: string,
  ) => {
    setIsGenerating(true);
    setError('');
    abortRef.current = false;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const tempId = `streaming-${Date.now()}`;

    // Add temp version; capture its index atomically to avoid stale-closure race
    setVersions(prev => {
      const cutAt = versionIdx + 1;
      const label = `v${cutAt + 1}`;
      const v: DocVersion = { id: tempId, label, content: '', ts: new Date() };
      return [...prev.slice(0, cutAt), v];
    });
    setVersionIdx(prev => prev + 1);

    let result = '';
    try {
      await aiService.chat(
        messages,
        { ...settings.ai, temperature: localTemp, topP: localTopP, maxTokens: localMaxTokens, contextSize: localContextSize, signal: controller.signal },
        (chunk) => {
          if (abortRef.current) return;
          result += chunk;
          setVersions(prev => prev.map(v => v.id === tempId ? { ...v, content: result } : v));
        }
      );
      if (!abortRef.current) {
        setVersions(prev => prev.map(v => v.id === tempId ? { ...v, id: crypto.randomUUID() } : v));
      }
    } catch (e) {
      if (!abortRef.current) {
        setError(e instanceof Error ? e.message : errorMsg);
      }
      setVersions(prev => prev.filter(v => v.id !== tempId));
      setVersionIdx(prev => Math.max(0, prev - 1));
    } finally {
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  };

  // ── Generate (initial compilation)
  const generate = async () => {
    if (selectedIds.size === 0) { setError('Выберите хотя бы одну заметку'); return; }

    const langInstruction = language === 'auto'
      ? 'Respond in the same language as the majority of the notes.'
      : `Respond in ${language}.`;

    const systemPrompt = [
      localSystemPrompt.trim()
        ? localSystemPrompt.trim()
        : `You are an expert technical writer and knowledge organizer.\nYour task is to synthesize multiple fragmented notes into a single, coherent ${docType.prompt}.`,
      langInstruction,
      `Rules:\n- Do NOT just concatenate the notes — truly synthesize, reorganize, and rewrite\n- Remove duplicates and redundancies\n- Fill in logical gaps where possible\n- Use proper Markdown formatting with headers, lists, code blocks where appropriate\n- The result must read as a professional, standalone document`,
      customInstructions ? `Additional instructions: ${customInstructions}` : '',
    ].filter(Boolean).join('\n');

    const userPrompt = `Here are ${selectedIds.size} notes from the notebook "${notebookName}":\n\n${buildCorpus()}\n\nPlease compose a ${docType.prompt} from all this material.`;

    await runStream(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      'Ошибка генерации',
    );
  };

  // ── Refine (iterative editing)
  const refine = async () => {
    if (!refineInput.trim() || !currentOutput) return;
    const instruction = refineInput.trim();
    setRefineInput('');

    const systemPrompt = `You are an expert editor. You will be given a document and an editing instruction.
Apply the instruction to improve the document. Return the COMPLETE revised document in Markdown.
Preserve all parts that are not affected by the instruction.
Do not add meta-commentary — just return the revised document.`;

    const userPrompt = `Here is the current document:\n\n${currentOutput}\n\n---\nEditing instruction: ${instruction}`;

    await runStream(
      [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      'Ошибка редактирования',
    );
  };

  const handleRefineKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); refine(); }
  };

  // ── Copy / Save
  const copy = async () => {
    await navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveNote = async () => {
    if (!currentOutput) return;
    try {
      const title = `[AI] ${docType.label}: ${notebookName} (${versions[versionIdx]?.label})`;
      await createNote(title);
      const store = useStore.getState();
      if (store.selectedNote) {
        await joplinService.updateNote(store.selectedNote.id, { body: currentOutput });
        store.openNote(store.selectedNote.id);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить заметку');
    }
  };

  // ── Templates
  const saveTemplate = () => {
    if (!newTplName.trim()) return;
    const tpl: PromptTemplate = {
      id: crypto.randomUUID(),
      name: newTplName.trim(),
      docTypeId: docType.id,
      language,
      customInstructions,
    };
    const next = [...templates, tpl];
    setTemplates(next);
    saveTemplates(next);
    setNewTplName('');
    setSavingTpl(false);
  };

  const deleteTemplate = (id: string) => {
    const next = templates.filter(t => t.id !== id);
    setTemplates(next);
    saveTemplates(next);
  };

  const applyTemplate = (tpl: PromptTemplate) => {
    const dt = DOC_TYPES.find(d => d.id === tpl.docTypeId);
    if (dt) setDocType(dt);
    setLanguage(tpl.language);
    setCustomInstructions(tpl.customInstructions);
    setShowTemplates(false);
  };

  // ── Diff (memoized — diffText runs LCS which is O(m*n))
  const diff = useMemo(
    () => showDiff && versionIdx > 0 ? diffText(prevOutput, currentOutput) : null,
    [showDiff, versionIdx, prevOutput, currentOutput],
  );
  const DocIcon = docType.icon;
  const selectedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/70 backdrop-blur-sm">
      <div className="flex flex-1 m-4 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">

        {/* ── Left panel ────────────────────────────────────────────────── */}
        <div className="w-72 shrink-0 flex flex-col border-r border-gray-800 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-sm text-white">AI Компилятор</span>
            <button onClick={onClose} className="ml-auto p-1 text-gray-500 hover:text-gray-300 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Notebook */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Блокнот</p>
              <p className="text-sm text-white font-medium truncate">{notebookName}</p>
            </div>

            {/* Templates */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">Шаблоны настроек</p>
                <button
                  onClick={() => setShowTemplates(v => !v)}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                >
                  <BookMarked className="w-3 h-3" />
                  {showTemplates ? 'скрыть' : 'показать'}
                </button>
              </div>

              {showTemplates && (
                <div className="space-y-1.5 mb-3">
                  {templates.length === 0 && (
                    <p className="text-xs text-gray-600 italic">Нет сохранённых шаблонов</p>
                  )}
                  {templates.map(tpl => (
                    <div key={tpl.id} className="flex items-center gap-1.5 group">
                      <button
                        onClick={() => applyTemplate(tpl)}
                        className="flex-1 text-left px-2.5 py-1.5 bg-gray-800 hover:bg-purple-900/30 border border-gray-700 hover:border-purple-700 rounded-lg text-xs text-gray-300 truncate transition-colors"
                      >
                        {tpl.name}
                      </button>
                      <button
                        onClick={() => deleteTemplate(tpl.id)}
                        className="p-1 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Save current as template */}
                  {savingTpl ? (
                    <div className="flex gap-1.5 mt-2">
                      <input
                        autoFocus
                        value={newTplName}
                        onChange={e => setNewTplName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveTemplate(); if (e.key === 'Escape') setSavingTpl(false); }}
                        placeholder="Название шаблона"
                        className="flex-1 bg-gray-800 border border-purple-600 rounded-lg px-2 py-1 text-xs text-white placeholder-gray-600"
                      />
                      <button onClick={saveTemplate} className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded-lg text-xs text-white">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSavingTpl(true)}
                      className="flex items-center gap-1.5 w-full px-2.5 py-1.5 border border-dashed border-gray-700 hover:border-purple-600 rounded-lg text-xs text-gray-500 hover:text-purple-400 transition-colors mt-1"
                    >
                      <Plus className="w-3 h-3" /> Сохранить текущие настройки
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Doc type */}
            <div>
              <p className="text-xs text-gray-500 mb-2">Тип документа</p>
              <div className="grid grid-cols-2 gap-1.5">
                {DOC_TYPES.map(dt => {
                  const Icon = dt.icon;
                  return (
                    <button
                      key={dt.id}
                      onClick={() => setDocType(dt)}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                        docType.id === dt.id
                          ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                          : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600 hover:text-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {dt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Язык результата</p>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
              >
                <option value="auto">Авто (как в заметках)</option>
                <option value="Russian">Русский</option>
                <option value="English">English</option>
                <option value="Ukrainian">Українська</option>
                <option value="German">Deutsch</option>
                <option value="Spanish">Español</option>
              </select>
            </div>

            {/* Custom instructions */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Дополнительные инструкции</p>
              <textarea
                value={customInstructions}
                onChange={e => setCustomInstructions(e.target.value)}
                placeholder="Например: сделай упор на практические примеры, добавь раздел с выводами..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none"
              />
            </div>

            {/* Note selection */}
            <div>
              <button
                onClick={() => setNotesExpanded(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 w-full mb-2"
              >
                {notesExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Заметки ({selectedCount}/{notes.length})
                <span
                  onClick={e => { e.stopPropagation(); toggleAll(); }}
                  className="ml-auto text-purple-400 hover:text-purple-300 cursor-pointer"
                >
                  {selectedCount === notes.length ? 'снять все' : 'выбрать все'}
                </span>
              </button>
              {notesExpanded && (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {notes.map((note) => (
                    <label key={note.id} className="flex items-start gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(note.id)}
                        onChange={() => toggleNote(note.id)}
                        className="mt-0.5 accent-purple-500 shrink-0"
                      />
                      <span className="text-xs text-gray-300 group-hover:text-white leading-tight line-clamp-2">
                        {note.title || '(без названия)'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* AI Parameters */}
          <div className="border-t border-gray-800">
            {/* Context fill bar — always visible */}
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">Контекст</span>
                <span className={`text-xs font-mono font-medium ${
                  contextPct < 50 ? 'text-green-400' : contextPct < 80 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  ~{contextUsed.toLocaleString()} / {localContextSize.toLocaleString()} токенов ({contextPct}%)
                </span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${ctxColor}`} style={{ width: `${contextPct}%` }} />
              </div>
            </div>

            {/* Collapsible params */}
            <button
              onClick={() => setAiParamsOpen(v => !v)}
              className="flex items-center gap-2 w-full px-4 py-2 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Параметры модели
              {aiParamsOpen ? <ChevronDown className="w-3 h-3 ml-auto" /> : <ChevronRight className="w-3 h-3 ml-auto" />}
            </button>

            {aiParamsOpen && (
              <div className="px-4 pb-3 space-y-3">
                {/* System prompt */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Системный промпт</label>
                  <textarea
                    value={localSystemPrompt}
                    onChange={e => setLocalSystemPrompt(e.target.value)}
                    placeholder="Оставь пустым — используется встроенный промпт технического редактора"
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-gray-600 resize-none"
                  />
                </div>

                {/* Temperature */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-gray-500">T — Температура</label>
                    <span className="text-xs font-mono text-purple-300">{localTemp.toFixed(1)}</span>
                  </div>
                  <input type="range" min="0" max="2" step="0.1" value={localTemp}
                    onChange={e => setLocalTemp(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1.5"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                    <span>точный</span><span>творческий</span>
                  </div>
                </div>

                {/* Top-P */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-gray-500">P — Top-P (nucleus)</label>
                    <span className="text-xs font-mono text-purple-300">{localTopP.toFixed(2)}</span>
                  </div>
                  <input type="range" min="0.01" max="1" step="0.01" value={localTopP}
                    onChange={e => setLocalTopP(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 h-1.5"
                  />
                  <div className="flex justify-between text-xs text-gray-600 mt-0.5">
                    <span>фокус</span><span>разнообразие</span>
                  </div>
                </div>

                {/* Max output tokens */}
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-xs text-gray-500">Max токенов (ответ)</label>
                    <span className="text-xs font-mono text-purple-300">{localMaxTokens.toLocaleString()}</span>
                  </div>
                  <input type="range" min="256" max="16384" step="256" value={localMaxTokens}
                    onChange={e => setLocalMaxTokens(parseInt(e.target.value))}
                    className="w-full accent-purple-500 h-1.5"
                  />
                </div>

                {/* Context window size */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Окно контекста модели</label>
                  <input
                    type="number"
                    min="1024" max="2000000" step="1024"
                    value={localContextSize}
                    onChange={e => setLocalContextSize(parseInt(e.target.value) || 8192)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
                  />
                  <p className="text-xs text-gray-600 mt-0.5">токенов (укажи реальный лимит модели)</p>
                </div>
              </div>
            )}
          </div>

          {/* Generate button */}
          <div className="p-4 border-t border-gray-800">
            {isGenerating ? (
              <button
                onClick={stop}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-700 hover:bg-red-600 rounded-xl text-sm font-medium text-white transition-colors"
              >
                <Loader2 className="w-4 h-4 animate-spin" /> Остановить
              </button>
            ) : (
              <button
                onClick={generate}
                disabled={selectedCount === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {versions.length > 0 ? 'Перегенерировать' : `Скомпилировать (${selectedCount})`}
              </button>
            )}
          </div>
        </div>

        {/* ── Right panel ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 shrink-0 flex-wrap gap-y-1.5">
            <DocIcon className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-sm font-medium text-white">{docType.label}</span>

            {/* Version pills */}
            {versions.length > 0 && (
              <div className="flex items-center gap-1 ml-2">
                {versions.map((v, idx) => (
                  <button
                    key={v.id}
                    onClick={() => { setVersionIdx(idx); setShowDiff(false); }}
                    className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                      idx === versionIdx
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    title={v.ts.toLocaleTimeString()}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {/* Diff toggle */}
            {versionIdx > 0 && currentOutput && (
              <button
                onClick={() => setShowDiff(v => !v)}
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                  showDiff
                    ? 'bg-orange-600/30 text-orange-300 border border-orange-600/50'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" />
                Diff
              </button>
            )}

            {isGenerating && (
              <span className="flex items-center gap-1.5 text-xs text-purple-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Генерирую…
              </span>
            )}

            <div className="ml-auto flex items-center gap-2">
              {currentOutput && (
                <>
                  <button
                    onClick={copy}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Скопировано' : 'Копировать'}
                  </button>
                  <button
                    onClick={saveNote}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-600 rounded-lg text-xs text-white transition-colors"
                  >
                    {saved ? <Check className="w-3.5 h-3.5 text-green-300" /> : <Save className="w-3.5 h-3.5" />}
                    {saved ? 'Сохранено!' : 'Сохранить'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Output / Diff area */}
          <div ref={outputRef} className="flex-1 overflow-hidden flex">
            {!currentOutput && !isGenerating && !error && (
              <div className="flex flex-col items-center justify-center w-full text-center p-8">
                <div className="w-16 h-16 rounded-full bg-purple-900/30 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-gray-300 font-medium mb-2">Выбери заметки и тип документа</p>
                <p className="text-gray-500 text-sm max-w-md">
                  AI прочитает все выбранные заметки из блокнота «{notebookName}» и соберёт из них единый структурированный документ.
                </p>
              </div>
            )}

            {error && (
              <div className="m-4 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm self-start flex items-start gap-3">
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="shrink-0 text-red-400 hover:text-red-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Diff view */}
            {diff && (
              <div className="flex flex-1 overflow-hidden divide-x divide-gray-800">
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-1.5 bg-red-900/20 border-b border-gray-800 text-xs text-red-400 font-medium shrink-0">
                    ← {versions[versionIdx - 1]?.label}
                  </div>
                  <div className="flex-1 overflow-auto">
                    <DiffPane lines={diff.left} side="left" />
                  </div>
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-4 py-1.5 bg-green-900/20 border-b border-gray-800 text-xs text-green-400 font-medium shrink-0">
                    → {versions[versionIdx]?.label}
                  </div>
                  <div className="flex-1 overflow-auto">
                    <DiffPane lines={diff.right} side="right" />
                  </div>
                </div>
              </div>
            )}

            {/* Normal markdown view */}
            {!diff && currentOutput && (
              <div className="flex-1 overflow-y-auto p-6">
                <article className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-white prose-headings:font-semibold
                  prose-p:text-gray-300 prose-li:text-gray-300
                  prose-code:text-purple-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:rounded
                  prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700
                  prose-blockquote:border-l-purple-500 prose-blockquote:text-gray-400
                  prose-strong:text-white prose-a:text-purple-400">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentOutput}</ReactMarkdown>
                </article>
              </div>
            )}
          </div>

          {/* ── Refinement input (shown after first generation) */}
          {currentOutput && !showDiff && (
            <div className="border-t border-gray-800 p-3 shrink-0">
              <div className="flex items-end gap-2 bg-gray-800 rounded-xl border border-gray-700 focus-within:border-purple-600 transition-colors px-3 py-2">
                <MessageSquare className="w-4 h-4 text-gray-500 shrink-0 mb-0.5" />
                <textarea
                  ref={refineInputRef}
                  value={refineInput}
                  onChange={e => setRefineInput(e.target.value)}
                  onKeyDown={handleRefineKey}
                  placeholder='Уточни документ: "сделай раздел про X подробнее", "добавь примеры в начало", "сократи введение"…'
                  rows={1}
                  disabled={isGenerating}
                  className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 resize-none outline-none min-h-[24px] max-h-32"
                  style={{ height: 'auto' }}
                  onInput={e => {
                    const t = e.target as HTMLTextAreaElement;
                    t.style.height = 'auto';
                    t.style.height = Math.min(t.scrollHeight, 128) + 'px';
                  }}
                />
                <button
                  onClick={refine}
                  disabled={!refineInput.trim() || isGenerating}
                  className="p-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                >
                  {isGenerating
                    ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                    : <Send className="w-3.5 h-3.5 text-white" />
                  }
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1.5 ml-1">Enter — отправить · Shift+Enter — перенос строки</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
