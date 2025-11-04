function compactToStandard(compactSchema) {
  const dataProperty = Object.keys(compactSchema).find(key => key.startsWith('$data'));

  if (dataProperty) {
    const { $id, $locals } = compactSchema;

    const schemaData = { 
      [dataProperty.slice(1)]: compactSchema[dataProperty],
      locals: $locals
    }

    const { properties } = parseObject(schemaData);

    return {
      ...($id !== undefined && { $id }),
      ...properties.data,
      ...(properties.locals?.properties !== undefined && { $defs: { ...properties.locals.properties } })
    };
  }

  return parseObject(compactSchema);
}

function parseObject(object) {
  const dataProperty = Object.keys(object).find(key => key.startsWith('$data'));
  if (dataProperty) {
    return compactToStandard(object);
  }

  const schema = {
    type: 'object',
    required: [],
    properties: {}
  };

  for (const property in object) {
    if (!object[property]) continue;
    const {prefix, name, postfix: code} = parseProperty(property);
    if (prefix === '!') {
      schema.required.push(name);
    }
    schema.properties[name] = codeToSchemaGenerator[code](object[property]);
  }

  if (schema.required.length === 0) {
    delete schema.required;
  }

  return schema;
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
    items: acceptIfArray(isString(value) ? value.split(',') : value).map(parseValue)
  }),
  '$$': (value) => acceptIfObject(value),
  '@': (value) => ({
    '$ref': value
  }),
  '@#': (value) => ({
    '$ref': '#/$defs/' + value
  })
}

function getTypeSchema(type) {
  if (primitiveTypes.has(type)) {
    return { type };
  }

  const [value, pattern] = splitAtFirstColon(type);
  
  if (pattern !== '') {
    return {
      ...getTypeSchema(value),
      pattern
    }
  }

  throw new TypeError(`Unsupported primitive type ${type}`); 
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

  if (code === '') {
    return getTypeSchema(value);
  }

  return codeToSchemaGenerator[code](internalValue);
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

function splitAtFirstColon(str) {
  const index = str.indexOf(':');
  if (index === -1) return [str, ''];
  return [str.slice(0, index), str.slice(index + 1)];
}

export {
  compactToStandard
};
