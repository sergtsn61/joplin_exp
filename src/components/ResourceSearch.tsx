import { useState } from 'react';
import { Search, Image, FileText, Film, Music, Archive, Download, Loader2, X } from 'lucide-react';
import { joplinService } from '../services/joplin';
import type { JoplinResource } from '../types';

function getMimeIcon(mime: string) {
  if (mime.startsWith('image/')) return Image;
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('audio/')) return Music;
  if (mime.includes('zip') || mime.includes('archive')) return Archive;
  return FileText;
}

function formatSize(bytes: number | undefined | null): string {
  if (!bytes || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDisplayName(res: JoplinResource): string {
  if (res.title) return res.title;
  if (res.file_extension) return `file.${res.file_extension}`;
  return 'Untitled';
}

interface Preview { url: string; mime: string }

export function ResourceSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JoplinResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setResults([]);
    setPreview(null);
    setLastQuery(q);
    try {
      const res = await joplinService.searchResources(q);
      setResults(res);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 p-6">
      <h1 className="text-xl font-bold mb-6 flex items-center gap-2">
        <Search className="w-5 h-5 text-blue-400" />
        Search Attachments
      </h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by filename, extension..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-xl focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-xl text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </form>

      {/* Preview */}
      {preview && (
        <div className="mb-4 bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
          <div className="flex justify-end p-1">
            <button
              onClick={() => setPreview(null)}
              className="p-1 text-gray-500 hover:text-gray-300 rounded transition-colors"
              title="Close preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {preview.mime.startsWith('image/') ? (
            <img src={preview.url} alt="" className="max-h-48 mx-auto object-contain px-2 pb-2" />
          ) : preview.mime.startsWith('video/') ? (
            <video src={preview.url} controls className="w-full max-h-48" />
          ) : preview.mime.startsWith('audio/') ? (
            <audio src={preview.url} controls className="w-full p-3" />
          ) : null}
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Searching...
          </div>
        )}
        {!loading && lastQuery !== null && results.length === 0 && (
          <div className="text-center text-gray-500 py-12">No attachments found for "{lastQuery}"</div>
        )}
        {!loading && lastQuery === null && (
          <div className="text-center text-gray-600 py-12 text-sm">Enter a search term to find attachments</div>
        )}
        {!loading && results.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-gray-500 mb-3">{results.length} result{results.length !== 1 ? 's' : ''}</p>
            {results.map(res => {
              const Icon = getMimeIcon(res.mime);
              const isPreviewable = res.mime.startsWith('image/') || res.mime.startsWith('video/') || res.mime.startsWith('audio/');
              const url = joplinService.getResourceUrl(res.id);
              return (
                <div
                  key={res.id}
                  className="flex items-center gap-3 px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-600 transition-colors"
                >
                  <Icon className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{getDisplayName(res)}</p>
                    <p className="text-xs text-gray-500">{res.mime} · {formatSize(res.size)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {isPreviewable && (
                      <button
                        onClick={() => setPreview({ url, mime: res.mime })}
                        className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                      >
                        Preview
                      </button>
                    )}
                    <a
                      href={url}
                      download={getDisplayName(res)}
                      className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
