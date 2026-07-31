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

Featured demos:

- [MVVM example](examples/mvvm.html)
- [Recursive template example](examples/recursive-template.html)

Interesting snippets from those demos:

### MVVM: computed fields + dependency chaining

```js
const viewModel = TemplateEngine.reactive({
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  },
  get showWage() {
    return this.wage > 600
  },
  get fullInfo() {
    return `${this.fullName} earns $${this.wage}`
  },
  getBeautifiedData() {
    return createMappedArray(
      model.rawPersonData,
      (p) => ({
        id: p.id,
        name: p.name,
        age: new Date().getFullYear() - p.birthyear,
        showEdit: false
      }),
      { name: 'name', age: 'birthyear' },
      (item) => ({
        id: item.id,
        name: item.name,
        birthyear: item.birthyear || (new Date().getFullYear() - item.age)
      })
    )
  }
}, document.getElementById('app-template-use'), {
  firstName: ['fullName'],
  lastName: ['fullName'],
  wage: ['showWage', 'fullInfo'],
  fullName: ['fullInfo']
})
```

Notes:

- Keeps stable mapped object identity per source item (internal cache).
- Supports `push`, `pop`, `shift`, `unshift`, `splice` via source synchronization.
- Add/insert/remove operations on mapped arrays are propagated back to the source model when `reverseTransform` is provided.

### Recursive template: self-referencing `<template-use>`

```html
<template id="folder-template">
  <each of="*list" as="item#">
    <li>
      📁 <get>item#.name</get>
      <ul>
        <template-use template-id="folder-template" data-list="item#.children"></template-use>
      </ul>
    </li>
  </each>
</template>
```

```js
toggleEdit: (e, dataElement) => {
  dataElement.editing = !dataElement.editing
},
delete: (e, dataElement, _, contextStack) => {
  const parent = contextStack.get(`item-level-${contextStack.size - 3}`)
  if (parent?.data?.children) {
    const index = parent.data.children.findIndex((c) => c === dataElement)
    if (index !== -1) parent.data.children.splice(index, 1)
  }
}
```

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

> **Note:** Array items must be **objects**, not primitive values (strings, numbers, booleans).
> The engine uses a `WeakMap` internally to track item identity, which requires object references.
>
> ❌ Primitives are not supported:
> ```js
> data.tags = ['news', 'tech', 'sports']
> ```
>
> ✅ Wrap primitives in objects instead:
> ```js
> data.tags = [
>   { value: 'news' },
>   { value: 'tech' },
>   { value: 'sports' }
> ]
> ```
> ```html
> <each of="tags" as="tag">
>   <span><get>tag.value</get></span>
> </each>
> ```

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

Creates a reactive view-model around `data` using `Object.defineProperties(...)` and binds updates to DOM nodes generated from the referenced `<template>`.

- `data`: source model object
- `templateUseNode`: `<template-use>` element
- `dependencies` (optional): dependency map for related refresh triggers

Returns: reactive view-model object

## Known limitation: object replacement notifications

Replacing a nested object does not automatically notify all child keys. These patterns are currently not sufficient on their own:

```js
d.person.address = { city: 'Köln' }
d.selectedPerson = { name: 'Mia' }
```

Use an explicit child assignment afterwards to trigger the child-key refresh:

```js
d.person.address = { city: 'Köln' }
d.person.address.city = 'Köln'

d.selectedPerson = { name: 'Mia' }
d.selectedPerson.name = 'Mia'
```

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

see top of README

## Technical background: NodeHolders and UUID identity

- **NodeHolders:** The engine tracks which DOM nodes depend on a particular "full key" using a segmented Map managed by the node-holders utility ([src/components/utils/node-holders.js](src/components/utils/node-holders.js)). Full keys (for example `users.3.name` or `item#.children.2.title`) are split into segments and stored in nested Maps; the leaf entries contain arrays of node-holders that reference that full key. When a property changes the engine builds the full key and looks up any matching holders to refresh — this enables targeted updates without scanning the entire DOM.

- **UUID / item identity:** For arrays the engine keeps stable per-item identities using a WeakMap-backed id cache (see [src/mapped-array.js](src/mapped-array.js)). When rendering `<each>` the engine assigns each object a stable id so that moving, inserting, or deleting items preserves existing DOM nodes for unchanged items. That reduces DOM churn and keeps per-item state (inputs, event handlers) stable across array mutations.

- **Benefits:** targeted refreshes for changed keys, minimal DOM re-creation, efficient nested/context lookups, and stable per-item state during array operations.

- **Caveats:** identity tracking requires array items to be objects (not primitives). Also, replacing a nested object does not automatically notify child keys — use explicit child-key assignments when needed (see "Known limitation: object replacement notifications").

References:
- Node holder implementation: [src/components/utils/node-holders.js](src/components/utils/node-holders.js)
- Mapped array and item identity: [src/mapped-array.js](src/mapped-array.js)
- Initial rendering and refresh dispatch: [src/components/render-engine.js](src/components/render-engine.js) and [src/components/refresh-delegator.js](src/components/refresh-delegator.js)

## Development

Run tests:

```bash
npm test
```

## Status

Active development — API may evolve.