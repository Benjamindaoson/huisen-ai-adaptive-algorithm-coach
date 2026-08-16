import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../App.css', import.meta.url), 'utf8');

function declaration(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

describe('Mentor prediction readability contract', () => {
  it('keeps learner-facing controls at readable sizes', () => {
    expect(declaration('.mentor-prediction label')).toMatch(/font-size:\s*14px/);
    expect(declaration('.mentor-prediction input')).toMatch(/font-size:\s*14px/);
    expect(declaration('.mentor-prediction button')).toMatch(/font-size:\s*14px/);
    expect(declaration('.mentor-prediction small')).toMatch(/font-size:\s*var\(--font-size-meta\)/);
  });

  it('stacks the action instead of shrinking text in a narrow Mentor panel', () => {
    expect(css).toMatch(/@media\s*\(max-width:420px\)[\s\S]*?\.mentor-prediction>div:last-of-type\s*\{[^}]*flex-direction:\s*column/);
    expect(css).toMatch(/@media\s*\(max-width:420px\)[\s\S]*?\.mentor-prediction button\s*\{[^}]*width:\s*100%/);
  });
});
