import React from 'react';

// A reusable component for modal dialogs
const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; }> = ({ title, children, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-gray-800 text-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold">{title}</h3>
                    <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 hover:text-white">&times;</button>
                </div>
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>
    );
};


const MeshSettingsModal: React.FC<{ isVisible: boolean; onClose: () => void; }> = ({ isVisible, onClose }) => {
    if (!isVisible) return null;

    return (
        <Modal title="Mesh Settings" onClose={onClose}>
            <div className="space-y-4">
                {/* Global Settings */}
                <fieldset className="border border-gray-600 p-3 rounded">
                    <legend className="px-2 text-gray-300">Global Settings</legend>
                    <div className="space-y-3">
                        <div>
                            <label htmlFor="element-order" className="block mb-1 text-sm font-medium">Element Order</label>
                            <select id="element-order" className="w-full bg-gray-700 border border-gray-600 rounded p-2">
                                <option>1st Order (Linear)</option>
                                <option>2nd Order (Quadratic)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="mesh-size-factor" className="block mb-1 text-sm font-medium">Mesh Size Factor</label>
                            <input id="mesh-size-factor" type="range" min="0.1" max="2" step="0.1" defaultValue="1" className="w-full" />
                        </div>
                    </div>
                </fieldset>

                {/* Advanced Algorithm Settings */}
                <fieldset className="border border-gray-600 p-3 rounded">
                    <legend className="px-2 text-gray-300">Advanced Algorithms</legend>
                     <div className="space-y-3">
                        <div>
                            <label htmlFor="algo-3d" className="block mb-1 text-sm font-medium">3D Algorithm</label>
                            <select id="algo-3d" className="w-full bg-gray-700 border border-gray-600 rounded p-2">
                                <option>Delaunay</option>
                                <option>Frontal</option>
                                <option>Initial mesh only</option>
                            </select>
                        </div>
                    </div>
                </fieldset>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700 mt-4">
                    <button className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                        Cancel
                    </button>
                     <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
                        Generate Mesh
                    </button>
                    <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
                        OK
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default MeshSettingsModal; 