import type { ShaderProgram, UniformLocations } from './types.js'

/** Shared fullscreen quad vertex shader (GLSL ES 3.00) */
export const FULLSCREEN_QUAD_VERT = `#version 300 es
layout(location = 0) in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

export class GLContext {
  readonly gl: WebGL2RenderingContext
  private quadVAO: WebGLVertexArrayObject | null = null

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    })
    if (!gl) throw new Error('WebGL2 not available')

    this.gl = gl

    // Required for rendering to RGBA16F framebuffers
    gl.getExtension('EXT_color_buffer_float')

    // Critical for R8 texture uploads (single-byte alignment)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
  }

  // --- Assert-on-create utilities ---

  createShader(type: number, source: string): WebGLShader {
    const { gl } = this
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Failed to create shader')
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`Shader compile error: ${info}`)
    }
    return shader
  }

  createProgram<T extends string>(
    vertSrc: string,
    fragSrc: string,
    uniformNames: readonly T[],
  ): ShaderProgram<T> {
    const { gl } = this
    const vert = this.createShader(gl.VERTEX_SHADER, vertSrc)
    const frag = this.createShader(gl.FRAGMENT_SHADER, fragSrc)

    const program = gl.createProgram()
    if (!program) throw new Error('Failed to create program')
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      gl.deleteProgram(program)
      throw new Error(`Program link error: ${info}`)
    }

    // Shaders no longer needed after linking
    gl.deleteShader(vert)
    gl.deleteShader(frag)

    const uniforms = this.getUniformLocations<T>(program, uniformNames)
    return { program, uniforms }
  }

  getUniformLocations<T extends string>(
    program: WebGLProgram,
    names: readonly T[],
  ): UniformLocations<T> {
    const { gl } = this
    const result = {} as Record<T, WebGLUniformLocation>
    for (const name of names) {
      const loc = gl.getUniformLocation(program, name)
      if (!loc) throw new Error(`Uniform '${name}' not found in shader`)
      result[name] = loc
    }
    return result as UniformLocations<T>
  }

  createTexture(
    width: number,
    height: number,
    internalFormat: number,
    format: number,
    type: number,
    data?: ArrayBufferView | null,
  ): WebGLTexture {
    const { gl } = this
    const tex = gl.createTexture()
    if (!tex) throw new Error('Failed to create texture')
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texStorage2D(gl.TEXTURE_2D, 1, internalFormat, width, height)
    if (data) {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, width, height, format, type, data)
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    return tex
  }

  createFramebuffer(texture: WebGLTexture): WebGLFramebuffer {
    const { gl } = this
    const fbo = gl.createFramebuffer()
    if (!fbo) throw new Error('Failed to create framebuffer')
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0)

    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (status !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: 0x${status.toString(16)}`)
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return fbo
  }

  /** Shared fullscreen quad VAO — created once, reused by all passes */
  bindFullscreenQuad(): void {
    const { gl } = this
    if (!this.quadVAO) {
      this.quadVAO = gl.createVertexArray()
      if (!this.quadVAO) throw new Error('Failed to create VAO')

      gl.bindVertexArray(this.quadVAO)
      const buf = gl.createBuffer()
      if (!buf) throw new Error('Failed to create buffer')
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  1, -1,  -1, 1,
        -1,  1,  1, -1,   1, 1,
      ]), gl.STATIC_DRAW)
      gl.enableVertexAttribArray(0)
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
      gl.bindVertexArray(null)
    }
    gl.bindVertexArray(this.quadVAO)
  }

  drawFullscreenQuad(): void {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, 6)
  }

  dispose(): void {
    // Context is owned by canvas — nothing to clean up here
    // Individual passes clean up their own resources
  }
}
