'use strict';

/**
 * Public API
 *  - convertDocument(cjslDoc) -> JSON Schema for a single CJSL document { id, data, locals? }
 *  - convertAll(cjslDocs)     -> Array<JSON Schema>
 */
module.exports = {
  convertDocument,
  convertAll,
};

/** Top-level: convert an array of CJSL docs */
function convertAll(cjslDocs) {
  if (!Array.isArray(cjslDocs)) {
    throw new TypeError('convertAll expects an array of CJSL documents');
  }
  return cjslDocs.map(convertDocument);
}

/** Convert one CJSL document { id, data, locals? } to JSON Schema */
function convertDocument(doc) {
  assertObject(doc, 'CJSL document');
  if (!doc.id) throw new Error('CJSL document is missing "id"');

  const $defs = {};
  const localIndex = buildLocalIndex(doc.locals);

  // Pre-convert locals into $defs so recursive refs resolve
  if (localIndex) {
    for (const [localId, localNode] of Object.entries(localIndex)) {
      // Convert each local schema root
      $defs[localId] = convertNode(localNode, { locals: localIndex, inProperty: false });
    }
  }

  // Convert root node
  const rootSchema = convertNode(doc.data, { locals: localIndex, inProperty: false });

  // Attach $id and $defs (only if non-empty)
  const out = { $id: String(doc.id), ...rootSchema };
  if (Object.keys($defs).length) out.$defs = $defs;
  return out;
}

/* ---------------------------- Core Conversion ---------------------------- */

function convertNode(node, ctx) {
  // node can be: string type, array (only for tuple bodies), or object (object schema)
  if (typeof node === 'string') return convertTypeString(node, ctx);

  if (Array.isArray(node)) {
    // Arrays at type position are only valid for tuple bodies "(T1,T2,...)"
    // If such appears directly, treat as anyOf? -> Not in spec; reject to catch errors early.
    return {
      anyOf: node.map((n) => convertNode(n, ctx)),
    };
  }

  if (isPlainObject(node)) {
    // Object schema (properties map with modifiers)
    return convertObjectNode(node, ctx);
  }

  throw new Error(`Unsupported CJSL node type: ${typeof node}`);
}

function convertObjectNode(obj, ctx) {
  const properties = {};
  const required = [];

  // Each key may carry property modifiers
  for (const [rawKey, value] of Object.entries(obj)) {
    const { base, requiredFlag, propMod } = parsePropertyKey(rawKey);

    // Special case: '#', '#1', '#&', '=', '=1', '[]', '()', '{}', '$$' apply to "base" property
    let schemaForProp;

    switch (propMod) {
      case null: {
        // No appending property modifier -> value decides (object, type string, enclosing form)
        schemaForProp = convertValueForProperty(value, ctx);
        break;
      }
      case '#': // anyOf
      case '#1': // oneOf
      case '#&': { // allOf
        const arr = toArray(value, `Property "${rawKey}" expects array value`);
        const keyword = propMod === '#' ? 'anyOf' : propMod === '#1' ? 'oneOf' : 'allOf';
        schemaForProp = { [keyword]: arr.map((v) => convertValueForProperty(v, ctx)) };
        break;
      }
      case '=': { // const
        schemaForProp = { const: value };
        break;
      }
      case '=1': { // enum
        const arr = toArray(value, `Property "${rawKey}" expects array for enum`);
        schemaForProp = { enum: arr.slice() };
        break;
      }
      case '[]': { // array
        schemaForProp = {
          type: 'array',
          items: convertValueForProperty(value, ctx),
        };
        break;
      }
      case '()': { // tuple
        const arr = toArray(value, `Property "${rawKey}" expects array for tuple`);
        schemaForProp = {
          type: 'array',
          items: arr.map((v) => convertValueForProperty(v, ctx)),
          additionalItems: false,
        };
        break;
      }
      case '{}': { // dictionary
        schemaForProp = {
          type: 'object',
          additionalProperties: convertValueForProperty(value, ctx),
        };
        break;
      }
      case '$$': { // raw standard schema
        if (!isPlainObject(value)) {
          throw new Error(`Property "${rawKey}" with "$$" expects a JSON Schema object`);
        }
        schemaForProp = deepClone(value);
        break;
      }
      default:
        throw new Error(`Unknown property modifier on "${rawKey}"`);
    }

    if (requiredFlag) required.push(base);
    properties[base] = schemaForProp;
  }

  const out = { type: 'object', properties };
  if (required.length) out.required = required;
  return out;
}

/** Convert a value that appears to the right of a property key (which may be modified). */
function convertValueForProperty(v, ctx) {
  if (typeof v === 'string') {
    return convertTypeString(v, ctx);
  }
  if (Array.isArray(v)) {
    // Bare array here is ambiguous in the spec; best-effort treat as anyOf
    return { anyOf: v.map((x) => convertValueForProperty(x, ctx)) };
  }
  if (isPlainObject(v)) {
    // Nested object schema
    return convertObjectNode(v, ctx);
  }
  throw new Error('Unsupported value type for property');
}

/* ---------------------------- Type String Parsing ---------------------------- */

function convertTypeString(s, ctx) {
  // Order of checks matters: enclosing forms first, refs, then regex, then primitives.
  s = String(s).trim();

  // Enclosing: Tuple "(T1,T2,...)"
  if (s.startsWith('(') && s.endsWith(')')) {
    const parts = splitTopLevelCSV(s.slice(1, -1));
    return {
      type: 'array',
      items: parts.map((p) => convertTypeString(p, ctx)),
      additionalItems: false,
    };
  }

  // Enclosing: Array "[T]"
  if (s.startsWith('[') && s.endsWith(']')) {
    const inner = s.slice(1, -1).trim();
    return { type: 'array', items: convertTypeString(inner, ctx) };
  }

  // Enclosing: Dictionary "{T}"
  if (s.startsWith('{') && s.endsWith('}')) {
    const inner = s.slice(1, -1).trim();
    return { type: 'object', additionalProperties: convertTypeString(inner, ctx) };
  }

  // References: @id or @#localId
  if (s.startsWith('@#')) {
    const refId = s.slice(2).trim();
    if (!refId) throw new Error('Empty @# reference');
    return { $ref: `#/$defs/${refId}` };
  }
  if (s.startsWith('@')) {
    const refId = s.slice(1).trim();
    if (!refId) throw new Error('Empty @ reference');
    return { $ref: refId };
  }

  // String with regex suffix: "string:...pattern..."
  if (s.startsWith('string:')) {
    const pattern = s.slice('string:'.length);
    return { type: 'string', pattern };
  }

  // Primitives / keywords
  switch (s) {
    case 'string': return { type: 'string' };
    case 'number': return { type: 'number' };
    case 'boolean': return { type: 'boolean' };
    case 'object': return { type: 'object' };
    case 'null': return { type: 'null' };
    case 'any': return {}; // unconstrained
    default:
      // Unrecognized string → treat as named ref (convenience), but spec favors '@'
      // To be strict, you could throw here instead.
      return { $ref: s };
  }
}

/* ------------------------------- Utilities -------------------------------- */

function parsePropertyKey(k) {
  // Prepending property modifier: '!' for required
  let requiredFlag = false;
  if (k.startsWith('!')) {
    requiredFlag = true;
    k = k.slice(1);
  }

  // Appending property modifiers (longest-first to avoid conflicts)
  const mods = ['#&', '#1', '$$', '=1', '[]', '()', '{}', '#', '=', null];
  for (const m of mods) {
    if (m === null) break;
    if (k.endsWith(m)) {
      const base = k.slice(0, -m.length);
      return { base, requiredFlag, propMod: m };
    }
  }
  // No appending modifier
  return { base: k, requiredFlag, propMod: null };
}

function splitTopLevelCSV(s) {
  // Split by commas not inside (), [], {}
  const parts = [];
  let buf = '';
  const stack = [];
  const pairs = { '(': ')', '[': ']', '{': '}' };

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (ch === ',' && stack.length === 0) {
      parts.push(buf.trim());
      buf = '';
      continue;
    }
    if (pairs[ch]) {
      stack.push(pairs[ch]);
      buf += ch;
      continue;
    }
    if (stack.length && ch === stack[stack.length - 1]) {
      stack.pop();
      buf += ch;
      continue;
    }
    buf += ch;
  }
  if (buf.trim().length) parts.push(buf.trim());
  return parts;
}

function buildLocalIndex(locals) {
  if (!locals) return null;
  if (!Array.isArray(locals)) {
    throw new TypeError('"locals" must be an array');
  }
  const index = {};
  for (const entry of locals) {
    assertObject(entry, 'local entry');
    if (!entry.id) throw new Error('Local entry missing "id"');
    if (entry.data == null) throw new Error(`Local "${entry.id}" missing "data"`);
    index[String(entry.id)] = entry.data;
  }
  return index;
}

function assertObject(x, name) {
  if (!isPlainObject(x)) throw new TypeError(`${name} must be an object`);
}

function isPlainObject(x) {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function toArray(v, msg) {
  if (!Array.isArray(v)) throw new Error(msg);
  return v;
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/* ------------------------------- Example ---------------------------------- */
// If this file is run directly: demonstrate conversion with the 'person' example.
if (require.main === module) {
  const example = {
    id: 'person',
    data: {
      name: 'string',
      address: {
        street: 'string',
        city: 'string',
        country: 'string',
      },
      'nicks[]': 'string',
      'emails[]': '@#email',
    },
    locals: [
      {
        id: 'email',
        data: {
          'purpose=1': ['home', 'office'],
          '!email': 'string',
        },
      },
    ],
  };

  const result = convertDocument(example);
  // Print nicely
  console.log(JSON.stringify(result, null, 2));
}
