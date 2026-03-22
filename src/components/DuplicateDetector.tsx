import { useState } from 'react';
import { Copy, Trash2, Loader2, AlertTriangle, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useAggregatorStore } from '../store/aggregator';
import { findByHash, findByTitle, findByAI, deduplicateGroups } from '../services/deduplication';
import type { DuplicateGroup, DuplicateMethod, AggregatedNote } from '../types';

const METHOD_LABELS: Record<DuplicateMethod, string> = {
  hash: 'Exact copy',
  title: 'Similar title',
  ai: 'AI detected',
};

const METHOD_COLORS: Record<DuplicateMethod, string> = {
  hash: 'text-red-400 bg-red-900/30',
  title: 'text-yellow-400 bg-yellow-900/30',
  ai: 'text-purple-400 bg-purple-900/30',
};

export function DuplicateDetector() {
  const { aggregatedNotes, settings, deleteNoteFromAggregated } = useAggregatorStore();
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [methods, setMethods] = useState<DuplicateMethod[]>(['hash', 'title']);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  const scan = async () => {
    if (aggregatedNotes.length === 0) return;
    setIsScanning(true);
    setGroups([]);
    setProgress(null);
    setResolved(new Set());

    const allGroups: DuplicateGroup[] = [];

    if (methods.includes('hash')) {
      allGroups.push(...findByHash(aggregatedNotes));
    }
    if (methods.includes('title')) {
      allGroups.push(...findByTitle(aggregatedNotes));
    }
    if (methods.includes('ai')) {
      setProgress({ done: 0, total: aggregatedNotes.length });
      const aiGroups = await findByAI(aggregatedNotes, settings.ai, (done, total) => {
        setProgress({ done, total });
      });
      allGroups.push(...aiGroups);
    }

    setGroups(deduplicateGroups(allGroups));
    setProgress(null);
    setIsScanning(false);
  };

  const toggleMethod = (m: DuplicateMethod) => {
    setMethods(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const handleKeep = (group: DuplicateGroup, keepNote: AggregatedNote) => {
    const toDelete = group.notes.filter(n =>
      !(n.id === keepNote.id && n.instanceId === keepNote.instanceId)
    );
    for (const n of toDelete) {
      deleteNoteFromAggregated(n.instanceId, n.id);
    }
    setResolved(r => new Set([...r, group.id]));
  };

  const handleDeleteAll = (group: DuplicateGroup) => {
    for (const n of group.notes) {
      deleteNoteFromAggregated(n.instanceId, n.id);
    }
    setResolved(r => new Set([...r, group.id]));
  };

  const activeGroups = groups.filter(g => !resolved.has(g.id));

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      {/* Controls */}
      <div className="shrink-0 p-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Copy className="w-4 h-4 text-yellow-400" />
            Duplicate Detector
          </h3>
          {groups.length > 0 && (
            <span className="text-xs text-gray-400">
              {activeGroups.length} groups · {resolved.size} resolved
            </span>
          )}
        </div>

        {/* Method toggles */}
        <div className="flex gap-2 flex-wrap">
          {(['hash', 'title', 'ai'] as DuplicateMethod[]).map(m => (
            <button
              key={m}
              onClick={() => toggleMethod(m)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                methods.includes(m)
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {m === 'hash' ? 'Hash match' : m === 'title' ? 'Title match' : 'AI analysis'}
            </button>
          ))}
        </div>

        <button
          onClick={scan}
          disabled={isScanning || aggregatedNotes.length === 0 || methods.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2 bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          {isScanning ? 'Scanning...' : `Scan ${aggregatedNotes.length} notes`}
        </button>

        {progress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>AI analyzing...</span>
              <span>{progress.done}/{progress.total}</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${(progress.done / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!isScanning && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Copy className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No scan run yet</p>
            <p className="text-xs mt-1">Select methods and click Scan</p>
          </div>
        )}

        {activeGroups.length === 0 && groups.length > 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <CheckCircle className="w-8 h-8 mb-2 text-green-500 opacity-70" />
            <p className="text-sm text-green-400">All duplicates resolved!</p>
          </div>
        )}

        {activeGroups.map(group => (
          <DuplicateGroupCard
            key={group.id}
            group={group}
            expanded={expandedGroup === group.id}
            onToggle={() => setExpandedGroup(v => v === group.id ? null : group.id)}
            onKeep={note => handleKeep(group, note)}
            onDeleteAll={() => handleDeleteAll(group)}
          />
        ))}
      </div>
    </div>
  );
}

function DuplicateGroupCard({
  group,
  expanded,
  onToggle,
  onKeep,
  onDeleteAll,
}: {
  group: DuplicateGroup;
  expanded: boolean;
  onToggle: () => void;
  onKeep: (note: AggregatedNote) => void;
  onDeleteAll: () => void;
}) {
  return (
    <div className="border-b border-gray-800">
      <div
        className="flex items-start gap-2 p-3 cursor-pointer hover:bg-gray-900"
        onClick={onToggle}
      >
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${METHOD_COLORS[group.method]}`}>
          {METHOD_LABELS[group.method]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{group.notes[0].title}</p>
          <p className="text-xs text-gray-400 mt-0.5">{group.notes.length} duplicates</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 mt-0.5" /> : <ChevronDown className="w-4 h-4 text-gray-400 mt-0.5" />}
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {group.notes.map(note => (
            <div key={`${note.instanceId}:${note.id}`} className="p-2.5 bg-gray-800 rounded-lg">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{note.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{note.instanceName}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {note.body.substring(0, 120)}
                  </p>
                </div>
                <button
                  onClick={() => onKeep(note)}
                  className="shrink-0 px-2.5 py-1 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"
                >
                  Keep
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={onDeleteAll}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-red-900/40 hover:bg-red-900/60 border border-red-800 rounded-lg text-xs text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete all in group
          </button>
        </div>
      )}
    </div>
  );
}
