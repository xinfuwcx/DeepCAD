import React from 'react';
import { Paper, Typography, Box, Slider, FormControl, InputLabel, Select, MenuItem, SelectChangeEvent } from '@mui/material';

// 颜色方案类型
export type ColorScheme = 'rainbow' | 'thermal' | 'pressure' | 'blueRed';

// 图例属性接口
interface LegendProps {
  title: string;
  minValue: number;
  maxValue: number;
  unit: string;
  colorScheme: ColorScheme;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onRangeChange?: (min: number, max: number) => void;
}

/**
 * 渗流分析图例组件
 * 显示颜色渐变条、数值范围和单位，支持切换颜色方案
 */
const Legend: React.FC<LegendProps> = ({
  title,
  minValue,
  maxValue,
  unit,
  colorScheme,
  onColorSchemeChange,
  onRangeChange
}) => {
  // 根据颜色方案生成渐变CSS
  const getGradientStyle = (scheme: ColorScheme) => {
    switch (scheme) {
      case 'rainbow':
        return 'linear-gradient(to right, blue, cyan, green, yellow, red)';
      case 'thermal':
        return 'linear-gradient(to right, darkblue, blue, cyan, yellow, orange, red)';
      case 'pressure':
        return 'linear-gradient(to right, white, #e6f7ff, #bae7ff, #91d5ff, #69c0ff, #40a9ff, #1890ff, #096dd9, #0050b3)';
      case 'blueRed':
        return 'linear-gradient(to right, blue, white, red)';
      default:
        return 'linear-gradient(to right, blue, cyan, green, yellow, red)';
    }
  };

  // 滑动条值变更处理
  const [range, setRange] = React.useState<number[]>([minValue, maxValue]);
  
  const handleRangeChange = (_event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue)) {
      setRange(newValue);
      if (onRangeChange) {
        onRangeChange(newValue[0], newValue[1]);
      }
    }
  };

  // 颜色方案变更处理
  const handleSchemeChange = (event: SelectChangeEvent) => {
    onColorSchemeChange(event.target.value as ColorScheme);
  };
  
  return (
    <Paper 
      elevation={3} 
      className="seepage-legend"
      sx={{ 
        position: 'absolute', 
        bottom: 20, 
        right: 20, 
        padding: 2, 
        width: 300, 
        backgroundColor: 'rgba(255,255,255,0.9)'
      }}
    >
      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
        {title}
      </Typography>
      
      <Box 
        sx={{ 
          height: 20, 
          width: '100%', 
          backgroundImage: getGradientStyle(colorScheme),
          borderRadius: 1,
          my: 1
        }}
      />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="caption">{range[0].toFixed(2)} {unit}</Typography>
        <Typography variant="caption">{range[1].toFixed(2)} {unit}</Typography>
      </Box>
      
      <Slider
        value={range}
        onChange={handleRangeChange}
        valueLabelDisplay="auto"
        min={minValue}
        max={maxValue}
        step={(maxValue - minValue) / 100}
      />
      
      <FormControl fullWidth size="small" sx={{ mt: 2 }}>
        <InputLabel id="color-scheme-label">颜色方案</InputLabel>
        <Select
          labelId="color-scheme-label"
          value={colorScheme}
          label="颜色方案"
          onChange={handleSchemeChange}
        >
          <MenuItem value="rainbow">彩虹色</MenuItem>
          <MenuItem value="thermal">热力图</MenuItem>
          <MenuItem value="pressure">压力图</MenuItem>
          <MenuItem value="blueRed">蓝红渐变</MenuItem>
        </Select>
      </FormControl>
    </Paper>
  );
};

export default Legend; 