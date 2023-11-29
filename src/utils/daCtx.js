/**
 * @typedef {Object} DaCtx
 * @property {String} api - The API being requested.
 * @property {String} org - The organization or owner of the content.
 * @property {String} site - The site context.
 * @property {String} path - The path to the resource relative to the site.
 * @property {String} name - The name of the resource being requested.
 * @property {String} ext - The name of the extension.
 */

/**
 * Gets Dark Alley Context
 * @param {pathname} pathname
 * @returns {DaCtx} The Dark Alley Context.
 */
export function getDaCtx(pathname) {
  // Santitize the string
  const lower = pathname.slice(1).toLowerCase();
  const sanitized = lower.endsWith('/') ? `${lower}/index.html` : lower;

  // Get base details
  const [org, site, ...parts] = sanitized.split('/');

  // Set base details
  const daCtx = { org, site };

  // Sanitize the remaining path parts
  const path = parts.filter((part) => part !== '');

  if (path.length === 0) {
    daCtx.key = `${site}/.daprops`;
    return daCtx;
  }

  daCtx.name = path.slice(-1)[0];
  const split = daCtx.name.split('.');
  const hasExt = split.length > 1;
  const keyBase = `${site}/${path.join('/')}`;
  daCtx.key = hasExt ? keyBase : `${keyBase}.html`;
  if (hasExt) {
    daCtx.ext = split.pop();
    daCtx.propsKey = `${keyBase}/.daprops`;
  }

  return daCtx;
}
