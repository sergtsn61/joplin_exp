import { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store';
import type { AIProvider, AIModel } from '../types';
import { aiService } from '../services/ai';
import {
  X,
  Server,
  Bot,
  Sliders,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Upload,
  Download,
} from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

const PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: 'ollama', label: 'Ollama (Local)' },
  { id: 'anthropic', label: 'Anthropic Claude' },
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'openrouter', label: 'OpenRouter' },
];

// Anthropic caps temperature at 1; all others allow up to 2
const TEMPERATURE_MAX: Record<AIProvider, number> = {
  anthropic: 1,
  openai: 2,
  ollama: 2,
  gemini: 2,
  openrouter: 2,
};

function parsePort(value: string): number {
  const p = parseInt(value, 10);
  return isNaN(p) || p < 1 || p > 65535 ? 41184 : p;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings, connect } = useStore();
  const [tab, setTab] = useState<'joplin' | 'ai' | 'editor'>('ai');

  // Joplin settings
  const [host, setHost] = useState(settings.joplin.host);
  const [port, setPort] = useState(settings.joplin.port.toString());
  const [token, setToken] = useState(settings.joplin.token);

  // AI settings
  const [provider, setProvider] = useState<AIProvider>(settings.ai.provider);
  const [model, setModel] = useState(settings.ai.model);
  const [apiKey, setApiKey] = useState(settings.ai.apiKey || '');
  const [ollamaHost, setOllamaHost] = useState(settings.ai.ollamaHost || 'http://localhost:11434');
  const [ollamaNumCtx, setOllamaNumCtx] = useState(settings.ai.ollamaNumCtx ?? 32768);
  const [temperature, setTemperature] = useState(settings.ai.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(settings.ai.maxTokens ?? 2048);
  const [ollamaModels, setOllamaModels] = useState<AIModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Editor settings
  const [fontSize, setFontSize] = useState(settings.editor.fontSize);
  const [wordWrap, setWordWrap] = useState(settings.editor.wordWrap);

  // Import error
  const [importError, setImportError] = useState('');

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const presetModels = aiService.getPresetModels();
  const tempMax = TEMPERATURE_MAX[provider];

  const loadOllamaModels = useCallback(async () => {
    setLoadingModels(true);
    const models = await aiService.getOllamaModels(ollamaHost);
    setOllamaModels(models);
    setLoadingModels(false);
    if (models.length > 0 && (!model || !models.find(m => m.id === model))) {
      setModel(models[0].id);
    }
  }, [ollamaHost, model]);

  useEffect(() => {
    if (provider === 'ollama') loadOllamaModels();
  }, [provider]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => {
    updateSettings({
      joplin: { host, port: parsePort(port), token },
      ai: {
        provider,
        model,
        apiKey: apiKey || undefined,
        ollamaHost: provider === 'ollama' ? ollamaHost : undefined,
        ollamaNumCtx: provider === 'ollama' ? ollamaNumCtx : undefined,
        temperature: Math.min(temperature, tempMax),
        maxTokens,
      },
      editor: { ...settings.editor, fontSize, wordWrap },
    });
    onClose();
  };

  const handleReconnect = async () => {
    const parsed = parsePort(port);
    updateSettings({ joplin: { host, port: parsed, token } });
    await connect({ host, port: parsed, token });
    onClose();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'joplin-ai-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so same file can be re-imported
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const result = ev.target?.result;
        if (typeof result !== 'string') throw new Error('Failed to read file');
        const parsed = JSON.parse(result);
        updateSettings(parsed);
      } catch {
        setImportError('Invalid settings file');
      }
    };
    reader.readAsText(file);
  };

  const availableModels = provider === 'ollama' ? ollamaModels : presetModels[provider] || [];

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="text-base font-semibold text-white">Settings</h2>
          <button onClick={onClose} className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-5">
          {([
            { id: 'joplin', label: 'Joplin', icon: Server },
            { id: 'ai', label: 'AI', icon: Bot },
            { id: 'editor', label: 'Editor', icon: Sliders },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm border-b-2 transition-colors ${
                tab === id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Joplin */}
          {tab === 'joplin' && (
            <>
              <Field label="Host">
                <input value={host} onChange={e => setHost(e.target.value)}
                  className="input" placeholder="localhost" />
              </Field>
              <Field label="Port">
                <input type="number" value={port} onChange={e => setPort(e.target.value)}
                  className="input" placeholder="41184" min={1} max={65535} />
              </Field>
              <Field label="API Token">
                <input type="password" value={token} onChange={e => setToken(e.target.value)}
                  className="input font-mono" placeholder="Your Web Clipper token" />
              </Field>
              <button
                onClick={handleReconnect}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reconnect
              </button>
            </>
          )}

          {/* AI */}
          {tab === 'ai' && (
            <>
              {/* — Connection — */}
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connection</p>

              <Field label="Provider">
                <select value={provider} onChange={e => { setProvider(e.target.value as AIProvider); setModel(''); }}
                  className="input">
                  {PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              </Field>

              {provider === 'ollama' && (
                <>
                  <Field label="Ollama Host">
                    <div className="flex gap-2">
                      <input value={ollamaHost} onChange={e => setOllamaHost(e.target.value)}
                        className="input flex-1" placeholder="http://localhost:11434" />
                      <button onClick={loadOllamaModels} disabled={loadingModels}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors">
                        <RefreshCw className={`w-4 h-4 ${loadingModels ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {ollamaModels.length > 0 && (
                      <p className="text-xs text-green-400 flex items-center gap-1 mt-1">
                        <CheckCircle className="w-3 h-3" />
                        {ollamaModels.length} models found
                      </p>
                    )}
                    {!loadingModels && ollamaModels.length === 0 && (
                      <p className="text-xs text-yellow-500 flex items-center gap-1 mt-1">
                        <AlertCircle className="w-3 h-3" />
                        No models found. Is Ollama running?
                      </p>
                    )}
                  </Field>
                  <Field label="num_ctx (Context Window)">
                    <input
                      type="number"
                      value={ollamaNumCtx}
                      onChange={e => setOllamaNumCtx(parseInt(e.target.value, 10) || 32768)}
                      className="input"
                      placeholder="32768"
                      min={2048}
                      max={1048576}
                      step={1024}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Токенов контекста Ollama. Для Qwen3 — 32768, 65536 или 131072.
                      Нужна VRAM: ~2 GB на каждые 32k токенов.
                    </p>
                  </Field>
                </>
              )}

              {provider !== 'ollama' && (
                <Field label="API Key">
                  <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                    className="input font-mono" placeholder={
                      provider === 'gemini' ? 'AIza... (Google AI Studio)' : `${provider} API key`
                    } />
                  {provider === 'gemini' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Получить ключ: <span className="text-blue-400">aistudio.google.com</span>
                    </p>
                  )}
                </Field>
              )}

              {/* — Model — */}
              <div className="border-t border-gray-800 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Model</p>
                <Field label="Model">
                  {availableModels.length > 0 ? (
                    <select value={model} onChange={e => setModel(e.target.value)} className="input">
                      {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  ) : (
                    <input value={model} onChange={e => setModel(e.target.value)}
                      className="input" placeholder="Model name or ID" />
                  )}
                </Field>
              </div>

              {/* — Generation — */}
              <div className="border-t border-gray-800 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Generation</p>
                <div className="space-y-4">
                  <Field label={`Temperature: ${temperature}`}>
                    <input type="range" min="0" max={tempMax} step="0.1" value={temperature}
                      onChange={e => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-blue-500" />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>Focused (0)</span>
                      <span>Creative ({tempMax})</span>
                    </div>
                  </Field>

                  <Field label={`Max Tokens: ${maxTokens}`}>
                    <input type="range" min="256" max="8192" step="256" value={maxTokens}
                      onChange={e => setMaxTokens(parseInt(e.target.value, 10))}
                      className="w-full accent-blue-500" />
                    <div className="flex justify-between text-xs text-gray-600 mt-1">
                      <span>256</span>
                      <span>8192</span>
                    </div>
                  </Field>
                </div>
              </div>
            </>
          )}

          {/* Editor */}
          {tab === 'editor' && (
            <>
              <Field label={`Font Size: ${fontSize}px`}>
                <input type="range" min="11" max="20" step="1" value={fontSize}
                  onChange={e => setFontSize(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500" />
              </Field>
              <Field label="Word Wrap">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={wordWrap}
                    onClick={() => setWordWrap(v => !v)}
                    className={`w-10 h-5 rounded-full transition-colors relative focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${wordWrap ? 'bg-blue-600' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${wordWrap ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-sm text-gray-300">{wordWrap ? 'Enabled' : 'Disabled'}</span>
                </div>
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-gray-800">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            title="Export settings to JSON"
          >
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <label
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-gray-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            title="Import settings from JSON"
          >
            <Upload className="w-3.5 h-3.5" /> Import
            <input type="file" accept=".json" className="hidden" onChange={handleImport} />
          </label>
          {importError && (
            <p className="w-full text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {importError}
            </p>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Save Settings
          </button>
        </div>
      </div>

      <style>{`.input { width: 100%; background: rgb(31 41 55); color: white; border-radius: 8px; padding: 8px 12px; font-size: 14px; border: 1px solid rgb(55 65 81); outline: none; } .input:focus { border-color: rgb(59 130 246); box-shadow: 0 0 0 1px rgb(59 130 246 / 0.5); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
