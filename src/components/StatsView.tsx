import { useMemo } from 'react';
import { useStore } from '../store';
import { FileText, BookOpen, Tag, Hash, TrendingUp, Award, Calendar } from 'lucide-react';

function Bar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{value}</span>
    </div>
  );
}

export function StatsView() {
  const { notes, notebooks, tags } = useStore();

  const stats = useMemo(() => {
    const wordCount = (body: string | null | undefined) => (body ?? '').split(/\s+/).filter(Boolean).length;

    const totalWords = notes.reduce((sum, n) => sum + wordCount(n.body), 0);
    const totalChars = notes.reduce((sum, n) => sum + (n.body ?? '').length, 0);
    const avgWords = notes.length > 0 ? Math.round(totalWords / notes.length) : 0;
    const todos = notes.filter(n => n.is_todo === 1);
    const doneTodos = todos.filter(n => n.todo_completed);

    // Notes per notebook
    const notebookMap: Record<string, { id: string; name: string; count: number }> = {};
    for (const nb of notebooks) notebookMap[nb.id] = { id: nb.id, name: nb.title, count: 0 };
    for (const n of notes) {
      if (n.parent_id && notebookMap[n.parent_id]) notebookMap[n.parent_id].count++;
    }
    const notebookStats = Object.values(notebookMap)
      .filter(x => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Largest notes — sort by body length, pre-compute word counts
    const largest = [...notes]
      .sort((a, b) => (b.body ?? '').length - (a.body ?? '').length)
      .slice(0, 5)
      .map(n => ({ ...n, _words: wordCount(n.body) }));
    const largestMaxWords = largest[0]?._words ?? 1;

    // Activity last 30 days (notes updated)
    const now = Date.now();
    const days30 = 30 * 24 * 3600 * 1000;
    const activityMap: Record<string, number> = {};
    for (const n of notes) {
      if (now - n.updated_time < days30) {
        const day = new Date(n.updated_time).toLocaleDateString('en-CA');
        activityMap[day] = (activityMap[day] || 0) + 1;
      }
    }
    const activityDays = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now - (29 - i) * 24 * 3600 * 1000);
      const key = d.toLocaleDateString('en-CA');
      return { day: key, count: activityMap[key] || 0 };
    });
    const maxActivity = Math.max(...activityDays.map(d => d.count), 1);

    // Tag usage: count all tags first, then take top 8
    const tagStats = tags
      .map(t => ({
        name: t.title,
        count: notes.filter(n => n.tags?.some(nt => nt.id === t.id)).length,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    return { totalWords, totalChars, avgWords, todos, doneTodos, notebookStats, largest, largestMaxWords, activityDays, maxActivity, tagStats };
  }, [notes, notebooks, tags]);

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-6">
      <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-blue-400" />
        Collection Statistics
      </h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {[
          { icon: FileText, label: 'Total Notes', value: notes.length, color: 'text-blue-400' },
          { icon: BookOpen, label: 'Notebooks', value: notebooks.length, color: 'text-green-400' },
          { icon: Tag, label: 'Tags', value: tags.length, color: 'text-purple-400' },
          { icon: Hash, label: 'Total Words', value: stats.totalWords.toLocaleString(), color: 'text-yellow-400' },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Activity calendar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400" /> Activity (last 30 days)
          </h2>
          <div className="flex items-end gap-1 h-20">
            {stats.activityDays.map(d => {
              const h = d.count > 0 ? Math.max(2, Math.round((d.count / stats.maxActivity) * 72)) : 1;
              return (
                <div
                  key={d.day}
                  title={`${d.day}: ${d.count} notes`}
                  className={`flex-1 rounded-sm ${d.count > 0 ? 'bg-blue-500' : 'bg-gray-800'}`}
                  style={{ height: `${h}px` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-600">
            <span>30 days ago</span><span>Today</span>
          </div>
        </div>

        {/* Extra stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-400" /> Highlights
          </h2>
          {[
            { label: 'Avg. words per note', value: stats.avgWords.toLocaleString() },
            { label: 'Total characters', value: stats.totalChars.toLocaleString() },
            { label: 'To-dos total', value: stats.todos.length },
            { label: 'To-dos completed', value: `${stats.doneTodos.length} / ${stats.todos.length}` },
            { label: 'Notes (last 30 days)', value: stats.activityDays.reduce((s, d) => s + d.count, 0) },
          ].map(row => (
            <div key={row.label} className="flex justify-between items-center text-sm">
              <span className="text-gray-400">{row.label}</span>
              <span className="font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes per notebook */}
        {stats.notebookStats.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-green-400" /> Notes per Notebook
            </h2>
            <div className="space-y-2">
              {stats.notebookStats.map(nb => (
                <div key={nb.id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 truncate">{nb.name}</span>
                  </div>
                  <Bar value={nb.count} max={stats.notebookStats[0].count} color="bg-green-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Largest notes */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-400" /> Largest Notes
          </h2>
          <div className="space-y-2">
            {stats.largest.map(n => (
              <div key={n.id}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-300 truncate max-w-[70%]">{n.title || 'Untitled'}</span>
                  <span className="text-gray-500">{n._words} words</span>
                </div>
                <Bar value={n._words} max={stats.largestMaxWords} color="bg-orange-500" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
