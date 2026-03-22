import { useState } from 'react';
import { useStore } from '../store';
import { Sparkles, FileText, Wand2, Tags, Languages, Loader2 } from 'lucide-react';

const LANGUAGES = ['Russian', 'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese', 'Italian', 'Portuguese'];

export function AIQuickActions() {
  const { runAIAction, isAIThinking, selectedNote, toggleAIPanel } = useStore();
  const [open, setOpen] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);

  if (!selectedNote) return null;

  const actions = [
    {
      id: 'summarize',
      label: 'Summarize',
      icon: FileText,
      action: () => { runAIAction('summarize'); setOpen(false); toggleAIPanel(); },
    },
    {
      id: 'improve',
      label: 'Improve Writing',
      icon: Wand2,
      action: () => { runAIAction('improve'); setOpen(false); toggleAIPanel(); },
    },
    {
      id: 'tags',
      label: 'Suggest Tags',
      icon: Tags,
      action: () => { runAIAction('tags'); setOpen(false); toggleAIPanel(); },
    },
    {
      id: 'translate',
      label: 'Translate',
      icon: Languages,
      action: () => setShowLangPicker(true),
    },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isAIThinking}
        className="flex items-center gap-1 px-2 py-1.5 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 rounded-lg transition-colors"
        title="AI Actions"
      >
        {isAIThinking ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
        <span className="hidden sm:inline">AI</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setShowLangPicker(false); }} />
          <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 py-1.5 min-w-44">
            {!showLangPicker ? (
              actions.map(({ id, label, icon: Icon, action }) => (
                <button
                  key={id}
                  onClick={action}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  <Icon className="w-4 h-4 text-purple-400" />
                  {label}
                </button>
              ))
            ) : (
              <>
                <div className="px-3 py-1.5 text-xs text-gray-500 font-medium border-b border-gray-700 mb-1">
                  Translate to...
                </div>
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    onClick={() => {
                      runAIAction('translate', lang);
                      setOpen(false);
                      setShowLangPicker(false);
                      toggleAIPanel();
                    }}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    {lang}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
