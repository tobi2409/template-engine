// Default Node Attributes: Handlers for action-, bind-, attr-, and style- attributes

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { resolveEx, setByPath } from './utils/resolver.js'
import { refresh } from './refresh.js'

// Helper function to apply attribute value to DOM element
export function applyAttribute(node, attrName, value) {
    if (attrName.startsWith('style-')) {
        node.style[attrName.slice(6)] = value
    } else if (attrName.startsWith('attr-')) {
        node.setAttribute(attrName.slice(5), value)
    }
}

export function handleActionAttribute(cloned, attr, data, contextStack, params) {
    try {
        // event binding: action-{event}="dataKey"
        const event = attr.name.slice(7) // e.g., 'click', 'input'
        const methodName = attr.value
        
        const resolvedMethod = resolveEx(methodName, data, contextStack, params)

        if (typeof resolvedMethod.value !== 'function') {
            throw new Error(`[TemplateEngine] action "${methodName}" must be a function`)
        }

        cloned.addEventListener(event, resolvedMethod.value)
        cloned.removeAttribute(attr.name)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error handling action attribute "${attr.name}": ${error.message}`)
    }
}

export function handleBindAttribute(cloned, attr, resolved, data) {
    try {
        // two-way binding: bind-{event}-{property}="dataKey"
        const parts = attr.name.split('-')
        const event = parts[1] // e.g., 'input'
        const property = parts[2] // e.g., 'value'
        
        // set initial value
        cloned[property] = resolved.value
        
        // Add event listener for data binding (UI → Data)
        // Note: Manual refresh is required because 'data' in the closure is the original
        // (non-proxied) data object from initial rendering. Nested objects (e.g., array
        // elements like todos[0]) are not wrapped in Proxies, so setByPath won't trigger
        // the Proxy setter. Therefore, we manually refresh all affected NodeHolders.
        cloned.addEventListener(event, (e) => {
            // Update data directly (no Proxy setter triggered for nested objects)
            setByPath(resolved.fullKey, data, e.target[property])
            
            // Manually trigger refresh for all NodeHolders of this key
            // This ensures both <get> nodes and bound <input> elements update
            // (e.g., updating todos.0.name refreshes both the display text and input value)
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(resolved.fullKey)
            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                // Each NodeHolder has its own action (updateGet, updateDefault, etc.)
                // No array-specific information needed since we're updating a property, not mutating an array
                const change = { fullKey: resolved.fullKey, action: nodeHolder.action }
                refresh(data, change)
            }
        })
        
        cloned.removeAttribute(attr.name)
        
        // refresh data -> UI
        nodeHoldersByKeys.appendToKey(resolved.fullKey, 
            { action: 'updateDefault', type: 'bind', node: cloned, property: property })
    } catch (error) {
        throw new Error(`[TemplateEngine] Error handling bind attribute "${attr.name}": ${error.message}`)
    }
}

export function handleStyleOrAttrAttribute(cloned, attr, resolved) {
    try {
        applyAttribute(cloned, attr.name, resolved.value)
        cloned.removeAttribute(attr.name)

        nodeHoldersByKeys.appendToKey(resolved.fullKey, 
            { action: 'updateDefault', type: 'attribute', node: cloned, attributeName: attr.name })
    } catch (error) {
        throw new Error(`[TemplateEngine] Error handling attribute "${attr.name}": ${error.message}`)
    }
}
