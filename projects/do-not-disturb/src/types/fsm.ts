export type FSMState<TContext> = {
  readonly onEnter: (ctx: TContext) => void;
  readonly onUpdate: (ctx: TContext, dt: number) => void;
  readonly onExit: (ctx: TContext) => void;
};
