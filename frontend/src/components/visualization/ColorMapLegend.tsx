import React from 'react';
import { Card, Typography } from 'antd';
import { useResultsStore } from '../../stores/useResultsStore';
import { useShallow } from 'zustand/react/shallow';
import { getColormapGradient } from '../../utils/colormaps';
import './ColorMapLegend.css';

const { Text } = Typography;

const ColorMapLegend: React.FC = () => {
  const { rendererData, contour } = useResultsStore(
    useShallow(state => ({
      rendererData: state.rendererData,
      contour: state.contour,
    }))
  );

  if (!rendererData || !rendererData.fields || rendererData.fields.length === 0) {
    return null;
  }

  const currentField = rendererData.fields[0];
  const { range, unit, name } = currentField;

  const gradient = getColormapGradient(contour.colormap);

  const formatNumber = (num: number) => {
    if (Math.abs(num) < 1e-3 && num !== 0) {
      return num.toExponential(2);
    }
    return num.toFixed(2);
  };

  return (
    <div className="color-map-legend">
      <div className="legend-title">
        <Text style={{ color: 'white' }}>
          {name} ({unit})
        </Text>
      </div>
      <div className="legend-body">
        <div className="legend-gradient" style={{ background: gradient }} />
        <div className="legend-labels">
          <span>{formatNumber(range.max)}</span>
          <span>{formatNumber(range.min)}</span>
        </div>
      </div>
    </div>
  );
};

export default ColorMapLegend; 