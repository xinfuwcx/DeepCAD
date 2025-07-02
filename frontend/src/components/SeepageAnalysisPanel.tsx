import React, { useState } from 'react';
import { apiService, SeepageAnalysisPayload } from '../services/api';

export const SeepageAnalysisPanel: React.FC = () => {
  const [projectName, setProjectName] = useState('V4_Seepage_UI_Test');
  const [excavationDepth, setExcavationDepth] = useState(10);
  const [dxfFileContent, setDxfFileContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setDxfFileContent(text);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dxfFileContent) {
      setError('Please upload a DXF file.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    // This is a mock payload that matches the backend's requirements.
    // In a real app, these values would come from more form fields.
    const payload: SeepageAnalysisPayload = {
      project_name: projectName,
      geometry_definition: {
        project_name: "Nested_Geometry_for_Seepage",
        soil_profile: [
          {
            material_name: "SiltySand_Seepage",
            surface_points: [
              [0, 0, 0], [50, 0, 0], [0, 30, -1], [50, 30, -1]
            ],
            average_thickness: 25.0,
          }
        ],
        excavation: {
          dxf_file_content: dxfFileContent,
          layer_name: "EXCAVATION_OUTLINE",
          excavation_depth: excavationDepth,
        }
      },
      materials: [
        {
          name: "SiltySand_Seepage",
          hydraulic_conductivity_x: 1e-5,
          hydraulic_conductivity_y: 1e-5,
          hydraulic_conductivity_z: 5e-6,
        }
      ],
      boundary_conditions: [
        { boundary_name: "upstream_face", total_head: 20.0 },
        { boundary_name: "downstream_face_and_bottom", total_head: 5.0 }
      ]
    };

    try {
      const data = await apiService.runSeepageAnalysis(payload);
      setResults(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg text-white">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Name */}
        <div>
          <label htmlFor="projectName" className="block text-sm font-medium text-gray-300">
            Project Name
          </label>
          <input
            type="text"
            id="projectName"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
          />
        </div>

        {/* Excavation Depth */}
        <div>
          <label htmlFor="excavationDepth" className="block text-sm font-medium text-gray-300">
            Excavation Depth (m)
          </label>
          <input
            type="number"
            id="excavationDepth"
            value={excavationDepth}
            onChange={(e) => setExcavationDepth(parseFloat(e.target.value))}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2"
          />
        </div>
        
        {/* DXF File Upload */}
        <div>
            <label className="block text-sm font-medium text-gray-300">
                Excavation Profile DXF
            </label>
            <div className="mt-1 flex items-center">
                <input
                    type="file"
                    id="dxfFile"
                    onChange={handleFileChange}
                    accept=".dxf"
                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>
            {dxfFileContent && <p className="text-xs text-green-400 mt-1">DXF file loaded.</p>}
        </div>

        {/* Submit Button */}
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Running Analysis...' : 'Run Seepage Analysis'}
          </button>
        </div>
      </form>

      {/* Results and Error Display */}
      <div className="mt-6">
        {error && (
            <div className="bg-red-900 border border-red-500 text-red-200 px-4 py-3 rounded relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        )}
        {results && (
            <div className="bg-green-900 border border-green-500 text-green-200 px-4 py-3 rounded">
                <h3 className="font-bold text-lg mb-2">Analysis Successful</h3>
                <pre className="text-xs overflow-x-auto bg-gray-900 p-2 rounded">{JSON.stringify(results, null, 2)}</pre>
            </div>
        )}
      </div>

    </div>
  );
};
