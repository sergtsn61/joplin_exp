import { useState } from 'react';
import { useStore } from '../store';
import { Link, Server, Key, Zap, AlertCircle, Loader2 } from 'lucide-react';

export function ConnectionSetup() {
  const { settings, connect, isConnecting, connectionError, updateSettings } = useStore();
  const [host, setHost] = useState(settings.joplin.host);
  const [port, setPort] = useState(settings.joplin.port.toString());
  const [token, setToken] = useState(settings.joplin.token);

  const handleConnect = async () => {
    const config = { host, port: parseInt(port), token };
    updateSettings({ joplin: config });
    await connect(config);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4">
            <Link className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Joplin AI Manager</h1>
          <p className="text-gray-400 text-sm">
            Connect to your Joplin instance to manage notes with AI
          </p>
        </div>

        {/* Form */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Server className="inline w-4 h-4 mr-1.5 mb-0.5" />
              Host
            </label>
            <input
              type="text"
              value={host}
              onChange={e => setHost(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="localhost"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Port
            </label>
            <input
              type="number"
              value={port}
              onChange={e => setPort(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="41184"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              <Key className="inline w-4 h-4 mr-1.5 mb-0.5" />
              API Token
            </label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg px-3 py-2.5 text-sm border border-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              placeholder="Your Joplin Web Clipper API token"
            />
            <p className="text-xs text-gray-500 mt-1.5">
              Find it in Joplin → Tools → Options → Web Clipper
            </p>
          </div>

          {connectionError && (
            <div className="flex items-start gap-2 bg-red-950 border border-red-800 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">{connectionError}</p>
            </div>
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting || !token}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg px-4 py-2.5 text-sm transition-colors"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Connect to Joplin
              </>
            )}
          </button>
        </div>

        {/* Help */}
        <div className="mt-4 p-4 bg-gray-900/50 rounded-xl border border-gray-800/50">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-400">Setup:</strong> Open Joplin → Tools → Options → Web Clipper → Enable Web Clipper service. Copy the authorization token above.
          </p>
        </div>
      </div>
    </div>
  );
}
