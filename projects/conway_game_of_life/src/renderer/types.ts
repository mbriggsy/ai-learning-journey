export type UniformLocations<T extends string> = Readonly<Record<T, WebGLUniformLocation>>

export interface ShaderProgram<T extends string> {
  readonly program: WebGLProgram
  readonly uniforms: UniformLocations<T>
}

export interface Disposable {
  dispose(): void
}
