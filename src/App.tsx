import { useState } from 'react';
import { useStore } from './store';
import { ConnectionSetup } from './components/ConnectionSetup';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { AIPanel } from './components/AIPanel';
import { MultiJoplinManager } from './components/MultiJoplinManager';
import { AggregatorView } from './components/AggregatorView';
import { DuplicateDetector } from './components/DuplicateDetector';
import { TopicClassifier } from './components/TopicClassifier';
import { NotebookBuilder } from './components/NotebookBuilder';
import {
  PanelLeft,
  Bot,
  FileText,
  Server,
  Layers,
  Copy,
  Tag,
  BookOpen,
} from 'lucide-react';
import type { AppView } from './types';

const NAV_ITEMS: { view: AppView; icon: React.ReactNode; label: string }[] = [
  { view: 'editor',     icon: <FileText className="w-4 h-4" />,  label: 'Notes' },
  { view: 'aggregator', icon: <Layers className="w-4 h-4" />,    label: 'Aggregate' },
  { view: 'duplicates', icon: <Copy className="w-4 h-4" />,      label: 'Duplicates' },
  { view: 'topics',     icon: <Tag className="w-4 h-4" />,       label: 'Topics' },
  { view: 'builder',    icon: <BookOpen className="w-4 h-4" />,  label: 'Builder' },
];

function App() {
  const { isConnected, sidebarOpen, aiPanelOpen, toggleSidebar, toggleAIPanel } = useStore();
  const [appView, setAppView] = useState<AppView>('editor');
  const [showInstanceManager, setShowInstanceManager] = useState(false);

  if (!isConnected) {
    return <ConnectionSetup />;
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Left nav rail */}
      <div className="w-14 shrink-0 flex flex-col items-center py-3 gap-1 bg-gray-900 border-r border-gray-800">
        {NAV_ITEMS.map(item => (
          <button
            key={item.view}
            onClick={() => setAppView(item.view)}
            title={item.label}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              appView === item.view
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {item.icon}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Instance manager toggle */}
        <button
          onClick={() => setShowInstanceManager(v => !v)}
          title="Manage Joplin instances"
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
            showInstanceManager
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Server className="w-4 h-4" />
        </button>
      </div>

      {/* Instance manager panel */}
      {showInstanceManager && (
        <div className="w-72 shrink-0 border-r border-gray-800 overflow-hidden">
          <MultiJoplinManager />
        </div>
      )}

      {/* Main content */}
      {appView === 'editor' ? (
        <>
          {/* Sidebar toggle for mobile */}
          <div className="fixed top-2 left-16 z-30 flex gap-1 md:hidden">
            <button
              onClick={toggleSidebar}
              className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Sidebar */}
          <div
            className={`transition-all duration-200 shrink-0 overflow-hidden ${sidebarOpen ? 'w-56' : 'w-0'}`}
          >
            {sidebarOpen && <Sidebar />}
          </div>

          {/* Note List */}
          <div className="w-64 shrink-0 overflow-hidden">
            <NoteList />
          </div>

          {/* Editor */}
          <div className="flex-1 flex overflow-hidden min-w-0">
            <NoteEditor />
            {aiPanelOpen && <AIPanel />}
          </div>

          {/* Floating AI toggle */}
          {!aiPanelOpen && (
            <button
              onClick={toggleAIPanel}
              className="fixed bottom-4 right-4 z-20 flex items-center gap-2 px-3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl shadow-lg shadow-purple-900/50 text-sm font-medium transition-colors"
            >
              <Bot className="w-4 h-4" />
              AI
            </button>
          )}
        </>
      ) : appView === 'aggregator' ? (
        <div className="flex-1 overflow-hidden">
          <AggregatorView />
        </div>
      ) : appView === 'duplicates' ? (
        <div className="flex-1 overflow-hidden">
          <DuplicateDetector />
        </div>
      ) : appView === 'topics' ? (
        <div className="flex-1 overflow-hidden">
          <TopicClassifier />
        </div>
      ) : appView === 'builder' ? (
        <div className="flex-1 overflow-hidden">
          <NotebookBuilder />
        </div>
      ) : null}
    </div>
  );
}

export default App;
