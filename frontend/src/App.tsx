import { SeepageAnalysisPanel } from "./components/SeepageAnalysisPanel";

function App() {
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-md p-4">
        <h1 className="text-xl font-bold">Deep Excavation - V4 CAE Platform</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-1/4 bg-gray-800 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Analysis Modules</h2>
          {/* Placeholder for module selection */}
          <div className="space-y-2">
            <button className="w-full text-left bg-gray-700 hover:bg-gray-600 p-2 rounded">
              Structural Analysis
            </button>
            <button className="w-full text-left bg-blue-600 hover:bg-blue-500 p-2 rounded font-bold">
              Seepage Analysis
            </button>
             <button className="w-full text-left bg-gray-700 hover:bg-gray-600 p-2 rounded opacity-50 cursor-not-allowed">
              Tunnel Analysis (Coming Soon)
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-2xl font-bold mb-4">Seepage Analysis Controls</h2>
          <SeepageAnalysisPanel />
        </main>
      </div>
    </div>
  )
}

export default App
