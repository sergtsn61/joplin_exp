import { useState, useEffect } from 'react';
import { Paperclip, Download, Image, FileText, Film, Music, Archive, X, Loader2 } from 'lucide-react';
import { joplinService } from '../services/joplin';
import type { JoplinResource } from '../types';

interface AttachmentsPanelProps {
  noteId: string;
  onClose: () => void;
}

function getMimeIcon(mime: string) {
  if (mime.startsWith('image/')) return Image;
  if (mime.startsWith('video/')) return Film;
  if (mime.startsWith('audio/')) return Music;
  if (mime.includes('zip') || mime.includes('archive')) return Archive;
  return FileText;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentsPanel({ noteId, onClose }: AttachmentsPanelProps) {
  const [resources, setResources] = useState<JoplinResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string>('');

  useEffect(() => {
    setLoading(true);
    joplinService.getNoteResources(noteId)
      .then(res => { setResources(res); setLoading(false); })
      .catch(() => setLoading(false));
  }, [noteId]);

  const handlePreview = (res: JoplinResource) => {
    const url = joplinService.getResourceUrl(res.id);
    setPreviewUrl(url);
    setPreviewMime(res.mime);
  };

  const handleDownload = (res: JoplinResource) => {
    const url = joplinService.getResourceUrl(res.id);
    const a = document.createElement('a');
    a.href = url;
    a.download = res.title || `resource.${res.file_extension}`;
    a.click();
  };

  return (
    <div className="w-64 shrink-0 border-l border-gray-800 bg-gray-900 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-gray-400" />
          Attachments
          {resources.length > 0 && (
            <span className="text-xs bg-gray-700 px-1.5 py-0.5 rounded-full">{resources.length}</span>
          )}
        </h3>
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-white rounded">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preview area */}
      {previewUrl && (
        <div className="relative border-b border-gray-800 bg-gray-950">
          {previewMime.startsWith('image/') ? (
            <img src={previewUrl} alt="" className="w-full max-h-48 object-contain" />
          ) : previewMime.startsWith('video/') ? (
            <video src={previewUrl} controls className="w-full max-h-48" />
          ) : previewMime.startsWith('audio/') ? (
            <audio src={previewUrl} controls className="w-full p-2" />
          ) : (
            <div className="p-4 text-center text-gray-500 text-xs">No preview available</div>
          )}
          <button
            onClick={() => setPreviewUrl(null)}
            className="absolute top-1 right-1 p-1 bg-black/50 rounded text-white hover:bg-black/70"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-20 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
        {!loading && resources.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-xs">No attachments</div>
        )}
        {resources.map(res => {
          const Icon = getMimeIcon(res.mime);
          const isPreviewable = res.mime.startsWith('image/') || res.mime.startsWith('video/') || res.mime.startsWith('audio/');
          return (
            <div key={res.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 border-b border-gray-800/50">
              <Icon className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs truncate text-gray-200">{res.title || `${res.file_extension} file`}</p>
                <p className="text-xs text-gray-500">{formatSize(res.size)}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                {isPreviewable && (
                  <button
                    onClick={() => handlePreview(res)}
                    className="p-1 text-gray-500 hover:text-blue-400 rounded"
                    title="Preview"
                  >
                    <Image className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDownload(res)}
                  className="p-1 text-gray-500 hover:text-green-400 rounded"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
