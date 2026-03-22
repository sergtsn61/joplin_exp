import { useEffect, useRef, useCallback, useState } from 'react';
import { useStore } from '../store';
import { EditorView, keymap, lineNumbers, drawSelection } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { oneDark } from '@codemirror/theme-one-dark';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { languages } from '@codemirror/language-data';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Eye,
  Edit3,
  Columns,
  Save,
  Trash2,
  Download,
  FileDown,
  Tag,
  Loader2,
  Printer,
  Maximize2,
  Minimize2,
  History,
  Paperclip,
  LayoutTemplate,
} from 'lucide-react';
import type { ViewMode } from '../types';
import { exportService } from '../services/export';
import { AIQuickActions } from './AIQuickActions';
import { VersionHistory } from './VersionHistory';
import { AttachmentsPanel } from './AttachmentsPanel';
import { NoteTemplates } from './NoteTemplates';
import { useHotkeys } from '../hooks/useHotkeys';

const AUTOSAVE_DELAY = 2000;

export function NoteEditor() {
  const { selectedNote, viewMode, setViewMode, saveCurrentNote, updateNote, deleteNote, isSaving, createNote } = useStore();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localBody, setLocalBody] = useState('');
  const [titleEditing, setTitleEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState('');
  const [showExport, setShowExport] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current) return;

    const view = new EditorView({
      state: EditorState.create({
        doc: selectedNote?.body || '',
        extensions: [
          lineNumbers(),
          history(),
          drawSelection(),
          EditorView.lineWrapping,
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          oneDark,
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              const content = update.state.doc.toString();
              setLocalBody(content);
              if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
              saveTimerRef.current = setTimeout(() => {
                saveCurrentNote(content);
              }, AUTOSAVE_DELAY);
            }
          }),
        ],
      }),
      parent: editorRef.current,
    });

    viewRef.current = view;
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Update editor content when note changes
  useEffect(() => {
    if (!selectedNote) return;
    setLocalTitle(selectedNote.title);
    setLocalBody(selectedNote.body);
    if (viewRef.current) {
      const current = viewRef.current.state.doc.toString();
      if (current !== selectedNote.body) {
        viewRef.current.dispatch({
          changes: { from: 0, to: current.length, insert: selectedNote.body },
        });
      }
    }
  }, [selectedNote?.id]);

  const handleTitleSave = useCallback(() => {
    if (selectedNote && localTitle !== selectedNote.title) {
      updateNote(selectedNote.id, { title: localTitle });
    }
    setTitleEditing(false);
  }, [selectedNote, localTitle, updateNote]);

  const handleManualSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveCurrentNote(localBody);
  }, [localBody, saveCurrentNote]);

  const handleDelete = useCallback(async () => {
    if (!selectedNote) return;
    if (confirm(`Delete "${selectedNote.title}"?`)) {
      await deleteNote(selectedNote.id);
    }
  }, [selectedNote, deleteNote]);

  const handleTemplateSelect = useCallback(async (title: string, body: string) => {
    await createNote(title);
    // After createNote, selectedNote will update — we patch the body via updateNote
    // Small delay to ensure store is updated
    setTimeout(() => saveCurrentNote(body), 100);
    if (viewRef.current) {
      viewRef.current.dispatch({
        changes: { from: 0, to: viewRef.current.state.doc.length, insert: body },
      });
    }
  }, [createNote, saveCurrentNote]);

  // Global hotkeys
  useHotkeys([
    { key: 's', ctrl: true, handler: handleManualSave },
    { key: 'F11', handler: () => setIsFullscreen(v => !v) },
    { key: 'Escape', handler: () => { if (isFullscreen) setIsFullscreen(false); } },
    { key: 'p', ctrl: true, handler: () => setViewMode(viewMode === 'preview' ? 'editor' : 'preview') },
  ], [handleManualSave, isFullscreen, viewMode]);

  if (!selectedNote) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 text-gray-600">
        <Edit3 className="w-12 h-12 mb-3 opacity-30" />
        <p className="text-sm">Select a note to start editing</p>
        <button
          onClick={() => setShowTemplates(true)}
          className="mt-4 flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 transition-colors"
        >
          <LayoutTemplate className="w-4 h-4" /> New from template
        </button>
        {showTemplates && (
          <NoteTemplates onSelect={handleTemplateSelect} onClose={() => setShowTemplates(false)} />
        )}
      </div>
    );
  }

  const modes: { mode: ViewMode; icon: typeof Eye; label: string }[] = [
    { mode: 'editor', icon: Edit3, label: 'Editor' },
    { mode: 'split', icon: Columns, label: 'Split' },
    { mode: 'preview', icon: Eye, label: 'Preview' },
  ];

  return (
    <div className={`flex-1 flex flex-col bg-gray-950 min-w-0 ${isFullscreen ? 'fixed inset-0 z-40' : ''}`}>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900 shrink-0">
        {/* Title */}
        <div className="flex-1 min-w-0">
          {titleEditing ? (
            <input
              autoFocus
              value={localTitle}
              onChange={e => setLocalTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') { setLocalTitle(selectedNote.title); setTitleEditing(false); }
              }}
              className="w-full bg-gray-800 text-white font-semibold text-base px-2 py-1 rounded border border-blue-500 focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setTitleEditing(true)}
              className="text-left w-full text-white font-semibold text-base hover:text-blue-400 truncate transition-colors"
            >
              {selectedNote.title || 'Untitled'}
            </button>
          )}
        </div>

        {/* View mode */}
        <div className="flex bg-gray-800 rounded-lg p-0.5 gap-0.5">
          {modes.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              title={label}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                viewMode === mode ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <AIQuickActions />

          {/* Templates */}
          <button
            onClick={() => setShowTemplates(true)}
            className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Templates"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
          </button>

          {/* Save */}
          <button
            onClick={handleManualSave}
            disabled={isSaving}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-green-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Save (Ctrl+S)"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>

          {/* History */}
          <button
            onClick={() => setShowVersionHistory(true)}
            className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Version History"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* Attachments */}
          <button
            onClick={() => setShowAttachments(v => !v)}
            className={`p-1.5 hover:bg-gray-800 rounded-lg transition-colors ${showAttachments ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'}`}
            title="Attachments"
          >
            <Paperclip className="w-3.5 h-3.5" />
          </button>

          {/* Export menu */}
          <div className="relative">
            <button
              onClick={() => setShowExport(!showExport)}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors"
              title="Export"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-36">
                <button
                  onClick={() => { exportService.downloadMarkdown(selectedNote); setShowExport(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  <FileDown className="w-4 h-4" /> Export .md
                </button>
                <button
                  onClick={() => { exportService.downloadHTML(selectedNote); setShowExport(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  <FileDown className="w-4 h-4" /> Export .html
                </button>
                <button
                  onClick={() => { exportService.printToPDF(selectedNote); setShowExport(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                >
                  <Printer className="w-4 h-4" /> Print / PDF
                </button>
              </div>
            )}
          </div>

          {selectedNote.tags && selectedNote.tags.length > 0 && (
            <div className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-gray-600" />
              {selectedNote.tags.slice(0, 3).map(tag => (
                <span key={tag.id} className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">
                  {tag.title}
                </span>
              ))}
            </div>
          )}

          {/* Fullscreen */}
          <button
            onClick={() => setIsFullscreen(v => !v)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F11)'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDelete}
            className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor / Preview + Attachments */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex overflow-hidden">
          {(viewMode === 'editor' || viewMode === 'split') && (
            <div
              ref={editorRef}
              className={`flex flex-col overflow-hidden ${viewMode === 'split' ? 'w-1/2 border-r border-gray-800' : 'w-full'}`}
              style={{ height: '100%' }}
            />
          )}
          {(viewMode === 'preview' || viewMode === 'split') && (
            <div className={`overflow-y-auto p-6 ${viewMode === 'split' ? 'w-1/2' : 'w-full'} bg-gray-950`}>
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {localBody || selectedNote.body}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>

        {/* Attachments sidebar */}
        {showAttachments && (
          <AttachmentsPanel
            noteId={selectedNote.id}
            onClose={() => setShowAttachments(false)}
          />
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-4 px-4 py-1 bg-gray-900 border-t border-gray-800 text-xs text-gray-600">
        <span>{localBody.split('\n').length} lines</span>
        <span>{localBody.length} chars</span>
        <span>{localBody.split(/\s+/).filter(Boolean).length} words</span>
        {isFullscreen && <span className="text-gray-500">F11 / Esc — exit fullscreen</span>}
        {isSaving && <span className="text-blue-500 ml-auto">Saving...</span>}
        {!isSaving && <span className="ml-auto">Updated {new Date(selectedNote.updated_time).toLocaleString()}</span>}
      </div>

      {/* Modals */}
      {showVersionHistory && <VersionHistory onClose={() => setShowVersionHistory(false)} />}
      {showTemplates && (
        <NoteTemplates onSelect={handleTemplateSelect} onClose={() => setShowTemplates(false)} />
      )}
    </div>
  );
}
