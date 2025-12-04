# TemplateEngine

A lightweight, vanilla JavaScript template engine with declarative syntax and efficient reactive updates.

## Features

- **Declarative Templates**: Use custom HTML tags (`<GET>`, `<EACH>`) for data binding
- **Reactive Updates**: Granular DOM updates without full re-rendering
- **Context-Aware**: Nested scopes with context stacks for clean data access
- **Smart Insertion**: Insert elements at specific positions (middle, end) during refresh
- **Zero Dependencies**: Pure vanilla JavaScript, no external libraries

## Installation

```javascript
import TemplateEngine from './template-engine.js'
```

## Quick Start

### 1. Define Your Template

```html
<template id="user-template">
  <div class="user">
    <h2><GET>name</GET></h2>
    <p>Email: <GET>email</GET></p>
    
    <h3>Posts</h3>
    <EACH of="posts" as="post">
      <div class="post">
        <strong><GET>post.title</GET></strong>
        <p><GET>post.content</GET></p>
      </div>
    </EACH>
  </div>
</template>

<div id="mount-point"></div>

<template-use template-id="user-template" mount-id="mount-point"></template-use>
```

### 2. Initialize with Data

```javascript
const data = {
  name: 'Alice',
  email: 'alice@example.com',
  posts: [
    { title: 'First Post', content: 'Hello World!' },
    { title: 'Second Post', content: 'Learning TemplateEngine' }
  ]
}

const templateUse = document.querySelector('template-use')
TemplateEngine.run(data, templateUse)
```

### 3. Update Reactively

```javascript
// Update a single value
data.name = 'Alice Smith'
TemplateEngine.refresh(data, {
  action: 'update',
  key: 'name'
})

// Add an item to a list
data.posts.push({ title: 'Third Post', content: 'Advanced features!' })
TemplateEngine.refresh(data, {
  action: 'pushItem',
  key: 'posts'
})

// Insert item at specific position
data.posts.splice(1, 0, { title: 'Inserted Post', content: 'In the middle!' })
TemplateEngine.refresh(data, {
  action: 'insert',
  key: 'posts',
  startIndex: 1,
  endIndex: 1
})
```

## API Reference

### `TemplateEngine.run(data, templateUseNode)`

Initialize and render a template.

- **`data`**: Object containing the data to render
- **`templateUseNode`**: The `<template-use>` element

### `TemplateEngine.refresh(data, change)`

Update the DOM based on data changes.

**Change object:**
- `action`: `'update'`, `'pushItem'`, or `'insert'`
- `key`: Data key that changed (e.g., `'posts'` or `'user.name'`)
- `startIndex`: (For `insert`) Start index (supports negative indices)
- `endIndex`: (For `insert`) End index (optional)

## Template Syntax

### `<GET>key</GET>`

Display a value from the data object.

```html
<GET>user.name</GET>
```

### `<EACH of="array" as="item">`

Iterate over an array.

```html
<EACH of="users" as="user">
  <div><GET>user.name</GET></div>
</EACH>
```

**Nested iteration:**
```html
<EACH of="categories" as="category">
  <h2><GET>category.name</GET></h2>
  <EACH of="category.items" as="item">
    <span><GET>item.label</GET></span>
  </EACH>
</EACH>
```

## Advanced Features

### Negative Indices

Use `-1` to append to the end:

```javascript
TemplateEngine.refresh(data, {
  action: 'pushItem',
  key: 'posts'
  // Automatically uses startIndex: -1
})
```

### Template Parameters

Pass parameters via `data-*` attributes:

```html
<template-use 
  template-id="card-template" 
  mount-id="output"
  data-theme="dark"
  data-size="large">
</template-use>
```

Access in template logic (currently internal).

## Architecture

- **Context Stacks**: Track nested scopes during iteration
- **Node Holders**: Map data keys to DOM nodes for efficient updates
- **Insertion Anchors**: Enable mid-list DOM insertion without full re-render
- **Recursive Walk**: Process template nodes depth-first

## Browser Support

Modern browsers with ES6+ support (Map, destructuring, arrow functions).

## License

MIT

## Contributing

This is a personal project currently under development. Feedback welcome!

---

**Status**: Active development — API may change