export type NodeRequest = { method?: string; url?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
export type NodeResponse = { status(code: number): NodeResponse; setHeader(name: string, value: string | string[]): void; send(body: Buffer): void };

export function nodeHandler(handle: (request: Request) => Response | Promise<Response>) {
  return async (req: NodeRequest, res: NodeResponse) => {
    const headers = new Headers();
    for (const [name, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) for (const item of value) headers.append(name, item);
      else if (value !== undefined) headers.set(name, value);
    }
    const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "albury-house.vercel.app";
    const protocol = headers.get("x-forwarded-proto") ?? "https";
    const method = req.method ?? "GET";
    let body: BodyInit | undefined;
    if (method !== "GET" && method !== "HEAD") {
      if (typeof req.body === "string" || req.body instanceof Uint8Array) body = req.body as BodyInit;
      else body = JSON.stringify(req.body ?? {});
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
    const response = await handle(new Request(`${protocol}://${host}${req.url ?? "/"}`, { method, headers, body }));
    res.status(response.status);
    response.headers.forEach((value, name) => res.setHeader(name, value));
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.send(Buffer.from(await response.arrayBuffer()));
  };
}
