import { useState } from 'react';
import { Plus, Trash2, RefreshCw, CheckCircle, XCircle, Loader2, Server } from 'lucide-react';
import { useAggregatorStore } from '../store/aggregator';
import type { JoplinConfig } from '../types';

const emptyConfig: JoplinConfig = { host: 'localhost', port: 41184, token: '' };

export function MultiJoplinManager() {
  const { instances, addInstance, removeInstance, connectInstance, disconnectInstance } = useAggregatorStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', ...emptyConfig });
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!form.name.trim() || !form.token.trim()) return;
    const id = crypto.randomUUID();
    addInstance({
      id,
      name: form.name.trim(),
      config: { host: form.host, port: Number(form.port), token: form.token },
      isConnected: false,
      isConnecting: false,
      error: null,
    });
    setForm({ name: '', ...emptyConfig });
    setShowForm(false);
    // Auto-connect
    setConnecting(id);
    await connectInstance(id);
    setConnecting(null);
  };

  const handleReconnect = async (id: string) => {
    setConnecting(id);
    await connectInstance(id);
    setConnecting(null);
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400" />
          Joplin Instances
        </h2>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="mb-4 p-4 bg-gray-800 rounded-xl border border-gray-700 space-y-3">
          <p className="text-sm font-medium text-gray-300">New Instance</p>
          <input
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            placeholder="Name (e.g. Work Joplin)"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="Host"
              value={form.host}
              onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
            />
            <input
              className="w-24 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              placeholder="Port"
              type="number"
              value={form.port}
              onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
            />
          </div>
          <input
            className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
            placeholder="API Token"
            value={form.token}
            onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
          />
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!form.name.trim() || !form.token.trim()}
              className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
            >
              Connect
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Instance list */}
      <div className="space-y-2">
        {instances.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Server className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No instances added yet</p>
            <p className="text-xs mt-1">Add a Joplin instance to start aggregating</p>
          </div>
        )}

        {instances.map(inst => (
          <div key={inst.id} className="p-3 bg-gray-800 rounded-xl border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                {inst.isConnected ? (
                  <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                ) : inst.isConnecting || connecting === inst.id ? (
                  <Loader2 className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inst.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {inst.config.host}:{inst.config.port}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleReconnect(inst.id)}
                  disabled={connecting === inst.id}
                  title="Reconnect"
                  className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => { disconnectInstance(inst.id); removeInstance(inst.id); }}
                  title="Remove"
                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {inst.error && (
              <p className="mt-2 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
                {inst.error}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      {instances.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500 flex justify-between">
          <span>{instances.filter(i => i.isConnected).length} connected</span>
          <span>{instances.length} total</span>
        </div>
      )}
    </div>
  );
}
