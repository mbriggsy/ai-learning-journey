import type { GridBuffers } from '../types/simulation.js'
import type { Disposable, ShaderProgram } from './types.js'
import { FULLSCREEN_QUAD_VERT, GLContext } from './GLContext.js'
import { GHOST_DECAY_GENERATIONS, GHOST_MAX_OPACITY } from '../constants.js'

type GhostUniforms = 'u_ghostTexture' | 'u_ageTexture' | 'u_gridSize'

const GHOST_FRAG = `#version 300 es
precision highp float;

in vec2 v_uv;
layout(location = 0) out vec4 fragColor;

uniform sampler2D u_ghostTexture;
uniform sampler2D u_ageTexture;
uniform vec2 u_gridSize;

const vec3 YOUNG_COLOR  = vec3(0.310, 0.765, 0.969);
const vec3 MATURE_COLOR = vec3(1.000, 0.702, 0.000);
const vec3 ANCIENT_COLOR = vec3(0.808, 0.576, 0.847);
const float GHOST_MAX_OPACITY = ${GHOST_MAX_OPACITY.toFixed(2)};
const float GHOST_DECAY = ${GHOST_DECAY_GENERATIONS.toFixed(1)};

void main() {
  vec2 gridPos = v_uv * u_gridSize;
  vec2 texCoord = (floor(gridPos) + 0.5) / u_gridSize;

  float ghostVal = texture(u_ghostTexture, texCoord).r * 255.0;
  if (ghostVal < 0.5) discard;

  float age = texture(u_ageTexture, texCoord).r;
  float ageNorm = age * 255.0;

  // Color inherits from last age before death
  vec3 color;
  if (ageNorm < 30.0) {
    color = mix(YOUNG_COLOR, MATURE_COLOR, ageNorm / 30.0);
  } else {
    color = mix(MATURE_COLOR, ANCIENT_COLOR, min((ageNorm - 30.0) / 70.0, 1.0));
  }

  float alpha = (ghostVal / GHOST_DECAY) * GHOST_MAX_OPACITY;
  fragColor = vec4(color, alpha);
}
`

export class GhostPass implements Disposable {
  private readonly ctx: GLContext
  private readonly shader: ShaderProgram<GhostUniforms>
  private ghostTexture: WebGLTexture | null = null
  private ageTexture: WebGLTexture | null = null
  private texWidth = 0
  private texHeight = 0

  constructor(ctx: GLContext) {
    this.ctx = ctx
    this.shader = ctx.createProgram<GhostUniforms>(FULLSCREEN_QUAD_VERT, GHOST_FRAG, [
      'u_ghostTexture', 'u_ageTexture', 'u_gridSize',
    ])
  }

  private ensureTextures(width: number, height: number): void {
    if (this.texWidth === width && this.texHeight === height) return
    const { gl } = this.ctx

    if (this.ghostTexture) gl.deleteTexture(this.ghostTexture)
    if (this.ageTexture) gl.deleteTexture(this.ageTexture)

    this.ghostTexture = this.ctx.createTexture(width, height, gl.R8, gl.RED, gl.UNSIGNED_BYTE)
    this.ageTexture = this.ctx.createTexture(width, height, gl.R8, gl.RED, gl.UNSIGNED_BYTE)
    this.texWidth = width
    this.texHeight = height
  }

  render(buffers: GridBuffers, canvasWidth: number, canvasHeight: number): void {
    const { gl } = this.ctx
    const { width, height, stride } = buffers

    this.ensureTextures(width, height)

    // Upload with padded striding
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, stride)
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 1)
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 1)

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.ghostTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.UNSIGNED_BYTE, buffers.ghosts as Uint8Array)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.ageTexture)
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, gl.RED, gl.UNSIGNED_BYTE, buffers.ages as Uint8Array)

    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, 0)
    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, 0)
    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, 0)

    // Alpha blend onto default framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvasWidth, canvasHeight)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    gl.useProgram(this.shader.program)
    const u = this.shader.uniforms
    gl.uniform1i(u.u_ghostTexture, 0)
    gl.uniform1i(u.u_ageTexture, 1)
    gl.uniform2f(u.u_gridSize, width, height)

    this.ctx.bindFullscreenQuad()
    this.ctx.drawFullscreenQuad()
  }

  dispose(): void {
    const { gl } = this.ctx
    if (this.ghostTexture) gl.deleteTexture(this.ghostTexture)
    if (this.ageTexture) gl.deleteTexture(this.ageTexture)
  }
}
