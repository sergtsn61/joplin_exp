import { useState, useRef, useEffect } from 'react';
import {
  X, Sparkles, Loader2, Save, Copy, Check, ChevronDown, ChevronRight,
  FileText, BookOpen, GraduationCap, ListChecks, HelpCircle, Newspaper,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../store';
import { aiService } from '../services/ai';
import { joplinService } from '../services/joplin';
import type { JoplinNote } from '../types';

const DOC_TYPES = [
  { id: 'manual',    label: 'Методичка',    icon: GraduationCap, prompt: 'structured methodical guide with clear sections, explanations, and examples' },
  { id: 'article',   label: 'Статья',       icon: Newspaper,     prompt: 'coherent article with introduction, body, and conclusion' },
  { id: 'summary',   label: 'Конспект',     icon: FileText,      prompt: 'concise summary preserving key points and structure' },
  { id: 'tutorial',  label: 'Туториал',     icon: BookOpen,      prompt: 'step-by-step tutorial with numbered steps and code examples where relevant' },
  { id: 'checklist', label: 'Чеклист',      icon: ListChecks,    prompt: 'actionable checklist with organized categories' },
  { id: 'faq',       label: 'FAQ',          icon: HelpCircle,    prompt: 'FAQ document with clear questions and answers' },
];

interface Props {
  onClose: () => void;
}

export function NotebookCompiler({ onClose }: Props) {
  const { notes, notebooks, filter, settings, createNote } = useStore();

  // Current notebook name
  const notebookName = filter.notebookId
    ? notebooks.find(nb => nb.id === filter.notebookId)?.title ?? 'Выбранный блокнот'
    : 'Все заметки';

  // Notes selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(notes.map(n => n.id)));
  const [expanded, setExpanded] = useState(true);

  // Doc type & instructions
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [customInstructions, setCustomInstructions] = useState('');
  const [language, setLanguage] = useState('auto');

  // Output
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const outputRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  // Auto-scroll
  useEffect(() => {
    if (outputRef.current && isGenerating) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, isGenerating]);

  const toggleNote = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === notes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notes.map(n => n.id)));
    }
  };

  const generate = async () => {
    const selected = notes.filter(n => selectedIds.has(n.id));
    if (selected.length === 0) { setError('Выберите хотя бы одну заметку'); return; }

    setIsGenerating(true);
    setOutput('');
    setError('');
    abortRef.current = false;

    // Build notes corpus
    const corpus = selected.map((n: JoplinNote, i: number) =>
      `## Заметка ${i + 1}: ${n.title}\n\n${n.body || '(пусто)'}`
    ).join('\n\n---\n\n');

    const langInstruction = language === 'auto'
      ? 'Respond in the same language as the majority of the notes.'
      : `Respond in ${language}.`;

    const systemPrompt = `You are an expert technical writer and knowledge organizer.
Your task is to synthesize multiple fragmented notes into a single, coherent ${docType.prompt}.
${langInstruction}
Rules:
- Do NOT just concatenate the notes — truly synthesize, reorganize, and rewrite
- Remove duplicates and redundancies
- Fill in logical gaps where possible
- Use proper Markdown formatting with headers, lists, code blocks where appropriate
- The result must read as a professional, standalone document
${customInstructions ? `\nAdditional instructions: ${customInstructions}` : ''}`;

    const userPrompt = `Here are ${selected.length} notes from the notebook "${notebookName}":

${corpus}

Please compose a ${docType.prompt} from all this material.`;

    try {
      await aiService.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        settings.ai,
        (chunk) => {
          if (abortRef.current) return;
          setOutput(prev => prev + chunk);
        }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка генерации');
    } finally {
      setIsGenerating(false);
    }
  };

  const stop = () => { abortRef.current = true; setIsGenerating(false); };

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveNote = async () => {
    if (!output) return;
    const title = `[AI] ${docType.label}: ${notebookName}`;
    await createNote(title);
    // After createNote the new note is selected, update its body
    const store = useStore.getState();
    if (store.selectedNote) {
      await joplinService.updateNote(store.selectedNote.id, { body: output });
      // Refresh
      store.openNote(store.selectedNote.id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const selectedCount = selectedIds.size;
  const DocIcon = docType.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-stretch bg-black/70 backdrop-blur-sm">
      <div className="flex flex-1 m-4 bg-gray-900 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden">

        {/* Left panel — settings & note selection */}
        <div className="w-72 shrink-0 flex flex-col border-r border-gray-800 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="font-semibold text-sm text-white">AI Компилятор</span>
            <button onClick={onClose} className="ml-auto p-1 text-gray-500 hover:text-gray-300 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Notebook name */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Блокнот</p>
              <p className="text-sm text-white font-medium truncate">{notebookName}</p>
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
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 w-full mb-2"
              >
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                Заметки ({selectedCount}/{notes.length})
                <span
                  onClick={e => { e.stopPropagation(); toggleAll(); }}
                  className="ml-auto text-purple-400 hover:text-purple-300 cursor-pointer"
                >
                  {selectedCount === notes.length ? 'снять все' : 'выбрать все'}
                </span>
              </button>

              {expanded && (
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {notes.map((note: JoplinNote) => (
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

          {/* Generate button */}
          <div className="p-4 border-t border-gray-800">
            {isGenerating ? (
              <button
                onClick={stop}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-700 hover:bg-red-600 rounded-xl text-sm font-medium text-white transition-colors"
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                Остановить
              </button>
            ) : (
              <button
                onClick={generate}
                disabled={selectedCount === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-sm font-medium text-white transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                Скомпилировать {selectedCount > 0 ? `(${selectedCount})` : ''}
              </button>
            )}
          </div>
        </div>

        {/* Right panel — result */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 shrink-0">
            <DocIcon className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-white">{docType.label}</span>
            {isGenerating && (
              <span className="flex items-center gap-1.5 text-xs text-purple-400 ml-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Генерирую…
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {output && (
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
                    {saved ? 'Сохранено!' : 'Сохранить заметку'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Output area */}
          <div ref={outputRef} className="flex-1 overflow-y-auto">
            {!output && !isGenerating && !error && (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-16 h-16 rounded-full bg-purple-900/30 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-purple-400" />
                </div>
                <p className="text-gray-300 font-medium mb-2">Выбери заметки и тип документа</p>
                <p className="text-gray-500 text-sm max-w-md">
                  AI прочитает все выбранные заметки из блокнота «{notebookName}» и соберёт из них единый, структурированный документ.
                </p>
              </div>
            )}

            {error && (
              <div className="m-4 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}

            {output && (
              <div className="p-6">
                <article className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-white prose-headings:font-semibold
                  prose-p:text-gray-300 prose-li:text-gray-300
                  prose-code:text-purple-300 prose-code:bg-gray-800 prose-code:px-1 prose-code:rounded
                  prose-pre:bg-gray-800 prose-pre:border prose-pre:border-gray-700
                  prose-blockquote:border-l-purple-500 prose-blockquote:text-gray-400
                  prose-strong:text-white prose-a:text-purple-400">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {output}
                  </ReactMarkdown>
                </article>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
