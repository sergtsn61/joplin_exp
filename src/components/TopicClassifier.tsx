import { useState, useMemo } from 'react';
import { Tag, Loader2, ChevronDown, ChevronUp, Edit2, Check } from 'lucide-react';
import { useAggregatorStore } from '../store/aggregator';
import { classifyNotes, groupByTopics, reclassifyNote } from '../services/classifier';
import type { NoteTopicMap, TopicGroup } from '../types';

export function TopicClassifier() {
  const { aggregatedNotes, settings } = useAggregatorStore();
  const [topicMaps, setTopicMaps] = useState<NoteTopicMap[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const topicGroups: TopicGroup[] = useMemo(
    () => groupByTopics(aggregatedNotes, topicMaps),
    [aggregatedNotes, topicMaps]
  );

  const classify = async () => {
    if (aggregatedNotes.length === 0) return;
    setIsClassifying(true);
    setProgress({ done: 0, total: aggregatedNotes.length });

    const maps = await classifyNotes(aggregatedNotes, settings.ai, (done, total) => {
      setProgress({ done, total });
    });

    setTopicMaps(maps);
    setProgress(null);
    setIsClassifying(false);
  };

  const handleReclassify = (noteId: string, instanceId: string) => {
    const newTopic = editValue.trim();
    if (!newTopic) return;
    setTopicMaps(prev => reclassifyNote(noteId, instanceId, newTopic, prev));
    setEditingNote(null);
    setEditValue('');
  };

  const startEdit = (noteId: string, instanceId: string, currentTopic: string) => {
    setEditingNote(`${instanceId}:${noteId}`);
    setEditValue(currentTopic);
  };

  const allTopics = topicGroups.map(g => g.topic);

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      {/* Controls */}
      <div className="shrink-0 p-4 border-b border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" />
            Topic Classifier
          </h3>
          {topicGroups.length > 0 && (
            <span className="text-xs text-gray-400">
              {topicGroups.length} topics · {aggregatedNotes.length} notes
            </span>
          )}
        </div>

        <button
          onClick={classify}
          disabled={isClassifying || aggregatedNotes.length === 0}
          className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
        >
          {isClassifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
          {isClassifying ? 'Classifying...' : `Classify ${aggregatedNotes.length} notes with AI`}
        </button>

        {progress && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Analyzing notes...</span>
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

      {/* Topic groups */}
      <div className="flex-1 overflow-y-auto">
        {topicGroups.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <Tag className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No classification yet</p>
            <p className="text-xs mt-1">Aggregate notes first, then classify</p>
          </div>
        )}

        {topicGroups.map(group => (
          <div key={group.topic} className="border-b border-gray-800">
            <div
              className="flex items-center gap-2.5 p-3 cursor-pointer hover:bg-gray-900"
              onClick={() => setExpandedTopic(v => v === group.topic ? null : group.topic)}
            >
              <span className="px-2 py-0.5 bg-purple-900/40 border border-purple-800 rounded-full text-xs text-purple-300 font-medium">
                {group.topic}
              </span>
              <span className="text-xs text-gray-400">{group.notes.length} notes</span>
              <div className="ml-auto">
                {expandedTopic === group.topic
                  ? <ChevronUp className="w-4 h-4 text-gray-400" />
                  : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </div>

            {expandedTopic === group.topic && (
              <div className="px-3 pb-3 space-y-1.5">
                {group.notes.map(note => {
                  const key = `${note.instanceId}:${note.id}`;
                  const isEditing = editingNote === key;
                  return (
                    <div key={key} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{note.title}</p>
                        <p className="text-xs text-gray-400">{note.instanceName}</p>
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            autoFocus
                            className="w-28 px-2 py-0.5 bg-gray-700 border border-gray-500 rounded text-xs focus:outline-none focus:border-purple-500"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleReclassify(note.id, note.instanceId);
                              if (e.key === 'Escape') setEditingNote(null);
                            }}
                            list="topic-suggestions"
                          />
                          <datalist id="topic-suggestions">
                            {allTopics.map(t => <option key={t} value={t} />)}
                          </datalist>
                          <button
                            onClick={() => handleReclassify(note.id, note.instanceId)}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(note.id, note.instanceId, group.topic)}
                          className="shrink-0 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
                          title="Change topic"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
