import { useState, useMemo } from 'react';
import { BookOpen, Plus, Trash2, Download, Loader2, CheckCircle, FolderOpen, Archive } from 'lucide-react';
import { useAggregatorStore } from '../store/aggregator';
import { groupByTopics } from '../services/classifier';
import { aggregatorService } from '../services/aggregator';
import { marked } from 'marked';
import JSZip from 'jszip';
import type { AggregatedNote, TopicGroup } from '../types';

interface BuildPlan {
  notebookTitle: string;
  topics: string[];
  targetInstanceId: string;
}

export function NotebookBuilder() {
  const { instances, aggregatedNotes, topicMaps } = useAggregatorStore();
  const [plans, setPlans] = useState<BuildPlan[]>([]);
  const [showAddPlan, setShowAddPlan] = useState(false);
  const [newPlan, setNewPlan] = useState<BuildPlan>({
    notebookTitle: '',
    topics: [],
    targetInstanceId: '',
  });
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  const topicGroups: TopicGroup[] = useMemo(
    () => groupByTopics(aggregatedNotes, topicMaps),
    [aggregatedNotes, topicMaps]
  );

  const connectedInstances = instances.filter(i => i.isConnected);

  const addPlan = () => {
    if (!newPlan.notebookTitle.trim() || !newPlan.targetInstanceId || newPlan.topics.length === 0) return;
    setPlans(prev => [...prev, { ...newPlan }]);
    setNewPlan({ notebookTitle: '', topics: [], targetInstanceId: connectedInstances[0]?.id || '' });
    setShowAddPlan(false);
  };

  const removePlan = (idx: number) => setPlans(prev => prev.filter((_, i) => i !== idx));

  const toggleTopic = (topic: string) => {
    setNewPlan(prev => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter(t => t !== topic)
        : [...prev.topics, topic],
    }));
  };

  const getNotesForTopics = (topics: string[]): AggregatedNote[] => {
    const groups = topicGroups.filter(g => topics.includes(g.topic));
    return groups.flatMap(g => g.notes);
  };

  const buildNotebooks = async () => {
    setIsBuilding(true);
    setBuildLog([]);
    setDone(false);

    for (const plan of plans) {
      const notes = getNotesForTopics(plan.topics);
      const log = (msg: string) => setBuildLog(prev => [...prev, msg]);

      log(`Creating notebook "${plan.notebookTitle}"...`);
      try {
        const notebook = await aggregatorService.createNotebookInInstance(
          plan.targetInstanceId,
          plan.notebookTitle
        );
        if (!notebook) throw new Error('Failed to create notebook');

        log(`Copying ${notes.length} notes...`);
        let copied = 0;
        for (const note of notes) {
          try {
            await aggregatorService.copyNoteToInstance(plan.targetInstanceId, note, notebook.id);
            copied++;
          } catch {
            log(`  ⚠ Skipped "${note.title}"`);
          }
        }
        log(`✓ Done: ${copied}/${notes.length} notes copied to "${plan.notebookTitle}"`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        log(`✗ Error: ${msg}`);
      }
    }

    setDone(true);
    setIsBuilding(false);
  };

  const exportToMarkdown = () => {
    for (const plan of plans) {
      const notes = getNotesForTopics(plan.topics);
      const content = notes.map(n =>
        `# ${n.title}\n\n> Source: ${n.instanceName}\n\n${n.body}\n\n---\n`
      ).join('\n');

      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${plan.notebookTitle.replace(/[^a-z0-9]/gi, '_')}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportToZip = async () => {
    const zip = new JSZip();
    for (const plan of plans) {
      const notes = getNotesForTopics(plan.topics);
      const folder = zip.folder(plan.notebookTitle.replace(/[/\\?%*:|"<>]/g, '_')) || zip;
      // Group by topic inside the notebook folder
      for (const topic of plan.topics) {
        const topicNotes = notes.filter(n => {
          const tm = topicMaps.find(m => m.noteId === n.id && m.instanceId === n.instanceId);
          return tm?.topic === topic;
        });
        const topicFolder = folder.folder(topic.replace(/[/\\?%*:|"<>]/g, '_')) || folder;
        for (const note of topicNotes) {
          const safeName = (note.title || 'untitled').replace(/[/\\?%*:|"<>]/g, '_').substring(0, 80);
          const frontmatter = `---\ntitle: "${note.title}"\nsource: ${note.instanceName}\nupdated: ${new Date(note.updated_time).toISOString()}\ntopic: ${topic}\n---\n\n`;
          topicFolder.file(`${safeName}.md`, frontmatter + note.body);
        }
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'joplin-export.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    for (const plan of plans) {
      const notes = getNotesForTopics(plan.topics);
      const html = notes.map(n => {
        const bodyHtml = marked.parse(n.body) as string;
        return `<h1>${n.title}</h1><p style="color:#666;font-size:12px">Source: ${n.instanceName}</p>${bodyHtml}<hr>`;
      }).join('\n');

      const win = window.open('', '_blank');
      if (!win) return;
      win.document.write(`<!DOCTYPE html><html><head>
        <title>${plan.notebookTitle}</title>
        <style>body{font-family:sans-serif;max-width:800px;margin:40px auto;color:#333}h1{color:#111}hr{margin:40px 0;border:none;border-top:1px solid #eee}</style>
      </head><body>${html}</body></html>`);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-green-400" />
            Notebook Builder
          </h3>
          <button
            onClick={() => setShowAddPlan(v => !v)}
            className="flex items-center gap-1 px-2.5 py-1 bg-green-700 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add plan
          </button>
        </div>

        {/* Add plan form */}
        {showAddPlan && (
          <div className="p-3 bg-gray-800 rounded-xl border border-gray-700 space-y-3">
            <input
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-green-500"
              placeholder="Notebook title"
              value={newPlan.notebookTitle}
              onChange={e => setNewPlan(p => ({ ...p, notebookTitle: e.target.value }))}
            />

            <div>
              <p className="text-xs text-gray-400 mb-1.5">Target instance</p>
              <select
                className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm focus:outline-none"
                value={newPlan.targetInstanceId}
                onChange={e => setNewPlan(p => ({ ...p, targetInstanceId: e.target.value }))}
              >
                <option value="">Select instance...</option>
                {connectedInstances.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1.5">Topics to include</p>
              {topicGroups.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No topics — classify notes first</p>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {topicGroups.map(g => (
                    <button
                      key={g.topic}
                      onClick={() => toggleTopic(g.topic)}
                      className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                        newPlan.topics.includes(g.topic)
                          ? 'bg-green-700 border-green-600 text-white'
                          : 'bg-gray-700 border-gray-600 text-gray-300 hover:text-white'
                      }`}
                    >
                      {g.topic} ({g.notes.length})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={addPlan}
                disabled={!newPlan.notebookTitle.trim() || !newPlan.targetInstanceId || newPlan.topics.length === 0}
                className="flex-1 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddPlan(false)}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Plans list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {plans.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FolderOpen className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No build plans</p>
            <p className="text-xs mt-1">Add a plan to start building notebooks</p>
          </div>
        )}

        {plans.map((plan, idx) => {
          const notes = getNotesForTopics(plan.topics);
          const targetName = instances.find(i => i.id === plan.targetInstanceId)?.name || '?';
          return (
            <div key={idx} className="p-3 bg-gray-800 rounded-xl border border-gray-700">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{plan.notebookTitle}</p>
                  <p className="text-xs text-gray-400 mt-0.5">→ {targetName} · {notes.length} notes</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {plan.topics.map(t => (
                      <span key={t} className="px-1.5 py-0.5 bg-green-900/40 border border-green-800 rounded text-xs text-green-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => removePlan(idx)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Build log */}
      {buildLog.length > 0 && (
        <div className="shrink-0 mx-4 mb-2 p-3 bg-gray-900 rounded-xl border border-gray-700 max-h-32 overflow-y-auto">
          {buildLog.map((line, i) => (
            <p key={i} className={`text-xs font-mono ${line.startsWith('✓') ? 'text-green-400' : line.startsWith('✗') ? 'text-red-400' : line.startsWith('  ⚠') ? 'text-yellow-400' : 'text-gray-400'}`}>
              {line}
            </p>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="shrink-0 p-4 pt-0 space-y-2">
        {done && (
          <div className="flex items-center gap-2 text-green-400 text-sm py-1">
            <CheckCircle className="w-4 h-4" /> Build complete
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={buildNotebooks}
            disabled={isBuilding || plans.length === 0 || connectedInstances.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            {isBuilding ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
            {isBuilding ? 'Building...' : 'Build in Joplin'}
          </button>
          <button
            onClick={exportToMarkdown}
            disabled={plans.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm transition-colors"
            title="Export .md"
          >
            <Download className="w-4 h-4" /> .md
          </button>
          <button
            onClick={exportToPDF}
            disabled={plans.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm transition-colors"
            title="Export PDF"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={exportToZip}
            disabled={plans.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-sm transition-colors"
            title="Export ZIP"
          >
            <Archive className="w-4 h-4" /> ZIP
          </button>
        </div>
      </div>
    </div>
  );
}
