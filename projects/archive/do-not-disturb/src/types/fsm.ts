export type FSMState<TContext> = {
  readonly onEnter: (ctx: TContext) => void;
  readonly onUpdate: (ctx: TContext, dt: number) => void;
  readonly onExit: (ctx: TContext) => void;
};

export type FSMRunner<TContext> = {
  readonly currentState: FSMState<TContext>;
  transition(next: FSMState<TContext>): void;
  update(dt: number): void;
};
