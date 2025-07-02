import React, { useRef, useState } from 'react';
import { Button, Box, TextField } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { SceneObject } from '../../pages/MainPage';

// @ts-ignore
import DxfParser from 'dxf-parser';

interface ExcavationCreatorProps {
  onAddObject: (params: Omit<SceneObject, 'id' | 'name'>) => void;
}

const ExcavationCreator: React.FC<ExcavationCreatorProps> = ({ onAddObject }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dxfContent, setDxfContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [depth, setDepth] = useState(5);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        setDxfContent(fileContent);
        
        const parser = new DxfParser();
        try {
          const parsedDxf = parser.parseSync(fileContent);
          console.log("DXF文件在本地验证成功:", parsedDxf);
        } catch (err) {
          console.error('本地验证DXF文件失败:', err);
          alert('您上传的似乎不是一个有效的DXF文件，但我们仍会尝试提交。');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleAddClick = () => {
    if (!dxfContent) {
      alert('请先上传DXF文件。');
      return;
    }
    onAddObject({
      type: 'excavation',
      parameters: {
        dxf: dxfContent,
        depth,
      }
    });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Button
        component="label"
        variant="contained"
        startIcon={<FileUploadIcon />}
      >
        上传DXF轮廓线
        <input
          type="file"
          accept=".dxf"
          hidden
          ref={fileInputRef}
          onChange={handleFileChange}
        />
      </Button>
      {fileName && (
        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
          已选择: {fileName}
        </Box>
      )}
      <TextField
        label="开挖深度 (m)"
        type="number"
        value={depth}
        onChange={(e) => setDepth(parseFloat(e.target.value))}
        variant="outlined"
        fullWidth
        disabled={!dxfContent}
      />
      <Button 
        variant="contained" 
        onClick={handleAddClick}
        disabled={!dxfContent}
      >
        添加基坑
      </Button>
    </Box>
  );
};

export default ExcavationCreator; 