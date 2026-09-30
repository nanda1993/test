// Minimal JSON-Schema validator covering the subset this lab uses.
// Production equivalent is ajv (see README) — this exists so `npm install`
// is never a blocker in a 40-person session.
function validate(schema, data, path = '') {
  const errs = [];
  const at = path || '(root)';
  if (schema.type === 'object') {
    if (data === null || typeof data !== 'object' || Array.isArray(data))
      return [{ path: at, message: `expected object, got ${Array.isArray(data) ? 'array' : typeof data}` }];
    for (const key of schema.required || [])
      if (!(key in data)) errs.push({ path: `${at}.${key}`, message: 'required field missing' });
    if (schema.additionalProperties === false)
      for (const key of Object.keys(data))
        if (!(key in (schema.properties || {})))
          errs.push({ path: `${at}.${key}`, message: 'additional property not allowed' });
    for (const [key, sub] of Object.entries(schema.properties || {}))
      if (key in data) errs.push(...validate(sub, data[key], `${at}.${key}`));
    return errs;
  }
  if (schema.type === 'array') {
    if (!Array.isArray(data)) return [{ path: at, message: `expected array, got ${typeof data}` }];
    data.forEach((v, i) => errs.push(...validate(schema.items || {}, v, `${at}[${i}]`)));
    return errs;
  }
  if (schema.type === 'string') {
    if (typeof data !== 'string') return [{ path: at, message: `expected string, got ${typeof data}` }];
    if (schema.enum && !schema.enum.includes(data))
      errs.push({ path: at, message: `"${data}" is not one of: ${schema.enum.join(', ')}` });
    if (schema.maxLength != null && data.length > schema.maxLength)
      errs.push({ path: at, message: `length ${data.length} exceeds maxLength ${schema.maxLength}` });
    if (schema.minLength != null && data.length < schema.minLength)
      errs.push({ path: at, message: `length ${data.length} below minLength ${schema.minLength}` });
    if (schema.pattern && !new RegExp(schema.pattern).test(data))
      errs.push({ path: at, message: `"${data}" does not match ${schema.pattern}` });
    return errs;
  }
  if (schema.type === 'number' && typeof data !== 'number')
    return [{ path: at, message: `expected number, got ${typeof data}` }];
  return errs;
}
export function validateAgainst(schema, data) {
  const errors = validate(schema, data);
  return { valid: errors.length === 0, errors };
}
export function formatErrors(errors) {
  return errors.map(e => `  • ${e.path}: ${e.message}`).join('\n');
}
