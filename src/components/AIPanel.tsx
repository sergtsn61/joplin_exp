import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send,
  Trash2,
  Bot,
  User,
  Loader2,
  X,
  AlertCircle,
  Copy,
  Check,
  Sparkles,
  MessageSquarePlus,
} from 'lucide-react';

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 text-gray-600 hover:text-gray-400 transition-colors">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export function AIPanel() {
  const {
    chatMessages,
    isAIThinking,
    aiError,
    sendMessage,
    clearChat,
    toggleAIPanel,
    selectedNote,
    settings,
  } = useStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSend = () => {
    if (!input.trim() || isAIThinking) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    'Summarize this note',
    'What are the key points?',
    'Create a todo list from this',
    'Suggest improvements',
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 border-l border-gray-800 w-80 shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-600/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
            <p className="text-xs text-gray-500">
              {settings.ai.provider} · {settings.ai.model.split('/').pop()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearChat}
            className="flex items-center gap-1 px-2 py-1 text-gray-400 hover:text-white hover:bg-purple-700 rounded-lg transition-colors text-xs font-medium"
            title="New chat"
          >
            <MessageSquarePlus className="w-3.5 h-3.5" />
            New chat
          </button>
          <button
            onClick={clearChat}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleAIPanel}
            className="p-1.5 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Context indicator */}
      {selectedNote && (
        <div className="px-3 py-2 bg-blue-950/30 border-b border-gray-800">
          <p className="text-xs text-blue-400">
            📄 Context: <span className="text-blue-300 font-medium">{selectedNote.title}</span>
          </p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="w-10 h-10 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500 mb-4">
              Ask me anything about your notes or ideas
            </p>
            {selectedNote && (
              <div className="w-full space-y-1.5">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); inputRef.current?.focus(); }}
                    className="w-full text-left px-3 py-2 bg-gray-800 hover:bg-gray-750 text-gray-400 hover:text-gray-200 rounded-lg text-xs transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                </div>
              )}
              <div className={`group max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-200 rounded-bl-sm'
              }`}>
                {msg.role === 'assistant' ? (
                  <>
                    <div className="prose prose-invert prose-xs max-w-none text-gray-200">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || '▋'}
                      </ReactMarkdown>
                    </div>
                    <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <CopyButton text={msg.content} />
                    </div>
                  </>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0 mt-1">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                </div>
              )}
            </div>
          ))
        )}

        {isAIThinking && chatMessages.length > 0 && chatMessages[chatMessages.length - 1].role !== 'assistant' && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Thinking...</span>
          </div>
        )}

        {aiError && (
          <div className="flex items-start gap-2 bg-red-950/50 border border-red-800 rounded-lg p-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-300">{aiError}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI... (Enter to send)"
            rows={2}
            className="flex-1 bg-gray-800 text-gray-200 text-sm rounded-xl px-3 py-2 border border-gray-700 focus:border-purple-500 focus:outline-none resize-none placeholder-gray-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isAIThinking}
            className="p-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl transition-colors shrink-0"
          >
            {isAIThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-1.5 text-center">Shift+Enter for new line</p>
      </div>
    </div>
  );
}
