export interface FSMState<TContext> {
  readonly name: string;
  onEnter(ctx: TContext): void;
  onUpdate(ctx: TContext, dt: number): void;
  onExit(ctx: TContext): void;
}
