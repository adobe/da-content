export function daResp({ body, status, contentType }) {
  const headers = new Headers();
  headers.append('Access-Control-Allow-Origin', '*');

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
