// This file is used to declare modules that don't have explicit TypeScript definitions.
// This is common for complex libraries like VTK.js where the module system
// is not always standard. By declaring them here, we tell TypeScript to
// trust that these modules exist and to treat them as type 'any'.

declare module '@kitware/vtk.js/Filters/General' {
    const vtkGlyph3D: any;
    export { vtkGlyph3D };
} 