# Compact JSON Schema Language

A **concise, human-readable alternative** to standard [JSON Schema](https://json-schema.org/).
This language reduces verbosity while retaining full schema semantics, enabling easy authoring, reading, and programmatic translation to standard JSON Schema.

---

## Overview

The **Compact JSON Schema Language (CJSL)** defines schema structures in a shorter form using:

* **Type keywords** (`string`, `object`, `number`, etc.)
* **Modifiers** that encode `anyOf`, `enum`, `const`, `array`, `tuple`, etc.
* **References** (`@` and `@#`) for reusing definitions
* **Local definitions** (`locals`) for reusable types

Each CJSL definition can be translated to a **standard JSON Schema**.

---

## Basic Structure

A schema file is itself JSON and consists of:

```jsonc
{
  "id": "schema-id",
  "data": { /* schema definition */ },
  "locals": { /* optional local definitions */ }
}
```

### Example

```json
{
  "id": "person",
  "data": {
    "name": "string",
    "address": {
      "street": "string",
      "city": "string",
      "country": "string"
    },
    "nicks[]": "string",
    "emails[]": "@#email"
  },
  "locals": {
    "email": {
      "purpose=1": ["home", "office"],
      "!email": "string"
    }
  }
}
```

This defines a `person` schema with local type `email`.

---

## Core Data Types

CJSL supports the following primitive and composite data types:

| Type Keyword    | Meaning            |
| --------------- | ------------------ |
| `null`          | null value         |
| `string`        | string value       |
| `number`        | numeric value      |
| `boolean`       | boolean value      |
| `object`        | JSON object        |
| `{T}`           | dictionary of `T`  |
| `[T]`           | array of `T`       |
| `(T1, T2, ...)` | fixed-length tuple |

---

## Property Modifiers

CJSL uses **modifiers** to express schema semantics compactly.

### Appending Property Modifiers

| Modifier | Meaning                        | Standard JSON Schema Equivalent                 |
| -------- | ------------------------------ | ----------------------------------------------- |
| `#`      | `anyOf`                        | `"anyOf": [...]`                                |
| `#1`     | `oneOf`                        | `"oneOf": [...]`                                |
| `#&`     | `allOf`                        | `"allOf": [...]`                                |
| `=`      | `const`                        | `"const": value`                                |
| `=1`     | `enum`                         | `"enum": [...]`                                 |
| `[]`     | array                          | `"type": "array", "items": ...`                 |
| `()`     | tuple                          | `"items": [ ... ], "additionalItems": false`    |
| `{}`     | dictionary                     | `"type": "object", "additionalProperties": ...` |
| `$$`     | embed a raw JSON Schema object | direct embedding                                |

#### Example: `anyOf`

**Compact**

```json
{ "data#": ["string", "object"] }
```

**Standard**

```json
{
  "type": "object",
  "properties": {
    "data": {
      "anyOf": [
        { "type": "string" },
        { "type": "object" }
      ]
    }
  }
}
```

#### Example: `enum`

```json
{ "status=1": ["active", "inactive"] }
```

→ `"enum": ["active", "inactive"]`

---

### Prepending Property Modifiers

| Modifier | Meaning                            | Standard Equivalent        |
| -------- | ---------------------------------- | -------------------------- |
| `!`      | marks the property as **required** | `"required": ["property"]` |

#### Example

```json
{ "!data": "string" }
```

→ required `"data"` property of type string.

---

## Type Modifiers

### Prepending Type Modifiers

| Modifier | Meaning                    | JSON Schema Equivalent       |
| -------- | -------------------------- | ---------------------------- |
| `@`      | reference external schema  | `"$ref": "schema-id"`        |
| `@#`     | reference local definition | `"$ref": "#/$defs/local-id"` |

#### Example

```json
{ "email": "@#email-type" }
```

→ property references a locally defined schema.

---

### Appending Type Modifiers

| Modifier | Meaning                              | Example                                           |
| -------- | ------------------------------------ | ------------------------------------------------- |
| `:regex` | restricts a string via regex pattern | `"string:^[A-Z]{3}$"` → `"pattern": "^[A-Z]{3}$"` |

---

### Enclosing Type Modifiers

Enclosing modifiers provide syntactic sugar for `[]`, `{}`, and `()`.

| Form            | Meaning    | Equivalent                |
| --------------- | ---------- | ------------------------- |
| `[T]`           | array      | `"prop[]": T`             |
| `{T}`           | dictionary | `"prop{}": T`             |
| `(T1, T2, ...)` | tuple      | `"prop()": [T1, T2, ...]` |

---

## Locals

Local schemas are reusable fragments embedded in the same document.

```json
"locals": {
  "email": {
    "!email": "string",
    "purpose=1": ["home", "office"]
  }
}
```

Referenced using `@#email`.

---

## Special properties

| Property        | Meaning            |
| --------------- | ------------------ |
| `//`            | description        |

## Example: Full Schema

**Compact**

```json
{
  "id": "person",
  "data": {
    "name": "string",
    "address": {
      "street": "string",
      "city": "string",
      "country": "string"
    },
    "nicks[]": "string",
    "emails[]": "@#email"
  },
  "locals": {
    "email": {
      "purpose=1": ["home", "office"],
      "!email": "string"
    }
  }
}
```

**Equivalent Standard JSON Schema (simplified)**

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

---

## Implementation Notes

* Each schema object must include:

  * `"id"` — unique schema identifier.
  * `"data"` — compact schema definition.
* Optional `"locals"` can define embedded, reusable sub-schemas.
* Modifiers may be combined logically (e.g., `!data[]`).

---

## License

MIT License.
See [LICENSE](LICENSE) for details.
