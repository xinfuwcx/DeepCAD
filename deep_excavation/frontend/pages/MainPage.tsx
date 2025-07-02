import React from 'react';
import { useStore } from '../core/store';

import Viewport from '../components/viewport/Viewport';
import HistoryTree from '../components/layout/HistoryTree';
import PropertyPanel from '../components/layout/PropertyPanel';
import AnalysisPanel from '../components/layout/AnalysisPanel'; 
import MeshSettingsModal from '../components/modals/MeshSettingsModal';
import SoilDomainCreator from '../components/creators/SoilDomainCreator';
import TunnelCreator from '../components/creators/TunnelCreator';
import BuildingCreator from '../components/creators/BuildingCreator';
import ExcavationCreator from '../components/creators/ExcavationCreator';
import PileRaftCreator from '../components/creators/PileRaftCreator';
import DiaphragmWallCreator from '../components/creators/DiaphragmWallCreator';
import AnchorCreator from '../components/creators/AnchorCreator';
import VtkResultsViewer from '../components/VtkResultsViewer';

const MainPage: React.FC = () => {
    // --- Get state and actions from the global store ---
    const activeWorkbench = useStore(state => state.activeWorkbench);
    const setActiveWorkbench = useStore(state => state.setActiveWorkbench);
    const activeModal = useStore(state => state.activeModal);
    const closeModal = useStore(state => state.closeModal);

    // --- Component for switching workbenches ---
    const SimpleToolbar = () => (
        <div className="bg-gray-900 p-2 flex space-x-2 border-b border-gray-700">
            <button 
                onClick={() => setActiveWorkbench('Modeling')}
                className={`px-3 py-1 rounded ${activeWorkbench === 'Modeling' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
                Modeling
            </button>
            <button 
                onClick={() => setActiveWorkbench('Analysis')}
                className={`px-3 py-1 rounded ${activeWorkbench === 'Analysis' ? 'bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            >
                Analysis
            </button>
        </div>
    );

    // --- Logic to render the correct panel based on the active workbench ---
    const renderRightPanel = () => {
        switch (activeWorkbench) {
            case 'Modeling':
                return (
                    <div>
                        <SoilDomainCreator />
                        <TunnelCreator />
                        <BuildingCreator />
                        <ExcavationCreator />
                        <PileRaftCreator />
                        <DiaphragmWallCreator />
                        <AnchorCreator />
                        <PropertyPanel />
                    </div>
                );
            case 'Analysis':
                return (
                    <div>
                        <AnalysisPanel />
                        <VtkResultsViewer resultsUrl={undefined} />
                    </div>
                );
            default:
                return null;
        }
    };

    // --- Main component layout ---
    return (
        <div className="flex flex-col h-screen bg-gray-900 text-white">
            <SimpleToolbar />
            <div className="flex flex-1 overflow-hidden">
                <div className="w-1/5 h-full bg-gray-800 p-2 overflow-y-auto">
                    <HistoryTree />
                </div>
                <div className="flex-1 h-full">
                    <Viewport />
                </div>
                <div className="w-1/5 h-full bg-gray-800 p-2 overflow-y-auto">
                    {renderRightPanel()}
                </div>
            </div>
            
            {/* Render modals based on global state */}
            <MeshSettingsModal 
                isVisible={activeModal === 'MeshSettings'} 
                onClose={closeModal} 
            />
        </div>
    );
};

export default MainPage;
