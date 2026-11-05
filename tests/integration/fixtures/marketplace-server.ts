import { createServer } from 'node:http';

/** Local transport fixture for automation adapters, NOT the marketplace implementation. */
export async function startMarketplaceFixture() {
  const state = {
    quantity: 1,
    priceText: '$50.00',
    failWrites: false,
    requests: [] as Array<{ method: string; path: string }>,
  };
  const server = createServer((request, response) => {
    const method = request.method ?? 'GET';
    const path = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
    state.requests.push({ method, path });
    const json = (status: number, body: unknown) => {
      response.writeHead(status, { 'content-type': 'application/json' });
      response.end(JSON.stringify(body));
    };
    if (method === 'GET' && path === '/diagnostics') return json(200, state.requests);
    if (method === 'GET' && path === '/api/cart') return json(200, { quantity: state.quantity });
    if (method !== 'GET') {
      if (state.failWrites) return json(503, { error: 'Injected local transport failure' });
      if (method === 'DELETE' && path === '/api/cart/items/local-fixture') state.quantity = 0;
      return json(200, { ok: true });
    }
    if (!['/', '/cart'].includes(path))
      return json(404, { error: 'Local fixture route not found' });
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    response.end(`<!doctype html><html lang="en"><head><title>Local adapter fixture</title></head>
      <body><div data-testid="cookie-banner">Client-ready fixture marker</div><main>
      <h1>Local automation contract fixture</h1>
      ${
        state.quantity > 0
          ? `<div data-testid="cart-line">
        <span data-testid="cart-subtotal">${state.priceText}</span>
        <span data-testid="cart-shipping">Free</span>
        <button data-testid="cart-line-remove" type="button"
          onclick="fetch('/api/cart/items/local-fixture', {method: 'DELETE'})">Remove item</button>
      </div>`
          : '<div data-testid="cart-empty">Your cart is empty</div>'
      }
      </main></body></html>`);
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Local fixture did not bind a port');
  return {
    url: `http://127.0.0.1:${address.port}`,
    state,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    },
  };
}
