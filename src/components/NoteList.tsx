import { useState } from 'react';
import { useStore } from '../store';
import {
  Clock,
  FileText,
  CheckSquare,
  Check,
  SortAsc,
  SortDesc,
  Loader2,
  Tag,
  CheckCheck,
  X,
  Sparkles,
  Bot,
} from 'lucide-react';
import type { SortField } from '../types';
import { NotebookCompiler } from './NotebookCompiler';
import { NotebookAgentModal } from './NotebookAgentModal';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function truncate(text: string, max: number): string {
  const clean = text.replace(/[#*`\[\]]/g, '').replace(/\n+/g, ' ').trim();
  return clean.length > max ? clean.substring(0, max) + '…' : clean;
}

export function NoteList() {
  const {
    isLoadingNotes,
    selectedNote,
    sort,
    filter,
    setSort,
    openNote,
    getFilteredNotes,
    tags,
    bulkAddTag,
  } = useStore();

  const notes = getFilteredNotes();

  // Multi-select state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [multiMode, setMultiMode] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showCompiler, setShowCompiler] = useState(false);
  const [showAgent, setShowAgent] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitMultiMode = () => {
    setMultiMode(false);
    setSelected(new Set());
    setShowTagPicker(false);
  };

  const handleBulkTag = async (tagId: string) => {
    await bulkAddTag(Array.from(selected), tagId);
    setShowTagPicker(false);
  };

  const handleSort = (field: SortField) => {
    setSort({ field, order: sort.field === field && sort.order === 'desc' ? 'asc' : 'desc' });
  };

  const SortIcon = sort.order === 'asc' ? SortAsc : SortDesc;

  // Drag & drop
  const handleDragStart = (e: React.DragEvent, noteId: string) => {
    e.dataTransfer.setData('noteId', noteId);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Sort Bar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-800">
        <span className="text-xs text-gray-500 mr-1">Sort:</span>
        {(['title', 'updated_time', 'created_time'] as SortField[]).map((field) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
              sort.field === field ? 'bg-blue-600/20 text-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {field === 'title' && 'A-Z'}
            {field === 'updated_time' && 'Updated'}
            {field === 'created_time' && 'Created'}
            {sort.field === field && <SortIcon className="w-3 h-3" />}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-xs text-gray-600">{notes.length}</span>
          {notes.length > 1 && (filter.notebookId || filter.tagIds.length > 0) && (
            <>
              <button
                onClick={() => setShowAgent(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 hover:text-emerald-300 transition-colors"
                title="AI Agent — обработать каждую заметку"
              >
                <Bot className="w-3 h-3" />
                Agent
              </button>
              <button
                onClick={() => setShowCompiler(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 hover:text-purple-300 transition-colors"
                title="Скомпилировать в документ с помощью AI"
              >
                <Sparkles className="w-3 h-3" />
                AI
              </button>
            </>
          )}
          <button
            onClick={() => { setMultiMode(v => !v); setSelected(new Set()); }}
            className={`p-1 rounded text-xs transition-colors ${multiMode ? 'text-blue-400 bg-blue-600/20' : 'text-gray-600 hover:text-gray-400'}`}
            title="Multi-select"
          >
            <CheckCheck className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {multiMode && selected.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-900/20 border-b border-blue-900/40 shrink-0">
          <span className="text-xs text-blue-300 font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <div className="relative">
            <button
              onClick={() => setShowTagPicker(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-700 hover:bg-blue-600 rounded-lg text-xs transition-colors"
            >
              <Tag className="w-3.5 h-3.5" /> Add Tag
            </button>
            {showTagPicker && (
              <div className="absolute left-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-40 max-h-48 overflow-y-auto">
                {tags.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-500">No tags available</p>
                )}
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleBulkTag(tag.id)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <Tag className="w-3.5 h-3.5 text-gray-500" />
                    {tag.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={exitMultiMode}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AI Compiler modal */}
      {showCompiler && <NotebookCompiler onClose={() => setShowCompiler(false)} />}
      {/* AI Agent modal */}
      {showAgent && <NotebookAgentModal onClose={() => setShowAgent(false)} />}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoadingNotes ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading notes...
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-600">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No notes found</p>
          </div>
        ) : (
          notes.map((note) => {
            const isSelected = selectedNote?.id === note.id;
            const isChecked = selected.has(note.id);

            return (
              <div
                key={note.id}
                draggable
                onDragStart={e => handleDragStart(e, note.id)}
                onClick={() => {
                  if (multiMode) {
                    toggleSelect(note.id);
                  } else {
                    openNote(note.id);
                  }
                }}
                className={`w-full text-left px-3 py-3 border-b border-gray-800/50 transition-colors cursor-pointer select-none ${
                  isChecked
                    ? 'bg-blue-900/20 border-l-2 border-l-blue-400'
                    : isSelected && !multiMode
                    ? 'bg-blue-600/15 border-l-2 border-l-blue-500'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Checkbox in multi-mode */}
                  {multiMode && (
                    <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                      isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-600'
                    }`}>
                      {isChecked && <Check className="w-2.5 h-2.5 text-white" />}
                    </div>
                  )}

                  {!multiMode && (
                    <div className="mt-0.5 shrink-0">
                      {note.is_todo === 1 ? (
                        note.todo_completed ? (
                          <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500/20 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-green-400" />
                          </div>
                        ) : (
                          <CheckSquare className="w-4 h-4 text-yellow-500" />
                        )
                      ) : (
                        <FileText className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm font-medium truncate ${isSelected && !multiMode ? 'text-white' : 'text-gray-200'}`}>
                        {note.title || 'Untitled'}
                      </p>
                      <div className="flex items-center gap-1 shrink-0 text-gray-600">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs">{formatDate(note.updated_time)}</span>
                      </div>
                    </div>
                    {note.body && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {truncate(note.body, 100)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
