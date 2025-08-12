// Wrapper module to provide legacy named exports removed in newer three versions.
// Important: import from the real package entry (not bare 'three') to avoid alias recursion.
import * as THREE_NS from 'three/src/Three.js';
export * from 'three/src/Three.js';

// three removed sRGBEncoding; some libs still import it directly from 'three'.
// Expose a compatible constant for those imports.
export const sRGBEncoding =
  // @ts-ignore - type presence differs across versions
  (THREE_NS as any).SRGBColorSpace ?? (THREE_NS as any).LinearSRGBColorSpace ?? 3000;
