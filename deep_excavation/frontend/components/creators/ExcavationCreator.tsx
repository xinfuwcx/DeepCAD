interface ExcavationCreatorProps {
  onAddObject: (params: Omit<SceneObject, 'id' | 'name'>) => void;
}

const ExcavationCreator: React.FC<ExcavationCreatorProps> = ({ onAddObject }) => {
  const handleCreateModel = () => {
    if (!dxf) {
      alert('请先上传一个DXF文件');
      return;
    }
    
    onAddObject({
      type: 'excavation',
      parameters: {
        dxf: dxf,
        depth: parseFloat(excavationDepth) || 15,
      }
    });
  };

  return (
    // ... (Omit existing code for brevity)
  );
};

export default ExcavationCreator; 