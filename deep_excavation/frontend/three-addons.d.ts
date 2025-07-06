declare module 'three-addons' {
    export const BufferGeometryUtils: {
      mergeGeometries(geometries: THREE.BufferGeometry[], useGroups?: boolean): THREE.BufferGeometry | null;
    };
  } 