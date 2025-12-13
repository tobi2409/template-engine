// DOM Utilities: Mounting and DOM operations

export function mount(node, mountNode, insertBeforeAnchor = undefined) {
    if (insertBeforeAnchor) {
        mountNode.insertBefore(node, insertBeforeAnchor)
    } else {
        mountNode.appendChild(node)
    }
}
