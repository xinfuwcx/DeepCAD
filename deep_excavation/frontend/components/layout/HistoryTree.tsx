import React from 'react';
import { useStore } from '../../core/store';
import { Box, Typography, List, ListItem, ListItemIcon, ListItemText, ListItemButton } from '@mui/material';

// Icons for different feature types
import TerrainIcon from '@mui/icons-material/Terrain';
import BusinessIcon from '@mui/icons-material/Business';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import GavelIcon from '@mui/icons-material/Gavel';
import WavesIcon from '@mui/icons-material/Waves';
import LooksOneIcon from '@mui/icons-material/LooksOne';

const getFeatureIcon = (type: string) => {
    switch (type) {
        case 'SoilDomain': return <TerrainIcon color="success" />;
        case 'Building': return <BusinessIcon color="action" />;
        case 'Tunnel': return <CompareArrowsIcon color="secondary" />;
        case 'Excavation': return <GavelIcon sx={{ color: '#FFB74D' }} />;
        case 'DiaphragmWall': return <LooksOneIcon color="disabled" />;
        case 'PileRaft': return <WavesIcon color="info" />;
        default: return <Box sx={{ width: 24 }} />;
    }
}

const HistoryTree: React.FC = () => {
    const features = useStore(state => state.features);
    const selectedFeatureId = useStore(state => state.selectedFeatureId);
    const selectFeature = useStore(state => state.selectFeature);

    return (
        <Box sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {features.length > 0 ? (
                <List>
                    {features.map((feature, index) => (
                        <ListItem key={feature.id} disablePadding>
                            <ListItemButton
                                selected={selectedFeatureId === feature.id}
                                onClick={() => selectFeature(feature.id)}
                                sx={{
                                    '&.Mui-selected': {
                                        backgroundColor: theme => theme.palette.primary.main,
                                        color: theme => theme.palette.primary.contrastText,
                                        '&:hover': {
                                            backgroundColor: theme => theme.palette.primary.dark,
                                        },
                                        '& .MuiListItemIcon-root': {
                                            color: theme => theme.palette.primary.contrastText,
                                        }
                                    }
                                }}
                            >
                                <ListItemIcon>
                                    {getFeatureIcon(feature.type)}
                                </ListItemIcon>
                                <ListItemText 
                                    primary={`${index + 1}. ${feature.name || feature.type}`} 
                                />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
            ) : (
                <Typography sx={{ p: 2, color: 'text.secondary', textAlign: 'center' }}>
                    暂无模型特征
                </Typography>
            )}
        </Box>
    );
};

export default HistoryTree;
