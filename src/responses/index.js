export function daResp({ body, status, contentType }) {
  const headers = new Headers();
  headers.append('Access-Control-Allow-Origin', '*');
  headers.append('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.append('Access-Control-Allow-Headers', 'authorization');

  if (contentType)
    headers.append('Content-Type', contentType);

  return new Response(body, { status, headers });
}

export function get404() {
  return daResp({ body: '', status: 404 });
}

export function getRobots() {
  const body = `User-agent: *
Disallow: /`;

  return daResp({ body, status: 200 });
}
