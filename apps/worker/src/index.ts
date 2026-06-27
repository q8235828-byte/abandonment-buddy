export interface Env {
  API_ORIGIN: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.API_ORIGIN?.replace(/\/$/, '');
    if (!origin) {
      return new Response('API_ORIGIN not configured', { status: 503 });
    }

    const url = new URL(request.url);
    const target = `${origin}${url.pathname}${url.search}`;

    const proxyRequest = new Request(target, {
      method: request.method,
      headers: request.headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'follow',
    });

    return fetch(proxyRequest);
  },
} satisfies ExportedHandler<Env>;
