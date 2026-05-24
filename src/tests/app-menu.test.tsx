import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AppMenu } from '@/components/AppMenu/AppMenu';

describe('AppMenu', () => {
  it('초기에는 닫혀 있음 (aria-expanded=false)', () => {
    render(<AppMenu />);
    const button = screen.getByRole('button', { name: '메뉴' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('버튼 클릭 시 펼침 + 이용가이드 링크 노출', () => {
    render(<AppMenu />);
    const button = screen.getByRole('button', { name: '메뉴' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    const link = screen.getByRole('link', { name: '이용가이드' });
    expect(link).toHaveAttribute('href', '/guide');
  });

  it('ESC 키로 닫힘', () => {
    render(<AppMenu />);
    const button = screen.getByRole('button', { name: '메뉴' });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('한 번 더 누르면 닫힘 (토글)', () => {
    render(<AppMenu />);
    const button = screen.getByRole('button', { name: '메뉴' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });
});
