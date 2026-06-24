# TemplateEngine

A lightweight, vanilla JavaScript template engine with declarative HTML tags and reactive DOM updates.

## Features

- Declarative templates with custom tags: `<get>`, `<each>`, `<if>`, `<template-use>`
- Reactive updates without full re-rendering
- Dependency-based refresh chaining (`dependencies` map)
- Efficient key-to-node tracking via internal node holders
- Nested context support for scoped access inside loops
- Array update support: `push`, `pop`, `shift`, `unshift`, `splice`
- Optional view-model helper: `createMappedArray(...)`

## Installation

```js
import TemplateEngine from './template-engine.js'
```

## Examples (start here)

Browse the live demo files in the [GitHub repository](https://github.com/tobi2409/template-engine/tree/main/examples).

> The examples use local file paths and are intended to be run directly from the cloned repository. To try them out, clone the repo and open the HTML files in a browser:
>
> ```bash
> git clone https://github.com/tobi2409/template-engine.git
> cd template-engine
> ```

## Quick Start

### 1) Define a `<template>`

```html
<template id="user-template">
  <div class="user">
    <h2><get>name</get></h2>
    <p>Email: <get>email</get></p>

    <h3>Posts</h3>
    <each of="posts" as="post">
      <div class="post">
        <strong><get>post.title</get></strong>
        <p><get>post.content</get></p>
      </div>
    </each>
  </div>
</template>

<div id="mount-point"></div>
<template-use template-id="user-template" mount-id="mount-point"></template-use>
```

### 2) Initialize reactivity

```js
const templateUse = document.querySelector('template-use')

const data = TemplateEngine.reactive(
  {
    name: 'Alice',
    email: 'alice@example.com',
    posts: [
      { title: 'First Post', content: 'Hello World!' },
      { title: 'Second Post', content: 'Learning TemplateEngine' }
    ]
  },
  templateUse
)
```

### 3) Update data

```js
data.name = 'Alice Smith'
data.posts.push({ title: 'Third Post', content: 'Advanced features!' })
data.posts.splice(1, 0, { title: 'Inserted Post', content: 'In the middle!' })
```

## Template Syntax

### `<get>key</get>`

Renders a value from data/context.

```html
<get>user.name</get>
```

### `<each of="array" as="item">...</each>`

Loops over an array.

```html
<each of="users" as="user">
  <div><get>user.name</get></div>
</each>
```

### `<if test="expr">...</if>`

Conditionally renders content.

```html
<if test="isVisible">
  <span>Visible content</span>
</if>
```

### `<template-use ...></template-use>`

Mounts a `<template>` by ID.

```html
<template-use template-id="user-template" mount-id="mount-point"></template-use>
```

## API

### `TemplateEngine.reactive(data, templateUseNode, dependencies?)`

Creates a reactive proxy around `data` and binds updates to DOM nodes generated from the referenced `<template>`.

- `data`: source model object
- `templateUseNode`: `<template-use>` element
- `dependencies` (optional): dependency map for related refresh triggers

Returns: reactive proxy object

## Dependencies

Use the optional `dependencies` map when one property affects other derived properties.

```js
const raw = { firstName: 'Alice', lastName: 'Smith' }

const data = TemplateEngine.reactive(
  {
    get firstName() { return raw.firstName },
    set firstName(v) { raw.firstName = v },
    get fullName() { return `${raw.firstName} ${raw.lastName}` }
  },
  document.querySelector('template-use'),
  {
    firstName: ['fullName']
  }
)

data.firstName = 'Bob' // triggers refresh for firstName and fullName
```

Why this matters:

- Keeps derived values in sync without manual DOM handling.
- Makes reactive chains explicit and maintainable.
- Works well for computed/display-only fields.

## Mapped Array

`createMappedArray(...)` helps you build a mapped view-model array while keeping synchronization with the source array.

```js
import { createMappedArray } from './src/mapped-array.js'

const source = [{ name: 'Alice', birthyear: 1995 }]

const vm = createMappedArray(
  source,
  (item) => ({
    label: item.name,
    age: new Date().getFullYear() - item.birthyear
  }),
  { age: 'birthyear' },
  (result) => ({
    birthyear: new Date().getFullYear() - result.age,
    name: result.label
  })
)

vm[0].age = 25 // writes back to source[0].birthyear
```

Notes:

- Keeps stable mapped object identity per source item (internal cache).
- Supports `push`, `pop`, `shift`, `unshift`, `splice` via source synchronization.

## Development

Run tests:

```bash
npm test
```

## Status

Active development — API may evolve.