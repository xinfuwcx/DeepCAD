import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { runParametricAnalysis, ParametricScene, AnalysisResult } from '../../services/parametricAnalysisService';

const AnalysisPanel: React.FC = () => {
    const openModal = useStore(state => state.openModal);
    const features = useStore(state => state.features);
    const [isLoading, setIsLoading] = useState(false);
    const [analysisStatus, setAnalysisStatus] = useState<AnalysisResult | null>(null);

    const handleRunAnalysis = async () => {
        setIsLoading(true);
        setAnalysisStatus(null);
        
        const scene: ParametricScene = {
            version: "2.0-parametric",
            features: features,
        };

        try {
            const result = await runParametricAnalysis(scene);
            setAnalysisStatus(result);
        } catch (error) {
            setAnalysisStatus({
                status: 'Error',
                message: error instanceof Error ? error.message : 'An unknown error occurred.',
                mesh_statistics: {},
            });
        } finally {
            setIsLoading(false);
        }
    };

    // In the future, this will show context-sensitive information
    // and launch the various modals for setting up the analysis.
    return (
        <div className="p-4 bg-gray-800 text-white h-full">
            <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">Analysis Workbench</h2>
            
            <div className="space-y-2">
                <button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-300"
                    onClick={() => openModal('MeshSettings')}
                >
                    Mesh Settings
                </button>
                <button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition duration-300 disabled:opacity-50"
                    onClick={() => openModal('MaterialManager')}
                    disabled // Temporarily disabled until implemented
                >
                    Material Manager
                </button>
                <button 
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded transition duration-300 disabled:opacity-50"
                    onClick={() => openModal('ConstraintEditor')}
                    disabled // Temporarily disabled until implemented
                >
                    Define Constraints
                </button>
                <button 
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded transition duration-300 disabled:opacity-50"
                    onClick={() => openModal('LoadEditor')}
                    disabled // Temporarily disabled until implemented
                >
                    Define Loads
                </button>
            </div>

            <div className="mt-8 pt-4 border-t border-gray-700">
                <button
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded text-lg transition duration-300 disabled:opacity-50"
                    onClick={handleRunAnalysis}
                    disabled={isLoading || features.length === 0}
                >
                    {isLoading ? 'Analyzing...' : 'Run Parametric Analysis'}
                </button>
            </div>
            
            {analysisStatus && (
                <div className={`mt-4 p-3 rounded ${analysisStatus.status === 'Success' ? 'bg-green-900' : 'bg-red-900'}`}>
                    <h3 className="font-bold">{analysisStatus.status}</h3>
                    <p className="text-sm">{analysisStatus.message}</p>
                </div>
            )}

            <div className="mt-8 p-4 text-center text-gray-400 border-t border-gray-700">
                <p>Select a setup task to begin configuring your analysis study.</p>
            </div>
        </div>
    );
};

export default AnalysisPanel; 