import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingScreen from '../../../components/common/LoadingScreen';

describe('LoadingScreen', () => {
  it('渲染加载界面', () => {
    render(<LoadingScreen />);
    
    // 检查加载文本是否存在
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
}); 