import type { FSMState } from '../types/fsm';

export function createFSM<TContext>(
  initialState: FSMState<TContext>,
  ctx: TContext,
) {
  let current = initialState;
  current.onEnter(ctx); // explicit init (insight 008)

  return {
    get currentState() { return current; },
    transition(next: FSMState<TContext>) {
      if (next === current) return;
      current.onExit(ctx);
      current = next;
      current.onEnter(ctx);
    },
    update(dt: number) {
      current.onUpdate(ctx, dt);
    },
  };
}
