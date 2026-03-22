import { useStore } from './store';
import { ConnectionSetup } from './components/ConnectionSetup';
import { Sidebar } from './components/Sidebar';
import { NoteList } from './components/NoteList';
import { NoteEditor } from './components/NoteEditor';
import { AIPanel } from './components/AIPanel';
import { PanelLeft, Bot } from 'lucide-react';

function App() {
  const { isConnected, sidebarOpen, aiPanelOpen, toggleSidebar, toggleAIPanel } = useStore();

  if (!isConnected) {
    return <ConnectionSetup />;
  }

  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar toggle for mobile */}
      <div className="fixed top-2 left-2 z-30 flex gap-1 md:hidden">
        <button
          onClick={toggleSidebar}
          className="p-2 bg-gray-800 rounded-lg text-gray-400 hover:text-white"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`
          transition-all duration-200 shrink-0 overflow-hidden
          ${sidebarOpen ? 'w-56' : 'w-0'}
        `}
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

        {/* AI Panel */}
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
    </div>
  );
}

export default App;
