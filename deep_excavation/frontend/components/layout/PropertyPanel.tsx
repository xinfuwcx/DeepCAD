import React, { useState, useEffect } from 'react';
import { AnyFeature, CreateBoxFeature } from '../../services/parametricAnalysisService';
import { Task, FeatureType } from '../../core/tasks';

// =================================================================================
// Reusable UI Components
// =================================================================================
const Section: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="border-b border-gray-700 mb-4">
        <h3 className="w-full text-left p-2 bg-gray-700 font-bold">{title}</h3>
        <div className="p-3 bg-gray-800 space-y-3">{children}</div>
    </div>
);

const PropertyInput: React.FC<{ label: string; value: any; onChange: (val: any) => void; type?: string; step?: number }> = 
({ label, value, onChange, type = "number", step = 1 }) => {
    const inputId = `prop-input-${label.replace(/\s+/g, '-')}`;
    return (
        <div>
            <label htmlFor={inputId} className="block text-xs text-gray-400 mb-1">{label}</label>
            <input id={inputId} type={type} step={step} value={value}
                onChange={(e) => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
        </div>
    );
};

const Button: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string; }> =
({ onClick, children, className = "bg-blue-600 hover:bg-blue-700" }) => (
    <button onClick={onClick} className={`w-full mt-2 text-white font-bold py-2 px-4 rounded ${className}`}>
        {children}
    </button>
);


// =================================================================================
// Task-Specific Panels (The "Fusion 360" Task/Wizard Panels)
// =================================================================================

interface CreateBoxTaskProps {
    onAddFeature: (feature: CreateBoxFeature) => void;
    onCancelTask: () => void;
}

const CreateBoxTask: React.FC<CreateBoxTaskProps> = ({ onAddFeature, onCancelTask }) => {
    const [params, setParams] = useState({ width: 100, height: 20, depth: 100 });

    const handleSubmit = () => {
        onAddFeature({
            id: `feature-${Date.now()}`,
            name: 'Soil Body',
            type: 'CreateBox',
            parameters: { ...params, position: { x: 0, y: -params.height / 2, z: 0 } }
        });
    };

    return (
        <Section title="Task: Create Box">
            <PropertyInput label="Width (X)" value={params.width} onChange={val => setParams(p => ({...p, width: val}))} />
            <PropertyInput label="Height (Y)" value={params.height} onChange={val => setParams(p => ({...p, height: val}))} />
            <PropertyInput label="Depth (Z)" value={params.depth} onChange={val => setParams(p => ({...p, depth: val}))} />
            <Button onClick={handleSubmit}>Finish</Button>
            <Button onClick={onCancelTask} className="bg-gray-600 hover:bg-gray-700">Cancel</Button>
        </Section>
    );
};


// =================================================================================
// Feature-Specific Editors (The Property Editor Panels)
// =================================================================================

interface FeatureEditorProps<T extends AnyFeature> {
    feature: T;
    onUpdateFeature: (feature: T) => void;
}

const CreateBoxEditor: React.FC<FeatureEditorProps<CreateBoxFeature>> = ({ feature, onUpdateFeature }) => {
    
    const handleUpdate = (newParams: Partial<CreateBoxFeature['parameters']>) => {
        onUpdateFeature({
            ...feature,
            parameters: { ...feature.parameters, ...newParams }
        });
    };
    
    return (
        <Section title={`Properties: ${feature.name}`}>
            <PropertyInput label="Width (X)" value={feature.parameters.width} onChange={val => handleUpdate({ width: val })} />
            <PropertyInput label="Height (Y)" value={feature.parameters.height} onChange={val => handleUpdate({ height: val })} />
            <PropertyInput label="Depth (Z)" value={feature.parameters.depth} onChange={val => handleUpdate({ depth: val })} />
        </Section>
    );
};

// =================================================================================
// Main Panel Component (The Router)
// =================================================================================

interface PropertyPanelProps {
  activeWorkbench: 'Modeling' | 'Analysis';
  activeTask: Task | null;
  selectedFeature: AnyFeature | null;
  onStartTask: (taskType: FeatureType) => void;
  onCancelTask: () => void;
  onAddFeature: (feature: AnyFeature) => void;
  onUpdateFeature: (feature: AnyFeature) => void;
}

const PropertyPanel: React.FC<PropertyPanelProps> = ({ 
    activeWorkbench, activeTask, selectedFeature, 
    onStartTask, onCancelTask, onAddFeature, onUpdateFeature 
}) => {
  
  const renderModelingPanel = () => {
    // 1. If a task is active, show the task panel
    if (activeTask) {
        switch (activeTask.type) {
            case 'CreateBox':
                return <CreateBoxTask onAddFeature={onAddFeature} onCancelTask={onCancelTask} />;
            // Add other tasks here
            default:
                return (
                    <Section title={`Task: ${activeTask.type}`}>
                        <p>This task is not yet implemented.</p>
                        <Button onClick={onCancelTask} className="bg-gray-600 hover:bg-gray-700">Cancel</Button>
                    </Section>
                );
        }
    }

    // 2. If a feature is selected, show its editor
    if (selectedFeature) {
        switch (selectedFeature.type) {
            case 'CreateBox':
                return <CreateBoxEditor feature={selectedFeature} onUpdateFeature={onUpdateFeature} />;
            // Add other feature editors here
            default:
                return <Section title={`Properties: ${selectedFeature.name}`}>This feature type cannot be edited yet.</Section>;
        }
    }

    // 3. Default state: Show buttons to start tasks
    return (
        <Section title="Modeling Tasks">
             <Button onClick={() => onStartTask('CreateBox')}>Create Soil Body</Button>
             <div className="p-4 text-center text-gray-400 border-t border-gray-700 mt-4">
                <p>Select a feature in the history tree to edit its properties.</p>
            </div>
        </Section>
    );
  };

  const renderAnalysisPanel = () => (
     <Section title="Analysis Tasks">
        <p className="p-4 text-center text-gray-400">Analysis panel is under construction.</p>
     </Section>
  );

  return (
    <div className="h-full flex flex-col text-sm">
        {activeWorkbench === 'Modeling' && renderModelingPanel()}
        {activeWorkbench === 'Analysis' && renderAnalysisPanel()}
    </div>
  );
};

export default PropertyPanel; 