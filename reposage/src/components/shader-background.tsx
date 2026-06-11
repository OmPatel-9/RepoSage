'use client'

import { useEffect, useRef } from 'react'

const VERTEX_SHADER = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`

// Subtle drifting color fields in the site palette (paper, mint, moss).
// Output is premultiplied alpha so the body grid shows through.
const FRAGMENT_SHADER = `
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * 0.06;

  float n1 = sin(p.x * 1.6 + t) * cos(p.y * 1.2 - t * 0.8);
  float n2 = sin((p.x + p.y) * 1.1 - t * 0.6);
  float field = n1 * 0.5 + n2 * 0.5;

  vec3 mint = vec3(0.769, 0.882, 0.851);
  vec3 moss = vec3(0.678, 0.812, 0.337);

  float a = smoothstep(0.25, 1.0, field * 0.5 + 0.5);
  float b = smoothstep(0.45, 1.0, sin(p.y * 1.8 + t * 0.7) * 0.5 + 0.5);

  vec3 color = mix(mint, moss, b * 0.45);
  float alpha = a * 0.16;

  gl_FragColor = vec4(color * alpha, alpha);
}
`

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
    })
    if (!gl) return

    const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vertex || !fragment) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
    const timeLocation = gl.getUniformLocation(program, 'u_time')

    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(canvas.clientWidth * dpr)
      canvas.height = Math.floor(canvas.clientHeight * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener('resize', resize)

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches

    let frame = 0
    const start = performance.now()

    const render = (): void => {
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform1f(timeLocation, (performance.now() - start) / 1000)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reducedMotion) {
        frame = requestAnimationFrame(render)
      }
    }
    render()

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      gl.deleteProgram(program)
      gl.deleteShader(vertex)
      gl.deleteShader(fragment)
      gl.deleteBuffer(buffer)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  )
}
