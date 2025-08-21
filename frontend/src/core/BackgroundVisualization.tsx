import React, { useEffect, useMemo, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

// Simple animated particle field (instanced) as background layer
const ParticleField: React.FC = () => {
  const count = 1500;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 2000;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2000;
    }
    return arr;
  }, [count]);

  return (
    <points rotation={[0, 0, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={4} sizeAttenuation color="#00ffff" transparent opacity={0.55} />
    </points>
  );
};

// enableEffects 通常由全局 visualSettingsStore.enablePostFX 控制
export const BackgroundVisualization: React.FC<{ enableEffects?: boolean }> = ({ enableEffects }) => {
  // Inner component to safely decide whether to enable postprocessing
  const SafeComposer: React.FC = () => {
    const renderer = useThree((s) => s.gl);
    const [ready, setReady] = useState(false);

    useEffect(() => {
      let cancelled = false;
      // Defer a tick so R3F fully mounts the WebGLRenderer before we probe it
      const raf = requestAnimationFrame(() => {
        try {
          const ctx: any = (renderer as any)?.getContext?.();
          const attrs = ctx?.getContextAttributes?.();
          // Only enable when effects are requested and WebGL attributes are valid
          if (!cancelled && enableEffects && ctx && attrs && typeof attrs.alpha === 'boolean') {
            setReady(true);
          } else if (!cancelled) {
            setReady(false);
          }
        } catch {
          if (!cancelled) setReady(false);
        }
      });
      return () => {
        cancelled = true;
        cancelAnimationFrame(raf);
      };
    }, [renderer, enableEffects]);

    if (!ready) return null;
    return (
      <EffectComposer>
        <Bloom intensity={0.6} mipmapBlur luminanceThreshold={0.1} />
      </EffectComposer>
    );
  };

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0, zIndex: 1 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      dpr={Math.min(window.devicePixelRatio, 2)}
      camera={{ position: [0, 0, 1200], fov: 60 }}
    >
      <color attach="background" args={[0x000010]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[300, 500, 200]} intensity={1.2} />
      <ParticleField />
      <SafeComposer />
    </Canvas>
  );
};
