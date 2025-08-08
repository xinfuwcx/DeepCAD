import * as THREE from 'three';

// 安全移除 renderer.domElement 并释放 renderer
export function safeDetachRenderer(renderer?: { domElement?: HTMLElement; dispose?: () => void }) {
  if (!renderer || !renderer.domElement) return;
  try {
    const el = renderer.domElement;
    const parent = el.parentNode;
    if (parent && parent.contains(el)) {
      parent.removeChild(el);
    }
  } catch (e) {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[safeDetachRenderer] detach warning', e);
    }
  }
  try {
    renderer.dispose && renderer.dispose();
  } catch (e) {
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn('[safeDetachRenderer] dispose warning', e);
    }
  }
}

// 深度释放 Three.js 场景中的资源
export function deepDispose(object?: THREE.Object3D | null) {
  if (!object) return;
  object.traverse((child: any) => {
    if (child.geometry) {
      try { child.geometry.dispose(); } catch (_) {}
    }
    if (child.material) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((m: any) => {
        ['map','normalMap','roughnessMap','metalnessMap','alphaMap','envMap'].forEach(key => {
          if (m[key]) { try { m[key].dispose(); } catch (_) {} }
        });
        try { m.dispose && m.dispose(); } catch (_) {}
      });
    }
    if (child.texture) {
      try { child.texture.dispose(); } catch (_) {}
    }
  });
}
