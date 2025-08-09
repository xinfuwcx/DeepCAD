import { createRoot } from 'react-dom/client';
import React from 'react';
import ProfessionalViewport3D from './components/ProfessionalViewport3D';
import { performanceMonitor } from './utils/performanceMonitor';

interface PV3DErrorBoundaryProps { children: React.ReactNode }
interface PV3DErrorBoundaryState { error: any }
class PV3DErrorBoundary extends React.Component<PV3DErrorBoundaryProps, PV3DErrorBoundaryState> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: any) { return { error }; }
  componentDidCatch(error: any, info: any) { console.error('[PV3D] runtime error', error, info); }
  render() {
    if (this.state.error) {
      return <div className="pv3d-error">
        <h2>PV3D 出错</h2>
        <pre>{String(this.state.error?.stack || this.state.error)}</pre>
        <a className="pv3d-reload" href={location.href}>Reload</a>
      </div>;
    }
  return this.props.children as any;
  }
}

const rootEl = document.getElementById('root')!;
const statusEl = document.getElementById('pv3d-status');
if (statusEl) statusEl.textContent = 'PV3D initializing...';

function App() {
  React.useEffect(() => {
    if (statusEl) statusEl.textContent = 'PV3D ready';
    return () => { if (statusEl) statusEl.textContent = 'PV3D disposed'; };
  }, []);
  const exportReport = React.useCallback(() => {
    const report = performanceMonitor.generateEnhancedReport();
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'deepcad-perf-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, []);
  return <>
    <div style={{ position:'fixed', top:6, right:8, zIndex:60, display:'flex', gap:8 }}>
      <button style={{ background:'#153654', color:'#9fd2ff', border:'1px solid #284b63', padding:'4px 10px', borderRadius:4, fontSize:11, cursor:'pointer' }} onClick={exportReport}>导出性能报告</button>
    </div>
    <ProfessionalViewport3D suppressLegacyToolbar />
  </>;
}

createRoot(rootEl).render(
  <PV3DErrorBoundary>
    <App />
  </PV3DErrorBoundary>
);
