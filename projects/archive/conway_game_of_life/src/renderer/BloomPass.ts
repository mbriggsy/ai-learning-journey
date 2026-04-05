import type { Disposable, ShaderProgram } from './types.js'
import { FULLSCREEN_QUAD_VERT, GLContext } from './GLContext.js'

// --- Bloom blur shader ---

type BloomUniforms = 'u_texture' | 'u_direction' | 'u_resolution'

const BLOOM_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
layout(location = 0) out vec4 fragColor;

uniform sampler2D u_texture;
uniform vec2 u_direction; // (1,0) for horizontal, (0,1) for vertical
uniform vec2 u_resolution;

// 9-tap Gaussian weights (sigma ~2.5)
const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec2 texelSize = u_direction / u_resolution;
  vec3 result = texture(u_texture, v_uv).rgb * weights[0];

  for (int i = 1; i < 5; i++) {
    vec2 offset = texelSize * float(i);
    result += texture(u_texture, v_uv + offset).rgb * weights[i];
    result += texture(u_texture, v_uv - offset).rgb * weights[i];
  }

  fragColor = vec4(result, 1.0);
}
`

// --- Composite shader (cell FBO + bloom + grid lines) ---

type CompositeUniforms = 'u_cellTexture' | 'u_bloomTexture' | 'u_bloomIntensity' | 'u_showGrid' | 'u_cellSize' | 'u_viewOffset' | 'u_viewSize'

const COMPOSITE_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
layout(location = 0) out vec4 fragColor;

uniform sampler2D u_cellTexture;
uniform sampler2D u_bloomTexture;
uniform float u_bloomIntensity;
uniform bool u_showGrid;
uniform float u_cellSize;
uniform vec2 u_viewOffset;
uniform vec2 u_viewSize;
const vec3 BG_COLOR = vec3(0.02, 0.02, 0.03);
const vec3 GRID_LINE_COLOR = vec3(0.051, 0.106, 0.165);

void main() {
  vec3 cell = texture(u_cellTexture, v_uv).rgb;
  vec3 bloom = texture(u_bloomTexture, v_uv).rgb;

  vec3 color = cell + bloom * u_bloomIntensity;

  // Background where no cell or bloom
  float brightness = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(BG_COLOR, color, step(0.001, brightness));

  // Grid lines (use camera-aware grid position)
  if (u_showGrid && u_cellSize > 4.0) {
    vec2 gridPos = u_viewOffset + v_uv * u_viewSize;
    vec2 grid = abs(fract(gridPos - 0.5) - 0.5);
    float line = min(grid.x, grid.y);
    float gridAlpha = 1.0 - smoothstep(0.0, 1.5 / u_cellSize, line);
    color = mix(color, GRID_LINE_COLOR, gridAlpha * 0.5);
  }

  // Gamma correction (linear → sRGB)
  color = pow(max(color, vec3(0.0)), vec3(1.0 / 2.2));

  fragColor = vec4(color, 1.0);
}
`

export class BloomPass implements Disposable {
  private readonly ctx: GLContext
  private readonly blurShader: ShaderProgram<BloomUniforms>
  readonly compositeShader: ShaderProgram<CompositeUniforms>

  // Quarter-res ping-pong FBOs
  private bloomTexA: WebGLTexture | null = null
  private bloomTexB: WebGLTexture | null = null
  private bloomFboA: WebGLFramebuffer | null = null
  private bloomFboB: WebGLFramebuffer | null = null
  private bloomWidth = 0
  private bloomHeight = 0

  constructor(ctx: GLContext) {
    this.ctx = ctx
    this.blurShader = ctx.createProgram<BloomUniforms>(FULLSCREEN_QUAD_VERT, BLOOM_FRAG, [
      'u_texture', 'u_direction', 'u_resolution',
    ])
    this.compositeShader = ctx.createProgram<CompositeUniforms>(FULLSCREEN_QUAD_VERT, COMPOSITE_FRAG, [
      'u_cellTexture', 'u_bloomTexture', 'u_bloomIntensity', 'u_showGrid', 'u_cellSize', 'u_viewOffset', 'u_viewSize',
    ])
  }

  /** Ensure quarter-res bloom FBOs match canvas size */
  ensureFBOs(canvasWidth: number, canvasHeight: number): void {
    const qw = Math.max(1, Math.floor(canvasWidth / 4))
    const qh = Math.max(1, Math.floor(canvasHeight / 4))
    if (this.bloomWidth === qw && this.bloomHeight === qh) return

    const { gl } = this.ctx

    if (this.bloomFboA) gl.deleteFramebuffer(this.bloomFboA)
    if (this.bloomFboB) gl.deleteFramebuffer(this.bloomFboB)
    if (this.bloomTexA) gl.deleteTexture(this.bloomTexA)
    if (this.bloomTexB) gl.deleteTexture(this.bloomTexB)

    // Create with LINEAR filtering for smooth upsampling during composite
    this.bloomTexA = this.createBloomTexture(qw, qh)
    this.bloomTexB = this.createBloomTexture(qw, qh)
    this.bloomFboA = this.ctx.createFramebuffer(this.bloomTexA)
    this.bloomFboB = this.ctx.createFramebuffer(this.bloomTexB)

    this.bloomWidth = qw
    this.bloomHeight = qh
  }

  private createBloomTexture(w: number, h: number): WebGLTexture {
    const { gl } = this.ctx
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, w, h)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return tex
  }

  /** Run 2-pass Gaussian blur on the cell FBO texture */
  blur(cellFboTexture: WebGLTexture): void {
    const { gl } = this.ctx
    gl.disable(gl.BLEND)
    gl.viewport(0, 0, this.bloomWidth, this.bloomHeight)

    gl.useProgram(this.blurShader.program)
    const u = this.blurShader.uniforms
    gl.uniform2f(u.u_resolution, this.bloomWidth, this.bloomHeight)

    // Horizontal pass: cellFBO → bloomFboA
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFboA)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, cellFboTexture)
    gl.uniform1i(u.u_texture, 0)
    gl.uniform2f(u.u_direction, 1, 0)

    this.ctx.bindFullscreenQuad()
    this.ctx.drawFullscreenQuad()

    // Vertical pass: bloomFboA → bloomFboB
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.bloomFboB)
    gl.bindTexture(gl.TEXTURE_2D, this.bloomTexA)
    gl.uniform2f(u.u_direction, 0, 1)

    this.ctx.drawFullscreenQuad()
  }

  /** Composite cell + bloom to default framebuffer */
  composite(
    cellFboTexture: WebGLTexture,
    canvasWidth: number,
    canvasHeight: number,
    showGrid: boolean,
    cellSize: number,
    viewOffset: [number, number],
    viewSize: [number, number],
  ): void {
    const { gl } = this.ctx

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvasWidth, canvasHeight)
    gl.disable(gl.BLEND)
    gl.clearColor(0.02, 0.02, 0.03, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    gl.useProgram(this.compositeShader.program)
    const u = this.compositeShader.uniforms

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, cellFboTexture)
    gl.uniform1i(u.u_cellTexture, 0)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.bloomTexB)
    gl.uniform1i(u.u_bloomTexture, 1)

    gl.uniform1f(u.u_bloomIntensity, 0.25)
    gl.uniform1i(u.u_showGrid, showGrid ? 1 : 0)
    gl.uniform1f(u.u_cellSize, cellSize)
    gl.uniform2f(u.u_viewOffset, viewOffset[0], viewOffset[1])
    gl.uniform2f(u.u_viewSize, viewSize[0], viewSize[1])

    this.ctx.bindFullscreenQuad()
    this.ctx.drawFullscreenQuad()
  }

  dispose(): void {
    const { gl } = this.ctx
    if (this.bloomFboA) gl.deleteFramebuffer(this.bloomFboA)
    if (this.bloomFboB) gl.deleteFramebuffer(this.bloomFboB)
    if (this.bloomTexA) gl.deleteTexture(this.bloomTexA)
    if (this.bloomTexB) gl.deleteTexture(this.bloomTexB)
  }
}
