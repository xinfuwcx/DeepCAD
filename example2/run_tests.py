#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Example2 测试运行器
运行所有单元测试并生成测试报告
"""

import sys
import unittest
import time
import os
from pathlib import Path
from io import StringIO


class ColoredTextTestResult(unittest.TextTestResult):
    """带颜色的测试结果"""

    def __init__(self, stream, descriptions, verbosity):
        super().__init__(stream, descriptions, verbosity)
        self.success_count = 0
        self._verbosity = verbosity  # 保存verbosity

    def addSuccess(self, test):
        super().addSuccess(test)
        self.success_count += 1
        if self._verbosity > 1:
            self.stream.write("✅ ")
            self.stream.writeln(self.getDescription(test))

    def addError(self, test, err):
        super().addError(test, err)
        if self._verbosity > 1:
            self.stream.write("❌ ")
            self.stream.writeln(self.getDescription(test))

    def addFailure(self, test, err):
        super().addFailure(test, err)
        if self._verbosity > 1:
            self.stream.write("❌ ")
            self.stream.writeln(self.getDescription(test))

    def addSkip(self, test, reason):
        super().addSkip(test, reason)
        if self._verbosity > 1:
            self.stream.write("⏭️  ")
            self.stream.writeln(f"{self.getDescription(test)} (跳过: {reason})")


class TestRunner:
    """测试运行器"""
    
    def __init__(self):
        self.project_root = Path(__file__).parent
        self.tests_dir = self.project_root / "tests"
        
        # 添加项目路径
        sys.path.insert(0, str(self.project_root))
        
    def discover_tests(self):
        """发现测试用例"""
        loader = unittest.TestLoader()
        
        # 发现所有测试
        test_suite = loader.discover(
            str(self.tests_dir),
            pattern='test_*.py',
            top_level_dir=str(self.project_root)
        )
        
        return test_suite
    
    def run_tests(self, verbosity=2):
        """运行测试"""
        print("🧪 Example2 单元测试")
        print("=" * 60)
        
        # 发现测试
        test_suite = self.discover_tests()
        
        # 统计测试数量
        test_count = test_suite.countTestCases()
        print(f"发现 {test_count} 个测试用例")
        print("-" * 60)
        
        # 运行测试
        start_time = time.time()
        
        # 使用自定义结果类
        runner = unittest.TextTestRunner(
            verbosity=verbosity,
            resultclass=ColoredTextTestResult,
            stream=sys.stdout
        )
        
        result = runner.run(test_suite)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # 打印总结
        self.print_summary(result, duration)
        
        return result.wasSuccessful()
    
    def print_summary(self, result, duration):
        """打印测试总结"""
        print("\n" + "=" * 60)
        print("📊 测试总结")
        print("=" * 60)
        
        total_tests = result.testsRun
        success_count = getattr(result, 'success_count', total_tests - len(result.failures) - len(result.errors))
        failure_count = len(result.failures)
        error_count = len(result.errors)
        skip_count = len(result.skipped)
        
        print(f"总测试数: {total_tests}")
        print(f"✅ 成功: {success_count}")
        print(f"❌ 失败: {failure_count}")
        print(f"💥 错误: {error_count}")
        print(f"⏭️  跳过: {skip_count}")
        print(f"⏱️  耗时: {duration:.2f}秒")
        
        # 计算成功率
        if total_tests > 0:
            success_rate = (success_count / total_tests) * 100
            print(f"📈 成功率: {success_rate:.1f}%")
        
        # 显示失败和错误详情
        if result.failures:
            print("\n❌ 失败的测试:")
            for test, traceback in result.failures:
                print(f"  - {test}")
        
        if result.errors:
            print("\n💥 错误的测试:")
            for test, traceback in result.errors:
                print(f"  - {test}")
        
        # 总体状态
        if result.wasSuccessful():
            print("\n🎉 所有测试通过!")
        else:
            print(f"\n⚠️  有 {failure_count + error_count} 个测试未通过")
    
    def run_specific_test(self, test_module):
        """运行特定测试模块"""
        print(f"🧪 运行测试模块: {test_module}")
        print("-" * 60)
        
        loader = unittest.TestLoader()
        
        try:
            # 加载特定模块
            suite = loader.loadTestsFromName(f"tests.{test_module}")
            
            runner = unittest.TextTestRunner(
                verbosity=2,
                resultclass=ColoredTextTestResult
            )
            
            result = runner.run(suite)
            return result.wasSuccessful()
            
        except Exception as e:
            print(f"❌ 加载测试模块失败: {e}")
            return False
    
    def run_coverage_analysis(self):
        """运行覆盖率分析"""
        try:
            import coverage
            
            print("📊 开始代码覆盖率分析...")
            
            # 创建覆盖率对象
            cov = coverage.Coverage(source=['core', 'modules', 'utils', 'gui'])
            cov.start()
            
            # 运行测试
            success = self.run_tests(verbosity=1)
            
            # 停止覆盖率收集
            cov.stop()
            cov.save()
            
            # 生成报告
            print("\n📈 代码覆盖率报告:")
            print("-" * 60)
            cov.report()
            
            # 生成HTML报告
            html_dir = self.project_root / "htmlcov"
            cov.html_report(directory=str(html_dir))
            print(f"\n📄 HTML报告已生成: {html_dir}/index.html")
            
            return success
            
        except ImportError:
            print("⚠️  coverage包未安装，跳过覆盖率分析")
            print("安装命令: pip install coverage")
            return self.run_tests()


def main():
    """主函数"""
    runner = TestRunner()
    
    # 解析命令行参数
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "coverage":
            # 运行覆盖率分析
            success = runner.run_coverage_analysis()
        elif command.startswith("test_"):
            # 运行特定测试模块
            test_module = command
            success = runner.run_specific_test(test_module)
        elif command == "help":
            print("Example2 测试运行器")
            print("用法:")
            print("  python run_tests.py              # 运行所有测试")
            print("  python run_tests.py coverage     # 运行覆盖率分析")
            print("  python run_tests.py test_xxx     # 运行特定测试模块")
            print("  python run_tests.py help         # 显示帮助")
            return True
        else:
            print(f"未知命令: {command}")
            print("使用 'python run_tests.py help' 查看帮助")
            return False
    else:
        # 运行所有测试
        success = runner.run_tests()
    
    # 返回适当的退出码
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
