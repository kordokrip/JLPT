import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AiAssistanceNotice } from './AiAssistanceNotice';

describe('AiAssistanceNotice', () => {
  it('announces a non-blocking availability notice politely', () => {
    render(<AiAssistanceNotice tone="info">AI 피드백은 개인정보 확인 후 사용할 수 있습니다.</AiAssistanceNotice>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
  });

  it('announces a blocking error as an alert', () => {
    render(<AiAssistanceNotice tone="error">입력에서 개인정보를 제거하세요.</AiAssistanceNotice>);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });
});
