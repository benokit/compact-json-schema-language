# Compact JSON Schema Language

A **concise, human-readable alternative** to standard [JSON Schema](https://json-schema.org/).
This language reduces verbosity while retaining full schema semantics, enabling easy authoring, reading, and programmatic translation to standard JSON Schema.

Language definition: [CJSL](https://github.com/benokit/compact-json-schema-language).

## CJSL conversion lib

Converts compact json schema (CJSL) to standard json schema.

```js
const { compactToStandard } = require('@benokit/js-cjsl');

const example = {
    $id: 'person',
    $data: {
      name: 'string',
      address: {
        street: 'string',
        city: 'string',
        country: 'string',
      },
      'nicks[]': 'string',
      'emails[]': '@#email',
    },
    $locals: {
      email: {
          'purpose=1': ['home', 'office'],
          '!email': 'string',
        }
    }
};
const standard = compactToStandard(example)
console.log(JSON.stringify(standard));
```

prints:

```json
{
  "$id": "person",
  "type": "object",
  "properties": {
    "name": { "type": "string" },
    "address": {
      "type": "object",
      "properties": {
        "street": { "type": "string" },
        "city": { "type": "string" },
        "country": { "type": "string" }
      }
    },
    "nicks": {
      "type": "array",
      "items": { "type": "string" }
    },
    "emails": {
      "type": "array",
      "items": { "$ref": "#/$defs/email" }
    }
  },
  "$defs": {
    "email": {
      "type": "object",
      "required": ["email"],
      "properties": {
        "email": { "type": "string" },
        "purpose": {
          "enum": ["home", "office"]
        }
      }
    }
  }
}
```
