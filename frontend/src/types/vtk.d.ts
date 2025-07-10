// 声明缺失的 VTK 模块类型，避免 TypeScript 找不到声明报错
// 这里只给出 any 类型占位，后续可根据需要补充精确类型

declare module '@kitware/vtk.js/Filters/General/Glyph3D' {
  const value: any;
  export default value;
}

declare module '@kitware/vtk.js/Filters/Sources/ArrowSource' {
  const value: any;
  export default value;
} 