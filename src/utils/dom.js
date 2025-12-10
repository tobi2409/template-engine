// DOM-Utilities: Mounting und DOM-Operationen

export function mount(node, mountNode, insertBeforeAnchor = undefined) {
    if (insertBeforeAnchor) {
        mountNode.insertBefore(node, insertBeforeAnchor)
    } else {
        mountNode.appendChild(node)
    }
}
