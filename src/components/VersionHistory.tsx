import { useState, useEffect, useRef } from 'react';
import { History, X, RotateCcw, ChevronRight, Loader2 } from 'lucide-react';
import { joplinService } from '../services/joplin';
import { useStore } from '../store';
import type { JoplinRevision } from '../types';

interface VersionHistoryProps {
  onClose: () => void;
}

export function VersionHistory({ onClose }: VersionHistoryProps) {
  const { selectedNote, updateNote } = useStore();
  const [revisions, setRevisions] = useState<JoplinRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRev, setSelectedRev] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ title: string; body: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!selectedNote) return;
    setLoading(true);
    joplinService.getRevisions(selectedNote.id)
      .then(revs => { setRevisions(revs); setLoading(false); })
      .catch(() => setLoading(false));
  }, [selectedNote?.id]);

  const loadPreview = async (revId: string) => {
    if (!selectedNote) return;
    setSelectedRev(revId);
    setLoadingPreview(true);
    try {
      const data = await joplinService.getRevisionNote(selectedNote.id, revId);
      setPreview(data);
    } catch {
      setPreview({ title: 'Error', body: 'Could not load this revision.' });
    }
    setLoadingPreview(false);
  };

  const restore = async () => {
    if (!selectedNote || !preview) return;
    setRestoring(true);
    await updateNote(selectedNote.id, { title: preview.title, body: preview.body });
    setRestoring(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-3xl mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 className="font-semibold flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            Version History — {selectedNote?.title}
          </h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Revision list */}
          <div className="w-56 shrink-0 border-r border-gray-800 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center h-24 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            {!loading && revisions.length === 0 && (
              <div className="p-4 text-sm text-gray-500 text-center">No revisions found</div>
            )}
            {revisions.map(rev => (
              <button
                key={rev.id}
                onClick={() => loadPreview(rev.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-800 transition-colors border-b border-gray-800/50 ${selectedRev === rev.id ? 'bg-gray-800' : ''}`}
              >
                <div>
                  <p className="text-xs font-medium text-gray-200">
                    {new Date(rev.item_updated_time).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(rev.item_updated_time).toLocaleTimeString()}
                  </p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {loadingPreview && (
              <div className="flex items-center justify-center h-full text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            )}
            {!loadingPreview && !preview && (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Select a revision to preview
              </div>
            )}
            {!loadingPreview && preview && (
              <>
                <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
                  <p className="font-medium text-sm">{preview.title}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                    {preview.body}
                  </pre>
                </div>
                <div className="px-4 py-3 border-t border-gray-800">
                  <button
                    onClick={restore}
                    disabled={restoring}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg text-sm font-medium transition-colors"
                  >
                    {restoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    Restore this version
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
