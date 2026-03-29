import type { GridBuffers } from '../types/simulation.js'
import type { Disposable, ShaderProgram } from './types.js'
import { FULLSCREEN_QUAD_VERT, GLContext } from './GLContext.js'

type CellUniforms = 'u_cellTexture' | 'u_ageTexture' | 'u_time' | 'u_gridSize' | 'u_viewOffset' | 'u_viewSize'

const CELL_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
layout(location = 0) out vec4 fragColor;

uniform sampler2D u_cellTexture;
uniform sampler2D u_ageTexture;
uniform float u_time;
uniform vec2 u_gridSize;
uniform vec2 u_viewOffset;
uniform vec2 u_viewSize;

const vec3 YOUNG_COLOR  = vec3(0.310, 0.765, 0.969);
const vec3 MATURE_COLOR = vec3(1.000, 0.702, 0.000);
const vec3 ANCIENT_COLOR = vec3(0.808, 0.576, 0.847);

void main() {
  // Map UV through camera view to grid cell position
  vec2 gridPos = u_viewOffset + v_uv * u_viewSize;

  // Discard pixels outside the grid
  if (gridPos.x < 0.0 || gridPos.x > u_gridSize.x ||
      gridPos.y < 0.0 || gridPos.y > u_gridSize.y) discard;

  vec2 cellUV = fract(gridPos);
  vec2 texCoord = (floor(gridPos) + 0.5) / u_gridSize;

  // R8 normalized: alive=1 maps to 1/255 ≈ 0.004
  float alive = texture(u_cellTexture, texCoord).r;
  if (alive < 0.003) discard;

  float age = texture(u_ageTexture, texCoord).r;

  // Circular cell SDF
  float dist = length(cellUV - 0.5);
  float radius = 0.38 + 0.02 * sin(u_time * 2.0 + age * 10.0);
  if (dist > radius) discard;

  // Age-based color: young blue → mature gold → ancient purple
  vec3 color;
  float ageNorm = age * 255.0;
  if (ageNorm < 30.0) {
    color = mix(YOUNG_COLOR, MATURE_COLOR, ageNorm / 30.0);
  } else {
    color = mix(MATURE_COLOR, ANCIENT_COLOR, min((ageNorm - 30.0) / 70.0, 1.0));
  }

  // Intensity boost near center (glow core)
  float glow = 1.0 + 0.5 * smoothstep(0.3, 0.0, dist);
  color *= glow;

  fragColor = vec4(color, 1.0);
}
`

export class CellPass implements Disposable {
  private readonly ctx: GLContext
  private readonly shader: ShaderProgram<CellUniforms>
  private cellTexture: WebGLTexture | null = null
  private ageTexture: WebGLTexture | null = null
  private texWidth = 0
  private texHeight = 0

  // FBO for linear-space rendering
  fboTexture: WebGLTexture | null = null
  fbo: WebGLFramebuffer | null = null
  fboWidth = 0
  fboHeight = 0

  constructor(ctx: GLContext) {
    this.ctx = ctx
    this.shader = ctx.createProgram<CellUniforms>(FULLSCREEN_QUAD_VERT, CELL_FRAG, [
      'u_cellTexture', 'u_ageTexture', 'u_time', 'u_gridSize', 'u_viewOffset', 'u_viewSize',
    ])
  }

  /** Ensure RGBA16F FBO matches canvas size */
  ensureFBO(width: number, height: number): void {
    if (this.fboWidth === width && this.fboHeight === height) return
    const { gl } = this.ctx

    if (this.fbo) gl.deleteFramebuffer(this.fbo)
    if (this.fboTexture) gl.deleteTexture(this.fboTexture)

    this.fboTexture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.fboTexture)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, width, height)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.fbo = this.ctx.createFramebuffer(this.fboTexture)
    this.fboWidth = width
    this.fboHeight = height
  }

  /** Ensure data textures match grid size */
  private ensureDataTextures(width: number, height: number): void {
    if (this.texWidth === width && this.texHeight === height) return
    const { gl } = this.ctx

    if (this.cellTexture) gl.deleteTexture(this.cellTexture)
    if (this.ageTexture) gl.deleteTexture(this.ageTexture)

    this.cellTexture = this.ctx.createTexture(width, height, gl.R8, gl.RED, gl.UNSIGNED_BYTE)
    this.ageTexture = this.ctx.createTexture(width, height, gl.R8, gl.RED, gl.UNSIGNED_BYTE)
    this.texWidth = width
    this.texHeight = height
  }

  /** Upload grid data and render cells to FBO */
  render(buffers: GridBuffers, time: number, viewOffset: [number, number], viewSize: [number, number]): void {
    const { gl } = this.ctx
    const { width, height, stride } = buffers

    this.ensureDataTextures(width, height)

    // Upload cell data with padded buffer striding
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, stride)
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 1)
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 1)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.cellTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.UNSIGNED_BYTE, buffers.cells as Uint8Array)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.ageTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.UNSIGNED_BYTE, buffers.ages as Uint8Array)

    // Reset pixel store params
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0)
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0)
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0)

    // Render to RGBA16F FBO
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.viewport(0, 0, this.fboWidth, this.fboHeight)
    gl.disable(gl.BLEND)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(this.shader.program)
    const u = this.shader.uniforms
    gl.uniform1i(u.u_cellTexture, 0)
    gl.uniform1i(u.u_ageTexture, 1)
    gl.uniform1f(u.u_time, time)
    gl.uniform2f(u.u_gridSize, width, height)
    gl.uniform2f(u.u_viewOffset, viewOffset[0], viewOffset[1])
    gl.uniform2f(u.u_viewSize, viewSize[0], viewSize[1])

    this.ctx.bindFullscreenQuad()
    this.ctx.drawFullscreenQuad()
  }

  dispose(): void {
    const { gl } = this.ctx
    if (this.cellTexture) gl.deleteTexture(this.cellTexture)
    if (this.ageTexture) gl.deleteTexture(this.ageTexture)
    if (this.fbo) gl.deleteFramebuffer(this.fbo)
    if (this.fboTexture) gl.deleteTexture(this.fboTexture)
  }
}
