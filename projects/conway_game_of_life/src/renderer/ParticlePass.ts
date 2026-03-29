import type { Disposable, ShaderProgram } from './types.js'
import type { GLContext } from './GLContext.js'
import type { ParticlePool } from './ParticlePool.js'
import { PARTICLE_STRIDE } from '../constants.js'

type ParticleUniforms = 'u_viewMatrix' | 'u_canvasSize' | 'u_zoom'

const PARTICLE_VERT = `#version 300 es
layout(location = 0) in vec2 a_position;
layout(location = 1) in vec2 a_velocity;
layout(location = 2) in float a_life;
layout(location = 3) in vec3 a_color;

uniform mat3 u_viewMatrix;
uniform vec2 u_canvasSize;
uniform float u_zoom;

out float v_life;
out vec3 v_color;

void main() {
  vec3 pos = u_viewMatrix * vec3(a_position, 1.0);
  gl_Position = vec4(pos.xy, 0.0, 1.0);
  gl_PointSize = max(2.0, min(a_life * 15.0 * u_zoom, 20.0));
  v_life = a_life;
  v_color = a_color;
}
`

const PARTICLE_FRAG = `#version 300 es
precision highp float;

in float v_life;
in vec3 v_color;
layout(location = 0) out vec4 fragColor;

void main() {
  // Circular point sprite
  vec2 coord = gl_PointCoord - 0.5;
  float dist = length(coord);
  if (dist > 0.5) discard;

  float alpha = smoothstep(0.5, 0.1, dist) * v_life * 2.5;
  // Gamma correct the particle color
  vec3 color = pow(v_color, vec3(1.0 / 2.2));
  fragColor = vec4(color, alpha);
}
`

export class ParticlePass implements Disposable {
  private readonly ctx: GLContext
  private readonly shader: ShaderProgram<ParticleUniforms>
  private vao: WebGLVertexArrayObject
  private vbo: WebGLBuffer
  private maxPointSize: number

  constructor(ctx: GLContext) {
    this.ctx = ctx
    this.shader = ctx.createProgram<ParticleUniforms>(PARTICLE_VERT, PARTICLE_FRAG, [
      'u_viewMatrix', 'u_canvasSize', 'u_zoom',
    ])

    const { gl } = ctx

    // Check max point size
    const range = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array
    this.maxPointSize = range[1] ?? 64

    // Create VAO with interleaved attributes
    this.vao = gl.createVertexArray()!
    this.vbo = gl.createBuffer()!

    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)

    const stride = PARTICLE_STRIDE * 4 // bytes

    // a_position (x, y)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0)

    // a_velocity (vx, vy) — used in vertex shader for potential stretching
    gl.enableVertexAttribArray(1)
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8)

    // a_life
    gl.enableVertexAttribArray(2)
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 16)

    // a_color (r, g, b)
    gl.enableVertexAttribArray(3)
    gl.vertexAttribPointer(3, 3, gl.FLOAT, false, stride, 20)

    gl.bindVertexArray(null)
  }

  render(pool: ParticlePool, viewMatrix: Float32Array, canvasWidth: number, canvasHeight: number, zoom: number): void {
    if (pool.count === 0) return

    const { gl } = this.ctx

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    gl.useProgram(this.shader.program)
    const u = this.shader.uniforms
    gl.uniformMatrix3fv(u.u_viewMatrix, false, viewMatrix)
    gl.uniform2f(u.u_canvasSize, canvasWidth, canvasHeight)
    gl.uniform1f(u.u_zoom, zoom)

    gl.bindVertexArray(this.vao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo)
    gl.bufferData(gl.ARRAY_BUFFER, pool.buffer, gl.DYNAMIC_DRAW)

    gl.drawArrays(gl.POINTS, 0, pool.count)
    gl.bindVertexArray(null)
  }

  dispose(): void {
    const { gl } = this.ctx
    gl.deleteBuffer(this.vbo)
    gl.deleteVertexArray(this.vao)
  }
}
