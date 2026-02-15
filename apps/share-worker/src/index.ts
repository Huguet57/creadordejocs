import { loadProjectV1, serializeProjectV1 } from "@creadordejocs/project-format"

type ShareKv = {
  get(key: string): Promise<string | null>
  put(key: string, value: string): Promise<void>
}

export type ShareWorkerEnv = {
  SHARES_KV: ShareKv
}

type PublishPayload = {
  projectSource: string
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers)
  headers.set("access-control-allow-origin", "*")
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS")
  headers.set("access-control-allow-headers", "content-type")
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return withCors(
    new Response(JSON.stringify(body), {
      status: init?.status ?? 200,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {})
      }
    })
  )
}

function createShareId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 10)
}

async function publishProject(request: Request, env: ShareWorkerEnv): Promise<Response> {
  let payload: PublishPayload
  try {
    payload = (await request.json()) as PublishPayload
  } catch {
    return jsonResponse({ error: "invalid_json" }, { status: 400 })
  }

  if (typeof payload.projectSource !== "string" || !payload.projectSource.trim()) {
    return jsonResponse({ error: "invalid_project_source" }, { status: 400 })
  }

  try {
    const parsedProject = loadProjectV1(payload.projectSource)
    const shareId = createShareId()
    await env.SHARES_KV.put(shareId, serializeProjectV1(parsedProject))
    return jsonResponse({ id: shareId })
  } catch {
    return jsonResponse({ error: "invalid_project_format" }, { status: 400 })
  }
}

async function readPublishedProject(id: string, env: ShareWorkerEnv): Promise<Response> {
  const stored = await env.SHARES_KV.get(id)
  if (!stored) {
    return jsonResponse({ error: "share_not_found" }, { status: 404 })
  }
  return jsonResponse({ id, projectSource: stored })
}

export async function createShareWorkerHandler(request: Request, env: ShareWorkerEnv): Promise<Response> {
  const url = new URL(request.url)
  if (request.method === "OPTIONS") {
    return withCors(new Response(null, { status: 204 }))
  }

  if (request.method === "POST" && url.pathname === "/api/share") {
    return publishProject(request, env)
  }

  if (request.method === "GET" && url.pathname.startsWith("/api/share/")) {
    const shareId = url.pathname.slice("/api/share/".length).trim()
    if (!shareId) {
      return jsonResponse({ error: "share_not_found" }, { status: 404 })
    }
    return readPublishedProject(shareId, env)
  }

  return jsonResponse({ error: "not_found" }, { status: 404 })
}

export default {
  fetch(request: Request, env: ShareWorkerEnv) {
    return createShareWorkerHandler(request, env)
  }
}
