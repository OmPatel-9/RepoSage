"use client"

import type { FormEvent } from "react"
import { useEffect, useRef, useState } from "react"
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  FileCode2,
  GitBranch,
  MousePointer2,
  Pause,
  Search,
  ShieldCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"

type Citation = {
  endLine: number
  htmlUrl: string
  path: string
  startLine: number
  summary: string
}

type AskResponse = {
  answer: string
  citations: Citation[]
  repo: {
    defaultBranch: string
    description: string | null
    fileCount: number
    fullName: string
    language: string | null
    scannedFiles: number
    stars: number
    truncated: boolean
  }
}

const pipelineSteps = [
  "Clone public repo",
  "Chunk code by symbol",
  "Embed locally",
  "Answer with sources",
]

export default function ShaderAnimation() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5 })
  const interactiveRef = useRef(true)
  const [isInteractive, setIsInteractive] = useState(true)
  const [repoUrl, setRepoUrl] = useState("https://github.com/vercel/next.js")
  const [question, setQuestion] = useState("What does this codebase do?")
  const [answer, setAnswer] = useState(
    "Paste a public GitHub repo, ask a question, and RepoSage will scan likely source files for cited evidence."
  )
  const [citations, setCitations] = useState<Citation[]>([])
  const [repoSummary, setRepoSummary] = useState<AskResponse["repo"] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAsking, setIsAsking] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext("webgl", {
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    })

    if (!gl) {
      console.error("WebGL not supported")
      return
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `

    const fragmentShaderSource = `
      precision mediump float;

      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec2 u_mouse;

      vec3 palette(float t) {
        vec3 a = vec3(0.50, 0.50, 0.50);
        vec3 b = vec3(0.45, 0.42, 0.36);
        vec3 c = vec3(1.00, 1.00, 1.00);
        vec3 d = vec3(0.07, 0.33, 0.52);

        return a + b * cos(6.28318 * (c * t + d));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec2 uv0 = uv;
        uv = uv * 2.0 - 1.0;
        uv.x *= u_resolution.x / u_resolution.y;

        float d = length(uv);
        vec3 col = vec3(0.0);

        for(float i = 0.0; i < 4.0; i++) {
          uv = fract(uv * 1.5) - 0.5;

          d = length(uv) * exp(-length(uv0));
          vec3 color = palette(length(uv0) + i * 0.4 + u_time * 0.01);

          d = sin(d * 4.0 + u_time) / 36.0;
          d = pow(0.005 / d, 1.5);

          vec2 mouseEffect = u_mouse - uv0;
          float mouseDist = length(mouseEffect);
          d *= 1.0 + sin(mouseDist * 10.0 - u_time * 2.0) * 0.1;

          col += color * d;
        }

        float wave = sin(uv0.x * 2.0 + u_time) * 0.01;
        col += vec3(wave);

        vec3 gradient1 = vec3(0.02, 0.14, 0.16);
        vec3 gradient2 = vec3(0.92, 0.31, 0.18);
        vec3 gradientMix = mix(gradient1, gradient2, uv0.y + sin(u_time) * 0.2);
        col = mix(col, gradientMix, 0.32);

        gl_FragColor = vec4(col, 1.0);
      }
    `

    function createShader(
      context: WebGLRenderingContext,
      type: number,
      source: string
    ) {
      const shader = context.createShader(type)
      if (!shader) return null

      context.shaderSource(shader, source)
      context.compileShader(shader)

      if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
        console.error("Shader compilation error:", context.getShaderInfoLog(shader))
        context.deleteShader(shader)
        return null
      }

      return shader
    }

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    if (!program) return

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program linking error:", gl.getProgramInfoLog(program))
      return
    }

    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1])

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const positionLocation = gl.getAttribLocation(program, "a_position")
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution")
    const timeLocation = gl.getUniformLocation(program, "u_time")
    const mouseLocation = gl.getUniformLocation(program, "u_mouse")
    const startTime = performance.now()

    const handleResize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.floor(canvas.clientWidth * pixelRatio)
      const height = Math.floor(canvas.clientHeight * pixelRatio)

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        gl.viewport(0, 0, width, height)
      }
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!interactiveRef.current) return

      mouseRef.current.x = event.clientX / window.innerWidth
      mouseRef.current.y = 1 - event.clientY / window.innerHeight
    }

    const render = () => {
      handleResize()

      const currentTime = (performance.now() - startTime) * 0.001

      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform1f(timeLocation, currentTime)
      gl.uniform2f(mouseLocation, mouseRef.current.x, mouseRef.current.y)

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

      animationRef.current = requestAnimationFrame(render)
    }

    window.addEventListener("resize", handleResize)
    window.addEventListener("mousemove", handleMouseMove)
    render()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }

      window.removeEventListener("resize", handleResize)
      window.removeEventListener("mousemove", handleMouseMove)
      gl.deleteBuffer(positionBuffer)
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
    }
  }, [])

  const toggleInteractive = () => {
    setIsInteractive((current) => {
      interactiveRef.current = !current
      return !current
    })
  }

  const handleAsk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsAsking(true)
    setError(null)
    setAnswer("Scanning public repository files and ranking matches...")
    setCitations([])

    try {
      const response = await fetch("/api/ask", {
        body: JSON.stringify({ question, repoUrl }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
      const payload = (await response.json()) as AskResponse & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "RepoSage could not answer that yet.")
      }

      setAnswer(payload.answer)
      setCitations(payload.citations)
      setRepoSummary(payload.repo)
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong while asking RepoSage."
      )
      setAnswer("The scan did not finish. Check the repo URL and try again.")
    } finally {
      setIsAsking(false)
    }
  }

  const repoStats = [
    {
      label: "Files ranked",
      value: repoSummary ? repoSummary.fileCount.toLocaleString() : "Ready",
    },
    {
      label: "Files scanned",
      value: repoSummary ? repoSummary.scannedFiles.toLocaleString() : "0",
    },
    {
      label: "Citations",
      value: citations.length ? citations.length.toLocaleString() : "0",
    },
  ]

  const sourceFiles =
    citations.length > 0
      ? citations.map(
          (citation) =>
            `${citation.path}:${citation.startLine}-${citation.endLine}`
        )
      : ["Ask a question to generate cited sources."]

  return (
    <main className="shader-container relative min-h-dvh overflow-hidden bg-stone-950 text-white">
      <canvas
        ref={canvasRef}
        className="shader-canvas absolute inset-0 size-full"
        aria-hidden="true"
      />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_26%),linear-gradient(90deg,rgba(6,9,10,0.92),rgba(6,9,10,0.58)_52%,rgba(6,9,10,0.82))]" />

      <div className="controls absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleInteractive}
          className="interactive-toggle border-white/20 bg-black/25 text-white shadow-lg backdrop-blur-xl hover:bg-white/15 hover:text-white"
        >
          {isInteractive ? <MousePointer2 /> : <Pause />}
          {isInteractive ? "Interactive" : "Static"}
        </Button>
      </div>

      <section className="content-overlay relative z-10 flex min-h-dvh items-center px-4 py-20 sm:px-6 lg:px-10">
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(480px,1.1fr)] lg:items-center">
          <div className="space-y-7 [animation:fadeInUp_700ms_ease-out_both]">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1 text-sm text-white/82 backdrop-blur-md">
              <ShieldCheck className="size-4 text-emerald-200" />
              Local embeddings by default
            </div>

            <div className="space-y-4">
              <h1 className="title max-w-3xl text-5xl font-semibold leading-[0.95] tracking-normal text-white sm:text-6xl lg:text-7xl">
                RepoSage
              </h1>
              <p className="subtitle max-w-2xl text-lg leading-8 text-white/76 sm:text-xl">
                Paste a GitHub repo, index it, and ask grounded questions with
                file-level citations.
              </p>
            </div>

            <form
              onSubmit={handleAsk}
              className="max-w-2xl rounded-md border border-white/14 bg-black/28 p-3 shadow-2xl shadow-black/25 backdrop-blur-xl"
            >
              <label className="sr-only" htmlFor="repo-url">
                GitHub repository URL
              </label>
              <label className="sr-only" htmlFor="repo-question">
                Question
              </label>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)_auto]">
                <div className="flex min-h-12 items-center gap-3 rounded-md border border-white/10 bg-white/95 px-3 text-stone-950">
                  <GitBranch className="size-5 text-stone-500" />
                  <input
                    id="repo-url"
                    type="url"
                    value={repoUrl}
                    onChange={(event) => setRepoUrl(event.target.value)}
                    placeholder="https://github.com/vercel/next.js"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400 sm:text-base"
                  />
                </div>
                <div className="flex min-h-12 items-center gap-3 rounded-md border border-white/10 bg-white/95 px-3 text-stone-950">
                  <Search className="size-5 text-stone-500" />
                  <input
                    id="repo-question"
                    type="text"
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Where is auth handled?"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400 sm:text-base"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={isAsking}
                  className="h-12 bg-emerald-300 px-5 text-stone-950 hover:bg-emerald-200 disabled:opacity-70"
                >
                  {isAsking ? "Scanning" : "Ask repo"}
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </div>
              {error ? (
                <p className="mt-3 text-sm text-red-100">{error}</p>
              ) : null}
            </form>

            <div className="grid max-w-2xl grid-cols-3 gap-2">
              {repoStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-md border border-white/12 bg-white/10 p-3 backdrop-blur-md"
                >
                  <div className="text-xl font-semibold text-white sm:text-2xl">
                    {stat.value}
                  </div>
                  <div className="mt-1 text-xs text-white/62">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 [animation:fadeInUp_900ms_120ms_ease-out_both]">
            <div className="rounded-md border border-white/14 bg-stone-950/68 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <p className="text-sm text-white/60">Indexing</p>
                  <h2 className="text-xl font-semibold tracking-normal">
                    {repoSummary?.fullName ?? "Paste a public GitHub repo"}
                  </h2>
                </div>
                <div className="rounded-md bg-emerald-300 px-2.5 py-1 text-xs font-medium text-stone-950">
                  {isAsking ? "Scanning" : repoSummary ? "Answered" : "Ready"}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {pipelineSteps.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-md border border-white/10 bg-white/[0.07] p-3"
                  >
                    <CheckCircle2 className="mb-3 size-5 text-emerald-200" />
                    <p className="text-sm leading-5 text-white/78">{step}</p>
                    <div className="mt-3 h-1 rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-300"
                        style={{
                          width: `${
                            repoSummary || isAsking ? 100 - index * 18 : 24
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
              <div className="rounded-md border border-white/14 bg-white/[0.09] p-4 backdrop-blur-2xl">
                <div className="mb-4 flex items-center gap-2 text-sm font-medium text-white/76">
                  <FileCode2 className="size-4 text-amber-200" />
                  Sources
                </div>
                <div className="space-y-2">
                  {sourceFiles.map((file) => (
                    <div
                      key={file}
                      className="rounded-md border border-white/10 bg-black/25 px-3 py-2 font-mono text-xs text-white/72"
                    >
                      {file}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-white/14 bg-white/[0.92] p-4 text-stone-950 shadow-xl">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Bot className="size-4 text-stone-600" />
                    Ask RepoSage
                  </div>
                  <Search className="size-4 text-stone-400" />
                </div>

                <div className="rounded-md bg-stone-100 p-3 text-sm text-stone-700">
                  {question}
                </div>
                <div className="mt-3 rounded-md border border-stone-200 bg-white p-3 text-sm leading-6 text-stone-700">
                  {answer}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {citations.slice(0, 3).map((citation) => (
                      <a
                        key={`${citation.path}-${citation.startLine}`}
                        href={citation.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-stone-900 px-2 py-1 font-mono text-xs text-white"
                      >
                        {citation.path}:{citation.startLine}-{citation.endLine}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
