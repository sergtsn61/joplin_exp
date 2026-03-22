import { useState } from 'react';
import { useStore } from '../store';
import {
  BookOpen,
  Tag,
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  Inbox,
  CheckSquare,
  Settings,
  LogOut,
} from 'lucide-react';
import type { JoplinNotebook, JoplinTag } from '../types';
import { SettingsModal } from './SettingsModal';

interface NotebookItemProps {
  notebook: JoplinNotebook;
  level: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function NotebookItem({ notebook, level, selectedId, onSelect }: NotebookItemProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = (notebook.children?.length || 0) > 0;
  const isSelected = selectedId === notebook.id;

  return (
    <div>
      <button
        onClick={() => {
          onSelect(isSelected ? '' : notebook.id);
          if (hasChildren) setExpanded(!expanded);
        }}
        className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm text-left transition-colors ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        }`}
        style={{ paddingLeft: `${8 + level * 16}px` }}
      >
        {hasChildren ? (
          expanded ? (
            <ChevronDown className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 shrink-0" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <BookOpen className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{notebook.title}</span>
      </button>
      {hasChildren && expanded && (
        <div>
          {notebook.children!.map(child => (
            <NotebookItem
              key={child.id}
              notebook={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar() {
  const {
    notebooks,
    tags,
    filter,
    setFilter,
    createNote,
    disconnect,
    notes,
    isLoadingNotes,
  } = useStore();

  const [showSettings, setShowSettings] = useState(false);
  const [notebooksExpanded, setNotebooksExpanded] = useState(true);
  const [tagsExpanded, setTagsExpanded] = useState(true);

  const handleNotebookSelect = (id: string) => {
    setFilter({ notebookId: id || null, tagIds: [] });
  };

  const handleTagSelect = (tagId: string) => {
    const tagIds = filter.tagIds.includes(tagId)
      ? filter.tagIds.filter(t => t !== tagId)
      : [tagId];
    setFilter({ tagIds, notebookId: null });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={filter.search}
              onChange={e => setFilter({ search: e.target.value })}
              placeholder="Search notes..."
              className="w-full bg-gray-800 text-gray-200 text-sm rounded-lg pl-8 pr-3 py-1.5 border border-gray-700 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => createNote()}
            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            title="New note"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {/* All notes */}
        <button
          onClick={() => setFilter({ notebookId: null, tagIds: [], showTodos: null })}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !filter.notebookId && filter.tagIds.length === 0 && filter.showTodos === null
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>All Notes</span>
          {!isLoadingNotes && (
            <span className="ml-auto text-xs opacity-60">{notes.length}</span>
          )}
        </button>

        {/* Todos */}
        <button
          onClick={() => setFilter({ showTodos: filter.showTodos === true ? null : true, notebookId: null, tagIds: [] })}
          className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            filter.showTodos === true
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>To-dos</span>
        </button>

        {/* Notebooks */}
        <div className="pt-1">
          <button
            onClick={() => setNotebooksExpanded(!notebooksExpanded)}
            className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
          >
            {notebooksExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Notebooks
          </button>
          {notebooksExpanded && (
            <div className="mt-1 space-y-0.5">
              {notebooks.map(nb => (
                <NotebookItem
                  key={nb.id}
                  notebook={nb}
                  level={0}
                  selectedId={filter.notebookId}
                  onSelect={handleNotebookSelect}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="pt-1">
            <button
              onClick={() => setTagsExpanded(!tagsExpanded)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-400 transition-colors"
            >
              {tagsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              Tags
            </button>
            {tagsExpanded && (
              <div className="mt-1 flex flex-wrap gap-1 px-2">
                {tags.map((tag: JoplinTag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleTagSelect(tag.id)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                      filter.tagIds.includes(tag.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                    }`}
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-gray-800 flex gap-1">
        <button
          onClick={() => setShowSettings(true)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg text-sm transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        <button
          onClick={disconnect}
          className="p-2 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
