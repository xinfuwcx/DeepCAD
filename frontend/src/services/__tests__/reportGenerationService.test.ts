/**
 * 深基坑工程报告生成服务单元测试
 * 3号计算专家 - 报告生成系统验证
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { DeepExcavationReportGenerator } from '../reportGenerationService';
import { STANDARD_EXCAVATION_CASES } from '../../test/fixtures/testData';
import type { DeepExcavationResults, SafetyAssessmentResults, ReportConfiguration } from '../../types';

describe('DeepExcavationReportGenerator - 深基坑工程报告生成', () => {
  let reportGenerator: DeepExcavationReportGenerator;
  let mockConfig: ReportConfiguration;
  let mockResults: DeepExcavationResults;
  let mockSafetyResults: SafetyAssessmentResults;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock报告配置
    mockConfig = {
      engineer: {
        name: '张工程师',
        license: 'A12345678',
        company: '深基坑设计院'
      },
      project: {
        standards: ['GB50330-2013', 'JGJ120-2012'],
        reportFormat: 'pdf',
        includeCalculationDetails: true
      }
    };

    // Mock深基坑分析结果
    const testCase = STANDARD_EXCAVATION_CASES.smallScale;
    mockResults = {
      projectInfo: {
        name: '测试深基坑项目',
        code: 'TEST-EXCAVATION-001',
        location: '北京市朝阳区'
      },
      geometry: testCase.parameters.geometry,
      soilProperties: testCase.parameters.soilProperties,
      retainingSystem: testCase.parameters.retainingSystem,
      deformationField: {
        maxDisplacement: 22.5,
        magnitude: new Float32Array([15, 18, 22.5, 20, 16, 12, 8, 5]),
        vectors: new Float32Array(24),
        displacementComponents: {
          horizontal: new Float32Array([15, 18, 22.5, 20, 16, 12, 8, 5]),
          vertical: new Float32Array([2, 3, 4, 3, 2, 1, 0.5, 0])
        }
      },
      stressField: {
        vonMisesStress: new Float32Array([120000, 150000, 180000, 160000, 140000, 100000, 80000, 60000]),
        components: {
          sigmaX: new Float32Array([100000, 120000, 150000, 130000, 110000, 80000, 60000, 40000]),
          sigmaY: new Float32Array([80000, 100000, 120000, 110000, 90000, 70000, 50000, 30000]),
          sigmaZ: new Float32Array([60000, 80000, 100000, 90000, 70000, 50000, 40000, 20000]),
          tauXY: new Float32Array([20000, 25000, 30000, 25000, 20000, 15000, 10000, 5000]),
          tauYZ: new Float32Array([10000, 12000, 15000, 12000, 10000, 8000, 5000, 2000]),
          tauZX: new Float32Array([15000, 18000, 22000, 18000, 15000, 12000, 8000, 4000])
        },
        principalStresses: {
          sigma1: new Float32Array([140000, 170000, 200000, 180000, 160000, 120000, 90000, 70000]),
          sigma2: new Float32Array([100000, 130000, 150000, 140000, 120000, 90000, 70000, 50000]),
          sigma3: new Float32Array([60000, 80000, 100000, 90000, 70000, 50000, 40000, 20000])
        }
      },
      seepageField: {
        velocityMagnitude: new Float32Array([0.0001, 0.0002, 0.0003, 0.0002, 0.0001, 0.00008, 0.00005, 0.00002]),
        velocityVectors: new Float32Array(24),
        poreWaterPressure: new Float32Array([50000, 60000, 80000, 70000, 60000, 40000, 30000, 20000]),
        hydraulicGradient: new Float32Array([0.1, 0.15, 0.2, 0.15, 0.1, 0.08, 0.05, 0.02])
      },
      supportSystem: {
        levels: [
          {
            elevation: -1.5,
            force: 250,
            stress: 180000,
            displacement: 15
          }
        ]
      },
      mesh: {
        vertices: new Float32Array(Array.from({length: 300}, () => Math.random() * 100)),
        faces: new Uint32Array(Array.from({length: 294}, (_, i) => i % 100)),
        normals: new Float32Array(300),
        totalVolume: 12000
      }
    };

    // Mock安全性评估结果
    mockSafetyResults = {
      overallSafetyFactor: 1.35,
      deformationSafety: true,
      stressSafety: true,
      seepageSafety: true,
      stabilitySafety: true,
      deformationSafetyFactor: 1.33,
      stressSafetyFactor: 1.67,
      seepageSafetyFactor: 1.5,
      riskFactors: ['基坑深度较大，需加强监测'],
      recommendations: [
        '严格按施工顺序进行',
        '加强变形监测',
        '确保支撑及时安装'
      ]
    };

    reportGenerator = new DeepExcavationReportGenerator(mockConfig);
  });

  describe('报告生成器初始化', () => {
    test('应正确初始化报告生成器', () => {
      expect(reportGenerator).toBeDefined();
      expect(reportGenerator.generateReport).toBeDefined();
      expect(reportGenerator.exportToPDF).toBeDefined();
      expect(reportGenerator.exportToWord).toBeDefined();
    });

    test('应正确设置配置参数', () => {
      const generator = new DeepExcavationReportGenerator(mockConfig);
      expect(generator).toBeDefined();
    });
  });

  describe('完整报告生成', () => {
    test('应成功生成标准深基坑分析报告', async () => {
      const startTime = performance.now();
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults, 'standard');
      const generationTime = performance.now() - startTime;

      // 验证报告结构
      expect(report).toBeDefined();
      expect(report.title).toBe('深基坑支护设计分析报告');
      expect(report.metadata).toBeDefined();
      expect(report.sections).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.attachments).toBeDefined();

      // 验证生成时间合理
      expect(generationTime).toBeLessThan(5000); // 5秒内完成

      // 验证报告章节完整性
      expect(report.sections.length).toBeGreaterThan(8);
      
      const sectionTitles = report.sections.map(s => s.title);
      expect(sectionTitles).toContain('项目概述');
      expect(sectionTitles).toContain('工程地质条件');
      expect(sectionTitles).toContain('变形分析结果');
      expect(sectionTitles).toContain('应力分析结果');
      expect(sectionTitles).toContain('安全性评估');
      expect(sectionTitles).toContain('结论与建议');
    });

    test('应正确生成报告元数据', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);

      expect(report.metadata.projectName).toBe('测试深基坑项目');
      expect(report.metadata.engineerName).toBe('张工程师');
      expect(report.metadata.softwareVersion).toBe('DeepCAD v2.0');
      expect(report.metadata.analysisType).toBe('深基坑土-结构耦合分析');
      expect(report.metadata.standardsUsed).toContain('GB50330-2013');
      expect(report.metadata.generationDate).toBeInstanceOf(Date);
    });

    test('应正确生成报告摘要', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);

      expect(report.summary.overallSafetyRating).toBe('good'); // 安全系数1.35
      expect(report.summary.keyFindings).toBeDefined();
      expect(report.summary.keyFindings.length).toBeGreaterThan(0);
      expect(report.summary.recommendations).toBeDefined();
      expect(report.summary.criticalIssues).toBeDefined();

      // 验证关键发现包含重要信息
      const findingsText = report.summary.keyFindings.join(' ');
      expect(findingsText).toContain('安全系数');
      expect(findingsText).toContain('位移');
    });
  });

  describe('项目概述章节生成', () => {
    test('应正确生成项目概述内容', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      const overviewSection = report.sections.find(s => s.title === '项目概述');

      expect(overviewSection).toBeDefined();
      expect(overviewSection!.content).toContain('测试深基坑项目');
      expect(overviewSection!.content).toContain('基坑深度');
      expect(overviewSection!.content).toContain('支护形式');

      // 验证表格数据
      expect(overviewSection!.tables.length).toBeGreaterThan(0);
      const paramTable = overviewSection!.tables[0];
      expect(paramTable.title).toBe('基坑基本参数');
      expect(paramTable.headers).toContain('参数');
      expect(paramTable.headers).toContain('数值');
    });
  });

  describe('地质条件章节生成', () => {
    test('应正确生成地质条件内容', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      const geoSection = report.sections.find(s => s.title === '工程地质条件');

      expect(geoSection).toBeDefined();
      expect(geoSection!.content).toContain('地层分布');
      expect(geoSection!.content).toContain('填土');
      expect(geoSection!.content).toContain('粘土');

      // 验证土层参数表格
      expect(geoSection!.tables.length).toBeGreaterThan(0);
      const soilTable = geoSection!.tables[0];
      expect(soilTable.title).toBe('土层物理力学参数');
      expect(soilTable.rows.length).toBe(mockResults.soilProperties!.layers.length);
    });
  });

  describe('变形分析章节生成', () => {
    test('应正确生成变形分析内容', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      const deformSection = report.sections.find(s => s.title === '变形分析结果');

      expect(deformSection).toBeDefined();
      expect(deformSection!.content).toContain('22.50 mm'); // 最大位移
      expect(deformSection!.content).toContain('满足要求'); // 22.5 < 30
      expect(deformSection!.content).toContain('变形控制措施');

      // 验证图表数据
      expect(deformSection!.charts.length).toBeGreaterThan(0);
      const displacementChart = deformSection!.charts[0];
      expect(displacementChart.title).toContain('水平位移');
      expect(displacementChart.type).toBe('line');

      // 验证变形结果表格
      expect(deformSection!.tables.length).toBeGreaterThan(0);
      const resultTable = deformSection!.tables[0];
      expect(resultTable.title).toBe('关键位置变形结果');
    });
  });

  describe('应力分析章节生成', () => {
    test('应正确生成应力分析内容', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      const stressSection = report.sections.find(s => s.title === '应力分析结果');

      expect(stressSection).toBeDefined();
      expect(stressSection!.content).toContain('180.00 kPa'); // 最大应力
      expect(stressSection!.content).toContain('应力水平合理'); // 180 < 300
      expect(stressSection!.content).toContain('支撑结构应力分析');

      // 验证应力结果表格
      expect(stressSection!.tables.length).toBeGreaterThan(0);
      const stressTable = stressSection!.tables[0];
      expect(stressTable.title).toBe('关键截面应力结果');
      expect(stressTable.headers).toContain('von Mises(kPa)');
    });
  });

  describe('安全性评估章节生成', () => {
    test('应正确生成安全性评估内容', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      const safetySection = report.sections.find(s => s.title === '安全性评估');

      expect(safetySection).toBeDefined();
      expect(safetySection!.content).toContain('1.35'); // 安全系数
      expect(safetySection!.content).toContain('良好'); // 安全等级
      expect(safetySection!.content).toContain('满足要求');

      // 验证安全性评估表格
      expect(safetySection!.tables.length).toBeGreaterThan(0);
      const safetyTable = safetySection!.tables[0];
      expect(safetyTable.title).toBe('安全性评估汇总');
      expect(safetyTable.headers).toContain('安全系数');
    });
  });

  describe('报告导出功能', () => {
    test('应能导出PDF格式报告', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      
      const pdfBlob = await reportGenerator.exportToPDF(report);
      
      expect(pdfBlob).toBeInstanceOf(Blob);
      expect(pdfBlob.type).toBe('application/pdf');
      expect(pdfBlob.size).toBeGreaterThan(0);
    });

    test('应能导出Word格式报告', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      
      const wordBlob = await reportGenerator.exportToWord(report);
      
      expect(wordBlob).toBeInstanceOf(Blob);
      expect(wordBlob.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      expect(wordBlob.size).toBeGreaterThan(0);
    });
  });

  describe('不同安全等级报告生成', () => {
    test('应正确处理优秀安全等级', async () => {
      mockSafetyResults.overallSafetyFactor = 1.6;
      
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      
      expect(report.summary.overallSafetyRating).toBe('excellent');
      
      const conclusionsSection = report.sections.find(s => s.title === '结论与建议');
      expect(conclusionsSection!.content).toContain('技术先进、安全可靠');
    });

    test('应正确处理临界安全等级', async () => {
      mockSafetyResults.overallSafetyFactor = 1.1;
      
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      
      expect(report.summary.overallSafetyRating).toBe('critical');
      expect(report.summary.criticalIssues.length).toBeGreaterThan(0);
      
      const conclusionsSection = report.sections.find(s => s.title === '结论与建议');
      expect(conclusionsSection!.content).toContain('存在安全风险');
    });

    test('应正确处理超限变形情况', async () => {
      mockResults.deformationField!.maxDisplacement = 35; // 超过30mm限值
      
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      
      expect(report.summary.criticalIssues.length).toBeGreaterThan(0);
      expect(report.summary.criticalIssues[0]).toContain('变形超出控制标准');
      
      const deformSection = report.sections.find(s => s.title === '变形分析结果');
      expect(deformSection!.content).toContain('超出限值');
    });
  });

  describe('报告附件生成', () => {
    test('应正确生成计算数据附件', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      
      expect(report.attachments.length).toBeGreaterThan(0);
      
      const calculationAttachment = report.attachments.find(a => a.type === 'calculation');
      expect(calculationAttachment).toBeDefined();
      expect(calculationAttachment!.name).toBe('计算数据.json');
      expect(calculationAttachment!.content).toBeInstanceOf(Blob);
      expect(calculationAttachment!.description).toContain('计算数据结果');
    });
  });

  describe('错误处理', () => {
    test('应正确处理无效模板ID', async () => {
      await expect(
        reportGenerator.generateReport(mockResults, mockSafetyResults, 'invalid_template')
      ).rejects.toThrow('报告模板 invalid_template 不存在');
    });

    test('应正确处理缺失数据', async () => {
      const incompleteResults = {
        ...mockResults,
        deformationField: undefined
      };
      
      // 应该能处理缺失数据，使用默认值
      const report = await reportGenerator.generateReport(incompleteResults, mockSafetyResults);
      
      expect(report).toBeDefined();
      expect(report.sections.length).toBeGreaterThan(0);
    });
  });

  describe('性能测试', () => {
    test('报告生成应在合理时间内完成', async () => {
      const startTime = performance.now();
      
      await reportGenerator.generateReport(mockResults, mockSafetyResults);
      
      const generationTime = performance.now() - startTime;
      expect(generationTime).toBeLessThan(3000); // 3秒内完成
    });

    test('大型项目报告生成性能测试', async () => {
      // 创建大规模数据
      const largeResults = {
        ...mockResults,
        mesh: {
          vertices: new Float32Array(30000), // 10000个顶点
          faces: new Uint32Array(29994),
          normals: new Float32Array(30000),
          totalVolume: 50000
        },
        deformationField: {
          ...mockResults.deformationField!,
          magnitude: new Float32Array(10000),
          vectors: new Float32Array(30000)
        }
      };
      
      const startTime = performance.now();
      
      const report = await reportGenerator.generateReport(largeResults, mockSafetyResults);
      
      const generationTime = performance.now() - startTime;
      expect(generationTime).toBeLessThan(8000); // 8秒内完成大型项目报告
      expect(report.sections.length).toBeGreaterThan(8);
    });
  });

  describe('报告内容质量验证', () => {
    test('应包含所有必要的工程信息', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      
      const fullContent = report.sections.map(s => s.content).join(' ');
      
      // 验证包含关键工程术语
      expect(fullContent).toContain('土-结构耦合');
      expect(fullContent).toContain('安全系数');
      expect(fullContent).toContain('围护结构');
      expect(fullContent).toContain('基坑开挖');
      expect(fullContent).toContain('变形控制');
      expect(fullContent).toContain('应力分布');
      expect(fullContent).toContain('渗流稳定性');
    });

    test('应符合工程报告规范格式', async () => {
      const report = await reportGenerator.generateReport(mockResults, mockSafetyResults);
      
      // 验证章节编号
      const sectionContents = report.sections.map(s => s.content);
      expect(sectionContents[0]).toMatch(/^## 1\./); // 第一章
      expect(sectionContents[1]).toMatch(/^## 2\./); // 第二章
      
      // 验证表格完整性
      const tablesCount = report.sections.reduce((sum, s) => sum + s.tables.length, 0);
      expect(tablesCount).toBeGreaterThan(3);
      
      // 验证所有表格都有标题和数据
      report.sections.forEach(section => {
        section.tables.forEach(table => {
          expect(table.title).toBeDefined();
          expect(table.headers.length).toBeGreaterThan(0);
          expect(table.rows.length).toBeGreaterThan(0);
        });
      });
    });
  });
});