import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    TextField,
    Box,
    IconButton,
    Typography,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface Material {
    id: string;
    name: string;
    type: 'soil' | 'concrete' | 'steel';
    density: number;
    youngModulus: number;
    poissonRatio: number;
    cohesion?: number;
    frictionAngle?: number;
    hydraulicConductivity?: number;
}

interface MaterialManagerModalProps {
    open: boolean;
    onClose: () => void;
}

const MaterialManagerModal: React.FC<MaterialManagerModalProps> = ({
    open,
    onClose,
}) => {
    const [materials, setMaterials] = useState<Material[]>([
        {
            id: '1',
            name: '粘土',
            type: 'soil',
            density: 1800,
            youngModulus: 10000,
            poissonRatio: 0.35,
            cohesion: 20,
            frictionAngle: 18,
            hydraulicConductivity: 1e-8,
        },
        {
            id: '2',
            name: 'C30混凝土',
            type: 'concrete',
            density: 2400,
            youngModulus: 30000000,
            poissonRatio: 0.2,
        },
    ]);

    const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const handleAddMaterial = () => {
        const newMaterial: Material = {
            id: Date.now().toString(),
            name: '新材料',
            type: 'soil',
            density: 2000,
            youngModulus: 20000,
            poissonRatio: 0.3,
        };
        setEditingMaterial(newMaterial);
        setIsEditing(true);
    };

    const handleEditMaterial = (material: Material) => {
        setEditingMaterial({ ...material });
        setIsEditing(true);
    };

    const handleSaveMaterial = () => {
        if (!editingMaterial) return;

        if (materials.find(m => m.id === editingMaterial.id)) {
            // 更新现有材料
            setMaterials(materials.map(m => 
                m.id === editingMaterial.id ? editingMaterial : m
            ));
        } else {
            // 添加新材料
            setMaterials([...materials, editingMaterial]);
        }

        setEditingMaterial(null);
        setIsEditing(false);
    };

    const handleDeleteMaterial = (id: string) => {
        setMaterials(materials.filter(m => m.id !== id));
    };

    const handleCancel = () => {
        setEditingMaterial(null);
        setIsEditing(false);
    };

    return (
        <>
            <Dialog 
                open={open} 
                onClose={onClose} 
                maxWidth="lg" 
                fullWidth
            >
                <DialogTitle>
                    <Typography variant="h6">材料管理器</Typography>
                </DialogTitle>
                
                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={handleAddMaterial}
                            disabled={isEditing}
                        >
                            添加材料
                        </Button>
                    </Box>

                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>名称</TableCell>
                                    <TableCell>类型</TableCell>
                                    <TableCell>密度 (kg/m³)</TableCell>
                                    <TableCell>弹性模量 (Pa)</TableCell>
                                    <TableCell>泊松比</TableCell>
                                    <TableCell>粘聚力 (kPa)</TableCell>
                                    <TableCell>内摩擦角 (°)</TableCell>
                                    <TableCell>操作</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {materials.map((material) => (
                                    <TableRow key={material.id}>
                                        <TableCell>{material.name}</TableCell>
                                        <TableCell>
                                            {material.type === 'soil' ? '土体' :
                                             material.type === 'concrete' ? '混凝土' : '钢材'}
                                        </TableCell>
                                        <TableCell>{material.density}</TableCell>
                                        <TableCell>{material.youngModulus.toExponential(2)}</TableCell>
                                        <TableCell>{material.poissonRatio}</TableCell>
                                        <TableCell>{material.cohesion || '-'}</TableCell>
                                        <TableCell>{material.frictionAngle || '-'}</TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleEditMaterial(material)}
                                                disabled={isEditing}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDeleteMaterial(material.id)}
                                                disabled={isEditing}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>

                <DialogActions>
                    <Button onClick={onClose}>关闭</Button>
                </DialogActions>
            </Dialog>

            {/* 材料编辑对话框 */}
            <Dialog open={isEditing} onClose={handleCancel} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingMaterial && materials.find(m => m.id === editingMaterial.id) ? '编辑材料' : '添加材料'}
                </DialogTitle>
                
                <DialogContent>
                    {editingMaterial && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                            <TextField
                                label="材料名称"
                                value={editingMaterial.name}
                                onChange={(e) => setEditingMaterial({
                                    ...editingMaterial,
                                    name: e.target.value
                                })}
                                fullWidth
                            />
                            
                            <FormControl fullWidth>
                                <InputLabel>材料类型</InputLabel>
                                <Select
                                    value={editingMaterial.type}
                                    onChange={(e) => setEditingMaterial({
                                        ...editingMaterial,
                                        type: e.target.value as 'soil' | 'concrete' | 'steel'
                                    })}
                                    label="材料类型"
                                >
                                    <MenuItem value="soil">土体</MenuItem>
                                    <MenuItem value="concrete">混凝土</MenuItem>
                                    <MenuItem value="steel">钢材</MenuItem>
                                </Select>
                            </FormControl>

                            <Divider />
                            <Typography variant="subtitle2">基本力学参数</Typography>
                            
                            <TextField
                                label="密度 (kg/m³)"
                                type="number"
                                value={editingMaterial.density}
                                onChange={(e) => setEditingMaterial({
                                    ...editingMaterial,
                                    density: parseFloat(e.target.value)
                                })}
                                fullWidth
                            />
                            
                            <TextField
                                label="弹性模量 (Pa)"
                                type="number"
                                value={editingMaterial.youngModulus}
                                onChange={(e) => setEditingMaterial({
                                    ...editingMaterial,
                                    youngModulus: parseFloat(e.target.value)
                                })}
                                fullWidth
                            />
                            
                            <TextField
                                label="泊松比"
                                type="number"
                                value={editingMaterial.poissonRatio}
                                onChange={(e) => setEditingMaterial({
                                    ...editingMaterial,
                                    poissonRatio: parseFloat(e.target.value)
                                })}
                                fullWidth
                                inputProps={{ step: 0.01, min: 0, max: 0.5 }}
                            />

                            {editingMaterial.type === 'soil' && (
                                <>
                                    <Divider />
                                    <Typography variant="subtitle2">土体特有参数</Typography>
                                    
                                    <TextField
                                        label="粘聚力 (kPa)"
                                        type="number"
                                        value={editingMaterial.cohesion || 0}
                                        onChange={(e) => setEditingMaterial({
                                            ...editingMaterial,
                                            cohesion: parseFloat(e.target.value)
                                        })}
                                        fullWidth
                                    />
                                    
                                    <TextField
                                        label="内摩擦角 (°)"
                                        type="number"
                                        value={editingMaterial.frictionAngle || 0}
                                        onChange={(e) => setEditingMaterial({
                                            ...editingMaterial,
                                            frictionAngle: parseFloat(e.target.value)
                                        })}
                                        fullWidth
                                        inputProps={{ min: 0, max: 90 }}
                                    />
                                    
                                    <TextField
                                        label="渗透系数 (m/s)"
                                        type="number"
                                        value={editingMaterial.hydraulicConductivity || 1e-8}
                                        onChange={(e) => setEditingMaterial({
                                            ...editingMaterial,
                                            hydraulicConductivity: parseFloat(e.target.value)
                                        })}
                                        fullWidth
                                        inputProps={{ step: 1e-10 }}
                                    />
                                </>
                            )}
                        </Box>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button onClick={handleCancel}>取消</Button>
                    <Button onClick={handleSaveMaterial} variant="contained">保存</Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default MaterialManagerModal; 