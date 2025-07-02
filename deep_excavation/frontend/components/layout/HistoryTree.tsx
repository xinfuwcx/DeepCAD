import React from 'react';
// import { Box, DraftingCompass, Scissors, Group, Trash2 } from 'lucide-react';
import { useStore } from '../../core/store';
import { AnyFeature } from '../../services/parametricAnalysisService';


const HistoryTree: React.FC = () => {
  const features = useStore(state => state.features);
  const selectedFeatureId = useStore(state => state.selectedFeatureId);
  const selectFeature = useStore(state => state.selectFeature);
  const deleteFeature = useStore(state => state.deleteFeature);

  const getIcon = (type: AnyFeature['type']) => {
    // switch (type) {
    //   case 'CreateBox':
    //     return <Box className="w-4 h-4 text-yellow-400" />;
    //   case 'AssignGroup':
    //     return <Group className="w-4 h-4 text-green-400" />;
    //   default:
    //     // Provide a generic icon for unhandled types like CreateSketch for now
    //     return <DraftingCompass className="w-4 h-4 text-gray-400" />;
    // }
    return '■'; // Return a simple character as a placeholder
  };

  const handleDeleteClick = (e: React.MouseEvent, featureId: string) => {
    e.stopPropagation(); // Prevent the li's onClick from firing
    deleteFeature(featureId);
  };

  return (
    <div className="flex flex-col h-full text-sm">
      <div className="flex-shrink-0 p-2 flex justify-between items-center border-b border-gray-700">
        <h2 className="font-bold text-base">Model History</h2>
      </div>
      <div className="flex-grow overflow-y-auto">
        {features.length === 0 ? (
          <div className="p-4 text-center text-gray-400">No operations yet.</div>
        ) : (
          <ul>
            {features.map(feature => (
              <li
                key={feature.id}
                onClick={() => selectFeature(feature.id)}
                className={`flex items-center p-2 cursor-pointer group hover:bg-blue-900/50 ${
                  selectedFeatureId === feature.id ? 'bg-blue-800' : ''
                }`}
              >
                <span className="mr-2">{getIcon(feature.type)}</span>
                <span className="flex-grow">{feature.name}</span>
                <button 
                  onClick={(e) => handleDeleteClick(e, feature.id)}
                  className="ml-2 p-1 rounded-full text-gray-400 hover:bg-red-800 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Feature"
                >
                    {/* <Trash2 size={14} /> */}
                    X
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default HistoryTree; 