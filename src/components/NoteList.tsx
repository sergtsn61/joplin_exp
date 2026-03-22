import { useStore } from '../store';
import {
  Clock,
  FileText,
  CheckSquare,
  Check,
  SortAsc,
  SortDesc,
  Loader2,
} from 'lucide-react';
import type { SortField } from '../types';

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return 'Yesterday';
  } else if (days < 7) {
    return d.toLocaleDateString([], { weekday: 'short' });
  } else {
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
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
    setSort,
    openNote,
    getFilteredNotes,
  } = useStore();

  const notes = getFilteredNotes();

  const handleSort = (field: SortField) => {
    if (sort.field === field) {
      setSort({ field, order: sort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      setSort({ field, order: 'desc' });
    }
  };

  const SortIcon = sort.order === 'asc' ? SortAsc : SortDesc;

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
              sort.field === field
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {field === 'title' && 'A-Z'}
            {field === 'updated_time' && 'Updated'}
            {field === 'created_time' && 'Created'}
            {sort.field === field && <SortIcon className="w-3 h-3" />}
          </button>
        ))}
        <div className="ml-auto text-xs text-gray-600">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </div>
      </div>

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
            return (
              <button
                key={note.id}
                onClick={() => openNote(note.id)}
                className={`w-full text-left px-3 py-3 border-b border-gray-800/50 transition-colors ${
                  isSelected
                    ? 'bg-blue-600/15 border-l-2 border-l-blue-500'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="flex items-start gap-2">
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
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
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
