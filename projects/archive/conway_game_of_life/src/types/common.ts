export interface Disposable {
  dispose(): void
}

export interface UIComponent extends Disposable {
  mount(parent: HTMLElement): void
}
