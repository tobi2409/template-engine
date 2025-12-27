// Default Node Attributes: Handlers for action-, bind-, attr-, and style- attributes

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { resolveEx, setByPath } from './utils/resolver.js'
import { refresh } from './refresh.js'
import { notifyDependencies, findMatchingDependencies } from './utils/notifier.js'

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

        // Get the last (innermost) each-context item from contextStack
        let contextItem = null
        for (const context of contextStack.values()) {
            if (context.data) {
                contextItem = context.data
            }
        }

        // Wrap the method to pass event and context item (or data if no context)
        cloned.addEventListener(event, (e) => {
            resolvedMethod.value(e, contextItem || data, contextStack)
        })

        cloned.removeAttribute(attr.name)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error handling action attribute "${attr.name}": ${error.message}`)
    }
}

export function handleBindAttribute(cloned, attr, resolved, data, contextStack, params, dependencies = {}) {
    try {
        // Two-way binding: bind-{event}-{property}="dataKey"
        const parts = attr.name.split('-')
        const event = parts[1] // e.g., 'input'
        const property = parts[2] // e.g., 'value'
        
        // Set initial value (Data → UI)
        cloned[property] = resolved.value
        
        // Add event listener for UI → Data binding
        cloned.addEventListener(event, (e) => {
            // Resolve key dynamically using contextStack from closure
            const currentResolved = resolveEx(attr.value, data, contextStack, params)
            setByPath(currentResolved.fullKey, data, e.target[property])
            
            // Manually trigger refresh for all NodeHolders
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(currentResolved.fullKey)
            if (linkedNodeHolders) {
                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    const change = { fullKey: currentResolved.fullKey, action: nodeHolder.action }
                    refresh(data, change)
                }
            }
            
            // Trigger dependent refreshes
            const matchingDependents = findMatchingDependencies(currentResolved.fullKey, dependencies)
            notifyDependencies(data, matchingDependents)
        })
        
        // Register NodeHolder for Data → UI refresh
        nodeHoldersByKeys.appendToKey(resolved.fullKey, 
            { action: 'updateDefault', type: 'bind', node: cloned, property: property })
        
        cloned.removeAttribute(attr.name)
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
