export function getResponse({ body, status, contentType }) {
  const headers = new Headers();
  headers.append('Access-Control-Allow-Origin', '*');
  // headers.append('Access-Control-Allow-Methods', 'OPTIONS, GET, PUT, POST');
  // headers.append('Access-Control-Max-Age', 2592000);

  if (contentType)
    headers.append('Content-Type', contentType);

  return new Response(body, { status, headers });
}

export function get404() {
  return getResponse({ body: '', status: 404 });
}

export function getRobots() {
  const body = `User-agent: *
Disallow: /`;

  return getResponse({ body, status: 200 });
}
