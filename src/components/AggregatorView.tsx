import { useState, useMemo } from 'react';
import { RefreshCw, Search, ChevronDown, ChevronUp, FileText, Calendar, Server } from 'lucide-react';
import { useAggregatorStore } from '../store/aggregator';
import type { AggregatedNote, SortField } from '../types';

const INSTANCE_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-yellow-500', 'bg-red-500',
];

export function AggregatorView() {
  const { instances, aggregatedNotes, isAggregating, aggregate } = useAggregatorStore();
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('updated_time');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterInstance, setFilterInstance] = useState<string>('all');
  const [expandedNote, setExpandedNote] = useState<string | null>(null);

  const instanceColorMap = useMemo(() => {
    const map = new Map<string, string>();
    instances.forEach((inst, i) => map.set(inst.id, INSTANCE_COLORS[i % INSTANCE_COLORS.length]));
    return map;
  }, [instances]);

  const filtered = useMemo(() => {
    let notes = [...aggregatedNotes];
    if (filterInstance !== 'all') {
      notes = notes.filter(n => n.instanceId === filterInstance);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      notes = notes.filter(n =>
        (n.title ?? '').toLowerCase().includes(q) || (n.body ?? '').toLowerCase().includes(q)
      );
    }
    notes.sort((a, b) => {
      const va = a[sortField] as string | number || '';
      const vb = b[sortField] as string | number || '';
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    return notes;
  }, [aggregatedNotes, search, sortField, sortAsc, filterInstance]);

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(v => !v);
    else { setSortField(field); setSortAsc(false); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 p-3 border-b border-gray-800 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="Search all notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={aggregate}
            disabled={isAggregating || instances.filter(i => i.isConnected).length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isAggregating ? 'animate-spin' : ''}`} />
            {isAggregating ? 'Loading...' : 'Aggregate'}
          </button>
        </div>

        {/* Filters row */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-xs focus:outline-none"
            value={filterInstance}
            onChange={e => setFilterInstance(e.target.value)}
          >
            <option value="all">All instances</option>
            {instances.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>Sort:</span>
            {(['title', 'updated_time', 'created_time'] as SortField[]).map(f => (
              <button
                key={f}
                onClick={() => handleSort(f)}
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded transition-colors ${
                  sortField === f ? 'bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {f === 'title' ? 'Title' : f === 'updated_time' ? 'Updated' : 'Created'}
                <SortIcon field={f} />
              </button>
            ))}
          </div>

          <span className="ml-auto text-xs text-gray-500">{filtered.length} notes</span>
        </div>
      </div>

      {/* Note list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="w-10 h-10 mb-3 opacity-30" />
            {aggregatedNotes.length === 0 ? (
              <>
                <p className="text-sm">No notes aggregated yet</p>
                <p className="text-xs mt-1">Connect instances and click Aggregate</p>
              </>
            ) : (
              <p className="text-sm">No notes match the filter</p>
            )}
          </div>
        )}

        {filtered.map(note => (
          <NoteRow
            key={`${note.instanceId}:${note.id}`}
            note={note}
            color={instanceColorMap.get(note.instanceId) || 'bg-gray-500'}
            expanded={expandedNote === `${note.instanceId}:${note.id}`}
            onToggle={() => setExpandedNote(v =>
              v === `${note.instanceId}:${note.id}` ? null : `${note.instanceId}:${note.id}`
            )}
          />
        ))}
      </div>
    </div>
  );
}

function NoteRow({
  note,
  color,
  expanded,
  onToggle,
}: {
  note: AggregatedNote;
  color: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const updated = new Date(note.updated_time).toLocaleDateString();

  return (
    <div
      className={`border-b border-gray-800 cursor-pointer hover:bg-gray-900 transition-colors ${expanded ? 'bg-gray-900' : ''}`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2.5 p-3">
        <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${color}`} title={note.instanceName} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{note.title || '(Untitled)'}</p>
          {!expanded && (
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {(note.body ?? '').replace(/[#*`>\-]/g, '').trim().substring(0, 100)}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Server className="w-3 h-3" /> {note.instanceName}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {updated}
            </span>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3">
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans bg-gray-800 rounded-lg p-3 max-h-60 overflow-y-auto">
            {note.body || '(empty)'}
          </pre>
        </div>
      )}
    </div>
  );
}
