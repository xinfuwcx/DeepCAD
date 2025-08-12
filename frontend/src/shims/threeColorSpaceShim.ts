// Three.js color space & encoding compatibility shim
// Ensures legacy code expecting sRGBEncoding keeps working under newer Three.js
// and provides a fallback export for libraries referencing sRGBEncoding.
import * as THREE from 'three';

// Note: ESM import namespaces are immutable; don't assign properties on THREE.
// We only shim WebGLRenderer.outputEncoding to map to outputColorSpace.

// Patch WebGLRenderer prototype for code that still sets outputEncoding
const proto: any = (THREE as any).WebGLRenderer?.prototype;
if (proto && !Object.getOwnPropertyDescriptor(proto, 'outputEncoding')) {
  Object.defineProperty(proto, 'outputEncoding', {
    get() {
      // @ts-ignore
  return this.outputColorSpace || (THREE as any).SRGBColorSpace;
    },
    set(v) {
      // @ts-ignore Accept assignments and map to outputColorSpace when available
      if (this.outputColorSpace !== undefined) this.outputColorSpace = v;
    }
  });
}

export {};
