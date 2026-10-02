const upstream = 'https://fitshape-suplementos.gmsosdigital.chatgpt.site';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const token = process.env.FITSHAPE_ADMIN_BRIDGE_TOKEN;
  if (!token || token.length < 48) return res.status(503).json({error:'Painel ainda não conectado à loja.'});

  const url = new URL(req.url, `https://${req.headers.host}`);
  const action = url.searchParams.get('action');
  const routes = {
    catalog: {GET:'/api/catalog'},
    campaigns: {GET:'/api/campaigns',PUT:'/api/campaigns'},
    inventory: {PUT:'/api/inventory'},
    shipping: {PUT:'/api/shipping'},
    orders: {GET:'/api/orders?all=1'},
  };
  let path = routes[action]?.[req.method];
  if (action === 'order' && req.method === 'PATCH') {
    const id = url.searchParams.get('id') || '';
    if (/^FS-[a-f0-9-]{36}$/i.test(id)) path = `/api/orders/${encodeURIComponent(id)}`;
  }
  if (!path) return res.status(404).json({error:'Ação não encontrada.'});

  const writing = !['GET','HEAD'].includes(req.method);
  if (writing) {
    const origin = req.headers.origin;
    if (origin !== `https://${req.headers.host}`) return res.status(403).json({error:'Origem inválida.'});
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({error:'Use JSON.'});
    if (Buffer.byteLength(JSON.stringify(req.body ?? {})) > 50000) return res.status(413).json({error:'Solicitação muito grande.'});
  }
  try {
    const response = await fetch(upstream + path, {
      method: req.method,
      headers: {'Authorization': `Bearer ${token}`, 'Content-Type':'application/json'},
      body: writing ? JSON.stringify(req.body ?? {}) : undefined,
      signal: AbortSignal.timeout(12000),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({error:'Não foi possível falar com a loja. Tente novamente.'});
  }
}
