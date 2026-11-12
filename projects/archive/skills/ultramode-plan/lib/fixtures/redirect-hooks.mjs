// The resolve hook redirect-register.mjs registers: an import that resolves to a module in the map
// loads the mapped copy instead. Every other import resolves as it would.
let redirects = {};

export async function initialize(data) {
  redirects = data ?? {};
}

export async function resolve(specifier, context, next) {
  const r = await next(specifier, context);
  const to = redirects[r.url];
  return to ? { ...r, url: to, shortCircuit: true } : r;
}
