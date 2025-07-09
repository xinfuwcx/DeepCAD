@echo off
echo 运行深基坑CAE系统测试...

echo 1. 运行单元测试
call npm test

echo 2. 生成测试覆盖率报告
call npm run test:coverage

echo 测试完成！
pause 