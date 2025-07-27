/**
 * 桩基类型选择组件
 * 集成2号几何专家的专业桩基建模策略
 * 1号架构师 - 响应2号专家的修正完成报告
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FunctionalIcons } from '../icons/FunctionalIconsQuickFix';
import { EngineeringIcons } from '../icons/EngineeringIcons';
// Import proper enums from PileModelingStrategy service
import { 
  PileType, 
  PileModelingStrategy 
} from '../../services/PileModelingStrategy';

// 桩基类型信息接口
export interface PileTypeInfo {
  type: PileType;
  name: string;
  description: string;
  strategy: PileModelingStrategy;
  constructionMethod: string;
  soilTreatment: 'displacement' | 'compaction';
  typicalDiameter: string;
  applications: string[];
  advantages: string[];
  icon: React.ComponentType<any>;
  color: string;
}

// 组件属性接口
interface PileTypeSelectorProps {
  selectedType?: PileType;
  onTypeSelect: (type: PileType, strategy: PileModelingStrategy) => void;
  showStrategyExplanation?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}

const PileTypeSelector: React.FC<PileTypeSelectorProps> = ({
  selectedType,
  onTypeSelect,
  showStrategyExplanation = true,
  disabled = false,
  style
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPileInfo, setSelectedPileInfo] = useState<PileTypeInfo | null>(null);

  // 2号专家修正后的桩基类型配置
  const availablePileTypes: PileTypeInfo[] = [
    // === 置换型桩基 (梁元模拟) ===
    {
      type: PileType.BORED_CAST_IN_PLACE,
      name: '钻孔灌注桩',
      description: '机械钻孔，现场灌注混凝土成桩',
      strategy: PileModelingStrategy.BEAM_ELEMENT,
      constructionMethod: '钻孔开挖',
      soilTreatment: 'displacement',
      typicalDiameter: '600-1500mm',
      applications: ['深基坑围护', '承载桩', '抗浮桩'],
      advantages: ['承载力高', '质量可控', '适应性强'],
      icon: EngineeringIcons.BoredPile,
      color: '#3b82f6'
    },
    {
      type: PileType.HAND_DUG,
      name: '人工挖孔桩',
      description: '人工开挖，大直径现浇桩',
      strategy: PileModelingStrategy.BEAM_ELEMENT,
      constructionMethod: '人工开挖',
      soilTreatment: 'displacement',
      typicalDiameter: '1000-3000mm',
      applications: ['高层建筑', '桥梁基础', '重载结构'],
      advantages: ['大直径', '承载力高', '桩底清理彻底'],
      icon: EngineeringIcons.HandDugPile,
      color: '#059669'
    },
    {
      type: PileType.PRECAST_DRIVEN,
      name: '预制桩',
      description: '工厂预制，现场锤击或静压施工',
      strategy: PileModelingStrategy.BEAM_ELEMENT,
      constructionMethod: '锤击/静压',
      soilTreatment: 'displacement',
      typicalDiameter: '300-800mm',
      applications: ['多层建筑', '工业厂房', '道路工程'],
      advantages: ['质量稳定', '施工快速', '成本经济'],
      icon: EngineeringIcons.PrecastPile,
      color: '#dc2626'
    },

    // === 挤密型桩基 (壳元模拟) ===
    {
      type: PileType.SWM_METHOD,
      name: 'SWM工法桩',
      description: '三轴搅拌桩，水泥土搅拌加固',
      strategy: PileModelingStrategy.SHELL_ELEMENT,
      constructionMethod: '深层搅拌',
      soilTreatment: 'compaction',
      typicalDiameter: '500-2000mm',
      applications: ['软土地基处理', '深基坑止水', '地基加固'],
      advantages: ['环保无污染', '加固效果好', '施工简便'],
      icon: EngineeringIcons.SWMPile,
      color: '#7c3aed'
    },
    {
      type: PileType.CFG_PILE,
      name: 'CFG桩',
      description: '水泥粉煤灰碎石桩，振动沉管施工',
      strategy: PileModelingStrategy.SHELL_ELEMENT,
      constructionMethod: '振动挤密',
      soilTreatment: 'compaction',
      typicalDiameter: '350-600mm',
      applications: ['复合地基', '高层建筑', '软土处理'],
      advantages: ['复合地基效应', '造价经济', '环境友好'],
      icon: EngineeringIcons.CFGPile,
      color: '#ea580c'
    },
    {
      type: PileType.HIGH_PRESSURE_JET,
      name: '高压旋喷桩',
      description: '高压射流切割搅拌，水泥浆液固化',
      strategy: PileModelingStrategy.SHELL_ELEMENT,
      constructionMethod: '高压旋喷',
      soilTreatment: 'compaction',
      typicalDiameter: '600-2000mm',
      applications: ['防渗加固', '基坑支护', '地基处理'],
      advantages: ['加固范围可控', '适用土质广', '防渗效果好'],
      icon: EngineeringIcons.JetGroutingPile,
      color: '#0891b2'
    }
  ];

  // 初始化选中的桩基信息
  useEffect(() => {
    if (selectedType) {
      const pileInfo = availablePileTypes.find(pile => pile.type === selectedType);
      setSelectedPileInfo(pileInfo || null);
    }
  }, [selectedType]);

  // 处理桩基类型选择
  const handleTypeSelect = (pileInfo: PileTypeInfo) => {
    setSelectedPileInfo(pileInfo);
    setIsOpen(false);
    onTypeSelect(pileInfo.type, pileInfo.strategy);
  };

  // 获取策略说明
  const getStrategyExplanation = (strategy: PileModelingStrategy, soilTreatment: string) => {
    if (strategy === PileModelingStrategy.BEAM_ELEMENT) {
      return `梁元模拟：${soilTreatment === 'displacement' ? '置换型桩基，开挖/钻孔移除土体，承载主要靠桩身，适合用梁元素模拟桩身受力' : ''}`;
    } else {
      return `壳元模拟：${soilTreatment === 'compaction' ? '挤密型桩基，搅拌/挤压处理土体，与土体共同承载，需要壳元素模拟桩-土相互作用' : ''}`;
    }
  };

  return (
    <div style={style} className="relative">
      {/* 选择器主体 */}
      <div className={`relative ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
        <div
          className={`
            flex items-center justify-between p-4 border-2 rounded-lg transition-all duration-200
            ${isOpen ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}
          `}
          onClick={() => !disabled && setIsOpen(!isOpen)}
        >
          <div className="flex items-center space-x-3">
            {selectedPileInfo ? (
              <>
                <selectedPileInfo.icon size={24} color={selectedPileInfo.color} />
                <div>
                  <p className="font-medium text-gray-900">{selectedPileInfo.name}</p>
                  <p className="text-sm text-gray-600">{selectedPileInfo.description}</p>
                </div>
              </>
            ) : (
              <>
                <FunctionalIcons.StructuralAnalysis size={24} color="#6b7280" />
                <div>
                  <p className="font-medium text-gray-900">选择桩基类型</p>
                  <p className="text-sm text-gray-600">请选择适合的桩基施工工艺</p>
                </div>
              </>
            )}
          </div>
          
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <FunctionalIcons.ExcavationDesign size={20} color="#6b7280" />
          </motion.div>
        </div>

        {/* 策略说明 */}
        {showStrategyExplanation && selectedPileInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-start space-x-2">
              <div className={`w-3 h-3 rounded-full mt-1 ${
                selectedPileInfo.strategy === PileModelingStrategy.BEAM_ELEMENT ? 'bg-blue-500' : 'bg-purple-500'
              }`} />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  建模策略：{selectedPileInfo.strategy === PileModelingStrategy.BEAM_ELEMENT ? '梁元模拟' : '壳元模拟'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {getStrategyExplanation(selectedPileInfo.strategy, selectedPileInfo.soilTreatment)}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 下拉选项 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
          >
            {/* 分组标题 - 置换型桩基 */}
            <div className="px-4 py-2 bg-blue-50 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full" />
                <span className="text-sm font-medium text-blue-800">置换型桩基 (梁元模拟)</span>
              </div>
              <p className="text-xs text-blue-600 mt-1">开挖/钻孔移除土体，承载主要靠桩身</p>
            </div>

            {availablePileTypes
              .filter(pile => pile.strategy === PileModelingStrategy.BEAM_ELEMENT)
              .map((pileInfo) => (
                <PileOption
                  key={pileInfo.type}
                  pileInfo={pileInfo}
                  isSelected={selectedPileInfo?.type === pileInfo.type}
                  onSelect={handleTypeSelect}
                />
              ))}

            {/* 分组标题 - 挤密型桩基 */}
            <div className="px-4 py-2 bg-purple-50 border-b border-gray-200 border-t border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full" />
                <span className="text-sm font-medium text-purple-800">挤密型桩基 (壳元模拟)</span>
              </div>
              <p className="text-xs text-purple-600 mt-1">搅拌/挤压处理土体，与土体共同承载</p>
            </div>

            {availablePileTypes
              .filter(pile => pile.strategy === PileModelingStrategy.SHELL_ELEMENT)
              .map((pileInfo) => (
                <PileOption
                  key={pileInfo.type}
                  pileInfo={pileInfo}
                  isSelected={selectedPileInfo?.type === pileInfo.type}
                  onSelect={handleTypeSelect}
                />
              ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// 桩基选项组件
const PileOption: React.FC<{
  pileInfo: PileTypeInfo;
  isSelected: boolean;
  onSelect: (pileInfo: PileTypeInfo) => void;
}> = ({ pileInfo, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        p-4 cursor-pointer transition-all duration-200 border-b border-gray-100 last:border-b-0
        ${isSelected ? 'bg-blue-50' : isHovered ? 'bg-gray-50' : 'bg-white'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onSelect(pileInfo)}
    >
      <div className="flex items-start space-x-3">
        <pileInfo.icon size={32} color={pileInfo.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">{pileInfo.name}</h4>
            {isSelected && (
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{pileInfo.description}</p>
          
          <div className="mt-2 space-y-1">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span>直径：{pileInfo.typicalDiameter}</span>
              <span>工艺：{pileInfo.constructionMethod}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              {pileInfo.applications.slice(0, 3).map((app, index) => (
                <span key={index} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                  {app}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PileTypeSelector;