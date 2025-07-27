/**
 * 桩基类型选择器组件
 * 0号架构师 - 基于专业桩基分类和建模策略
 * 实现置换型和挤密型桩基的专业化选择界面
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PileType, 
  PileModelingStrategy, 
  EnhancedPileClassification,
  pileModelingService 
} from '../services';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';

interface PileTypeSelectorProps {
  onTypeSelect: (pileType: PileType, strategy: PileModelingStrategy) => void;
  selectedType?: PileType;
  showTechnicalDetails?: boolean;
}

interface PileTypeCardProps {
  classification: EnhancedPileClassification;
  isSelected: boolean;
  onSelect: () => void;
  showDetails: boolean;
}

const PileTypeCard: React.FC<PileTypeCardProps> = ({
  classification,
  isSelected,
  onSelect,
  showDetails
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const getStrategyColor = (strategy: PileModelingStrategy) => {
    return strategy === PileModelingStrategy.BEAM_ELEMENT ? 'blue' : 'green';
  };

  const getStrategyIcon = (strategy: PileModelingStrategy) => {
    return strategy === PileModelingStrategy.BEAM_ELEMENT 
      ? FunctionalIcons.StructuralEngineering 
      : FunctionalIcons.SoilImprovement;
  };

  const StrategyIcon = getStrategyIcon(classification.modelingStrategy);
  const strategyColor = getStrategyColor(classification.modelingStrategy);

  return (
    <motion.div
      className={`pile-type-card relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
        isSelected 
          ? `border-${strategyColor}-500 bg-${strategyColor}-500/10` 
          : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      layout
    >
      {/* 桩基类型头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{classification.icon}</div>
          <div>
            <h3 className="font-medium text-gray-900">{classification.name}</h3>
            <div className={`flex items-center space-x-1 text-xs text-${strategyColor}-600`}>
              <StrategyIcon size={12} />
              <span>{classification.modelingStrategy}</span>
            </div>
          </div>
        </div>
        
        {/* 选中指示器 */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={`w-6 h-6 bg-${strategyColor}-500 rounded-full flex items-center justify-center`}
          >
            <FunctionalIcons.Check size={14} className="text-white" />
          </motion.div>
        )}
      </div>

      {/* 基本描述 */}
      <p className="text-sm text-gray-600 mb-3 leading-relaxed">
        {classification.description}
      </p>

      {/* 技术参数快览 */}
      {showDetails && (
        <div className="bg-gray-50 rounded p-2 mb-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-medium">直径范围:</span>
              <div className="text-gray-600">
                {classification.technicalParameters.typicalDiameter[0]}-
                {classification.technicalParameters.typicalDiameter[1]}mm
              </div>
            </div>
            <div>
              <span className="font-medium">长度范围:</span>
              <div className="text-gray-600">
                {classification.technicalParameters.typicalLength[0]}-
                {classification.technicalParameters.typicalLength[1]}m
              </div>
            </div>
            <div>
              <span className="font-medium">承载力:</span>
              <div className="text-gray-600">
                {classification.technicalParameters.bearingCapacity[0]}-
                {classification.technicalParameters.bearingCapacity[1]}kN
              </div>
            </div>
            <div>
              <span className="font-medium">适用深度:</span>
              <div className="text-gray-600">
                {classification.technicalParameters.applicableDepth[0]}-
                {classification.technicalParameters.applicableDepth[1]}m
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 优缺点 */}
      <div className="space-y-2">
        <div>
          <div className="flex items-center space-x-1 mb-1">
            <FunctionalIcons.Advantages size={12} className="text-green-500" />
            <span className="text-xs font-medium text-green-700">优点</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {classification.advantages.slice(0, 3).map((advantage, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
              >
                {advantage}
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center space-x-1 mb-1">
            <FunctionalIcons.Warning size={12} className="text-orange-500" />
            <span className="text-xs font-medium text-orange-700">注意事项</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {classification.disadvantages.slice(0, 2).map((disadvantage, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded"
              >
                {disadvantage}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 详细信息切换 */}
      <motion.button
        className={`w-full mt-3 py-1 text-xs text-${strategyColor}-600 hover:text-${strategyColor}-800 flex items-center justify-center space-x-1`}
        onClick={(e) => {
          e.stopPropagation();
          setShowAdvanced(!showAdvanced);
        }}
      >
        <span>{showAdvanced ? '收起详情' : '查看详情'}</span>
        <motion.div
          animate={{ rotate: showAdvanced ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FunctionalIcons.ChevronDown size={12} />
        </motion.div>
      </motion.button>

      {/* 高级详情 */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
              {/* 适用条件 */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">适用条件</h4>
                <ul className="space-y-1">
                  {classification.applicableConditions.map((condition, index) => (
                    <li key={index} className="text-xs text-gray-600 flex items-start space-x-1">
                      <span className="text-gray-400">•</span>
                      <span>{condition}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 施工工艺 */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">施工工艺</h4>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 bg-${strategyColor}-100 text-${strategyColor}-700 text-xs rounded`}>
                    {classification.constructionMethod}
                  </span>
                  <span className={`px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded`}>
                    {classification.soilTreatment === 'displacement' ? '置换型' : '挤密型'}
                  </span>
                </div>
              </div>

              {/* 承载机理 */}
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">承载机理</h4>
                <span className="text-xs text-gray-600">
                  {classification.loadMechanism === 'friction_end_bearing' 
                    ? '侧阻 + 端阻' 
                    : '复合地基承载'}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const PileTypeSelector: React.FC<PileTypeSelectorProps> = ({
  onTypeSelect,
  selectedType,
  showTechnicalDetails = false
}) => {
  const [activeStrategy, setActiveStrategy] = useState<PileModelingStrategy | null>(null);

  // 按建模策略分组桩基类型
  const pileGroups = pileModelingService.groupPilesByStrategy();

  const handleTypeSelect = (pileType: PileType) => {
    const classification = pileModelingService.getPileClassification(pileType);
    onTypeSelect(pileType, classification.modelingStrategy);
  };

  const getStrategyDescription = (strategy: PileModelingStrategy) => {
    const descriptions = {
      [PileModelingStrategy.BEAM_ELEMENT]: {
        title: '置换型桩基 (梁元建模)',
        description: '通过开挖或钻孔移除土体，桩身直接承载荷载，采用梁元素进行数值建模',
        icon: FunctionalIcons.StructuralEngineering,
        color: 'blue',
        characteristics: ['主要靠桩身承载', '侧阻力+端阻力', '一维线单元建模', '适用于硬质桩基']
      },
      [PileModelingStrategy.SHELL_ELEMENT]: {
        title: '挤密型桩基 (壳元建模)',
        description: '通过搅拌或挤压改良土体，与土体协同承载形成复合地基，采用壳元素建模',
        icon: FunctionalIcons.SoilImprovement,
        color: 'green',
        characteristics: ['复合地基承载', '桩土协同工作', '三维体单元建模', '适用于软质改良桩']
      }
    };
    return descriptions[strategy];
  };

  return (
    <div className="pile-type-selector space-y-6">
      {/* 标题和说明 */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">桩基类型选择</h2>
        <p className="text-sm text-gray-600">
          基于土体处理方式和建模策略的专业桩基分类
        </p>
      </div>

      {/* 建模策略切换 */}
      <div className="flex justify-center space-x-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeStrategy === null || activeStrategy === PileModelingStrategy.BEAM_ELEMENT
              ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
              : 'bg-gray-100 text-gray-600 border-2 border-gray-200'
          }`}
          onClick={() => setActiveStrategy(
            activeStrategy === PileModelingStrategy.BEAM_ELEMENT ? null : PileModelingStrategy.BEAM_ELEMENT
          )}
        >
          <FunctionalIcons.StructuralEngineering size={16} className="inline mr-1" />
          置换型 (梁元)
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeStrategy === null || activeStrategy === PileModelingStrategy.SHELL_ELEMENT
              ? 'bg-green-100 text-green-700 border-2 border-green-300'
              : 'bg-gray-100 text-gray-600 border-2 border-gray-200'
          }`}
          onClick={() => setActiveStrategy(
            activeStrategy === PileModelingStrategy.SHELL_ELEMENT ? null : PileModelingStrategy.SHELL_ELEMENT
          )}
        >
          <FunctionalIcons.SoilImprovement size={16} className="inline mr-1" />
          挤密型 (壳元)
        </button>
      </div>

      {/* 桩基类型网格 */}
      <div className="space-y-8">
        {Object.entries(pileGroups)
          .filter(([strategy]) => 
            activeStrategy === null || strategy === activeStrategy
          )
          .map(([strategy, classifications]) => {
            const strategyInfo = getStrategyDescription(strategy as PileModelingStrategy);
            const StrategyIcon = strategyInfo.icon;

            return (
              <motion.div
                key={strategy}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="pile-strategy-group"
              >
                {/* 策略组头部 */}
                <div className={`bg-${strategyInfo.color}-50 rounded-lg p-4 mb-4 border border-${strategyInfo.color}-200`}>
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 bg-${strategyInfo.color}-100 rounded-lg`}>
                      <StrategyIcon size={24} className={`text-${strategyInfo.color}-600`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`font-medium text-${strategyInfo.color}-900 mb-1`}>
                        {strategyInfo.title}
                      </h3>
                      <p className={`text-sm text-${strategyInfo.color}-700 mb-2`}>
                        {strategyInfo.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {strategyInfo.characteristics.map((char, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 bg-${strategyInfo.color}-100 text-${strategyInfo.color}-700 text-xs rounded`}
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 桩基类型卡片网格 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classifications.map((classification) => (
                    <PileTypeCard
                      key={classification.type}
                      classification={classification}
                      isSelected={selectedType === classification.type}
                      onSelect={() => handleTypeSelect(classification.type)}
                      showDetails={showTechnicalDetails}
                    />
                  ))}
                </div>
              </motion.div>
            );
          })}
      </div>

      {/* 技术说明 */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <div className="flex items-center space-x-2 mb-3">
          <FunctionalIcons.Information size={16} className="text-blue-500" />
          <span className="font-medium text-gray-900">建模策略说明</span>
        </div>
        <div className="space-y-2 text-sm text-gray-600">
          <p>
            <strong>置换型桩基 (BEAM_ELEMENT):</strong> 
            适用于钻孔灌注桩、人工挖孔桩等通过移除土体成桩的桩基类型。
            采用梁元素建模，主要考虑桩身的侧阻力和端阻力。
          </p>
          <p>
            <strong>挤密型桩基 (SHELL_ELEMENT):</strong> 
            适用于水泥土搅拌桩、CFG桩等通过改良土体形成复合地基的桩基类型。
            采用壳元素建模，考虑桩土协同承载效应。
          </p>
        </div>
      </div>
    </div>
  );
};

export default PileTypeSelector;