import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRef } from 'react';
import TouchControls from '../components/TouchControls/TouchControls';

function Harness({ enabled, onJump }: { enabled: boolean; onJump: () => void }) {
  const joystickRef = useRef({ x: 0, y: 0, active: false });
  return <TouchControls joystickRef={joystickRef} onJump={onJump} enabled={enabled} />;
}

describe('TouchControls', () => {
  it('enabled=false 면 아무것도 렌더하지 않는다', () => {
    const { container } = render(<Harness enabled={false} onJump={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('enabled=true 면 점프 버튼을 렌더하고 pointerdown 시 onJump 호출', () => {
    const onJump = vi.fn();
    render(<Harness enabled onJump={onJump} />);
    const btn = screen.getByRole('button', { name: '점프' });
    fireEvent.pointerDown(btn);
    expect(onJump).toHaveBeenCalledTimes(1);
  });
});
