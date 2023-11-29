export function get404() {
  return new Response('');
}

export function getRobots() {
  const robots = `User-agent: *
Disallow: /`;

  return new Response(robots);
}
