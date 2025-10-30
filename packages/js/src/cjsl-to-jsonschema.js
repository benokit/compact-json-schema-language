module.exports = {
  compactToStandard
};

function compactToStandard(compactSchema) {
  const { id: $id } = compactSchema;
  const schemaData = { ...compactSchema }
  delete schemaData.id;

  const { properties: { data, locals }} = parseObject(schemaData);

  return {
    $id,
    ...data,
    ...(locals?.properties !== undefined && { $defs: { ...locals.properties } })
  };
}

function parseProperty(property) {
  const prefixes = ['!', ''];
  const postfixes = ['#&', '#1', '$$', '=1', '[]', '()', '{}', '#', '=', ''];

  let prefix;
  for (prefix of prefixes) {
    if (property.startsWith(prefix)) break;
  }

  let postfix;
  for (postfix of postfixes) {
    if (property.endsWith(postfix)) break;
  }

  const name = property.slice(prefix.length, property.length - postfix.length);

  return { prefix, name, postfix };
}

const primitiveTypes = new Set([
  'string',
  'boolean',
  'number',
  'object',
  'null'
]);

const codeToSchemaGenerator = {
  '': (value) => parseValue(value),
  '=': (value) => ({
    const: value
  }),
  '#': (value) => ({
    anyOf: acceptIfArray(value).map(parseValue)
  }),
  '#1': (value) => ({
    oneOf: acceptIfArray(value).map(parseValue)
  }),
  '#&': (value) => ({
    allOf: acceptIfArray(value).map(parseValue)
  }),
  '=1': (value) => ({
    enum: acceptIfArray(value)
  }),
  '[]': (value) => ({
    type: 'array',
    items: parseValue(value)
  }),
  '{}': (value) => ({
    type: 'object',
    additionalProperties: parseValue(value)
  }),
  '()': (value) => ({
    type: 'array',
    additionalItems: false,
    items: acceptIfArray(value).map(parseValue)
  }),
  '$$': (value) => acceptIfObject(value),
  '@': (value) => ({
    '$ref': value
  }),
  '@#': (value) => ({
    '$ref': '#/$defs/' + value
  })
}

function parseValue(value) {
  if (isString(value)) {
    return parseValueString(value);
  }

  if (isPlainObject(value)) {
    return parseObject(value);
  }

  throw 'Value can be either string or object';
}

function parseValueString(value) {
  if (primitiveTypes.has(value)) {
    return {
      type: value
    };
  }

  const prefixes = ['(', '{', '[', '@#', '@', ''];
  const postfixes = [')', '}', ']', ''];

  let prefix;
  for (prefix of prefixes) {
    if (value.startsWith(prefix)) break;
  }

  let postfix;
  for (postfix of postfixes) {
    if (value.endsWith(postfix)) break;
  }

  const internalValue = value.slice(prefix.length, value.length - postfix.length)
  const code = prefix + postfix;

  return codeToSchemaGenerator[code](internalValue);
}

function parseObject(object) {
  const schema = {
    type: 'object',
    required: [],
    properties: {}
  };

  for (const property in object) {
    const {prefix, name, postfix: code} = parseProperty(property);
    console.log(name);
    if (prefix === '!') {
      schema.required.push(name);
    }
    schema.properties[name] = codeToSchemaGenerator[code](object[property]);
  }

  return schema;
}

function isString(value) {
  return typeof value === 'string' || value instanceof String;
}

function acceptIfArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  throw new TypeError(`Expected an array, but received ${typeof value}`);
}

function acceptIfObject(value) {
  if (isPlainObject(value)) {
    return value;
  }
  throw new TypeError(`Expected a plain object, but received ${Object.prototype.toString.call(value)}`);
}

function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== '[object Object]') return false;

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}
