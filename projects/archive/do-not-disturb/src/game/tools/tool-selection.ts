import type { ToolType, MovementMode } from '../../types/state';

// Movement modes that block tool usage (speed/safety tradeoff)
const BLOCKED_MODES: readonly MovementMode[] = ['run', 'slide', 'jump'] as const;

export function selectTool(key: number, current: ToolType | null): ToolType | null {
  switch (key) {
    case 1: return current === 'throwable' ? null : 'throwable';
    case 2: return current === 'dndSign' ? null : 'dndSign';
    case 3: return current === 'lighter' ? null : 'lighter';
    default: return current;
  }
}

export function canUseTool(movementMode: MovementMode): boolean {
  return !BLOCKED_MODES.includes(movementMode);
}
