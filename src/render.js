// Render Component: Initial template rendering

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { resolve, resolveEx } from './utils/resolver.js'
import { mount } from './utils/dom.js'
import { applyAttribute, handleActionAttribute, handleBindAttribute, handleStyleOrAttrAttribute } from './default-node-attributes.js'

// Error Handling Strategy:
// All handler methods are wrapped in a single try-catch block from start to end.
// Utility functions (resolve, resolveEx, mount, etc.) have their own error handling,
// which creates a clear and traceable error stack for debugging:
// Example: [TemplateEngine] Error in handleGetNode: 
//          [TemplateEngine] Error in resolveEx: 
//          [TemplateEngine] Cannot resolve key "user.name"

// textNode only contains text, nothing more -> no walk anymore
function handleTextNode(textNode, mountNode, insertBeforeAnchor = undefined) {
    try {
        const cloned = textNode.cloneNode(false)
        mount(cloned, mountNode, insertBeforeAnchor)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleTextNode: ${error.message}`)
    }
}

// getNode only contains key, nothing more -> no walk anymore
export function handleGetNode(data, contextStack = new Map(), params = new Map(), getNode, mountNode, insertBeforeAnchor = undefined) {
    try {
        const key = getNode.innerText
        const resolved = resolveEx(key, data, contextStack, params)

        const resolvedTextSpan = document.createElement('span')
        resolvedTextSpan.classList.add('get-resolved')
        resolvedTextSpan.innerText = resolved.value

        mount(resolvedTextSpan, mountNode, insertBeforeAnchor)
        
        // NodeHolder structure: getNode is needed for refresh
        nodeHoldersByKeys.appendToKey(resolved.fullKey,
            { action: 'updateGet', getNode: getNode, node: resolvedTextSpan })
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleGetNode: ${error.message}`)
    }
}

export function handleGetNodeRefresh(data, refreshInfo) {
    try {
        refreshInfo.existingNode.innerText = resolve(refreshInfo.fullKey, data)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleGetNodeRefresh: ${error.message}`)
    }
}

export function handleEachNode(data, contextStack = new Map(), params = new Map(), eachNode, mountNode, refreshInfo = undefined) {
    try {
        const ofAttribute = eachNode.getAttribute('of')
        const resolvedOf = resolveEx(ofAttribute, data, contextStack, params)

        const asAttribute = eachNode.getAttribute('as')

        if (!refreshInfo) {
            // Complete NodeHolder structure: contextStack/params/eachNode are needed
            // to re-render the template with relative keys on array updates
            nodeHoldersByKeys.appendToKey(resolvedOf.fullKey,
                { action: 'updateEach', contextStack: new Map(contextStack), params: params, eachNode: eachNode, mountNode: mountNode })
        }

        const list = resolvedOf.value

        if (list.constructor.name !== 'Array') {
            throw new Error('[TemplateEngine] each-of must be an Array')
        }

        const startIndex = refreshInfo?.startIndex ?? 0
        const endIndex = refreshInfo?.endIndex ?? undefined

        const defaultPushStartIndex = list.length + startIndex
        const _startIndex = startIndex < 0 ? defaultPushStartIndex : startIndex
        const _endIndex = endIndex !== undefined ? endIndex : list.length - 1

        const insertBeforeAnchor = refreshInfo ? mountNode.children[_startIndex] : undefined
        
        // Use DocumentFragment for batch rendering to minimize DOM operations
        // Fragment collects all nodes in memory, then inserts them in one operation
        const fragment = document.createDocumentFragment()

        for (let index = _startIndex ; index <= _endIndex ; index++) {
            const listElement = list[index]
            const childContextStack = new Map(contextStack)
            childContextStack.set(asAttribute, { isEachContext: true, data: listElement, of: resolvedOf.fullKey, index: index })
            
            // walk() appends nodes to fragment sequentially (no insertBeforeAnchor needed inside fragment)
            // When walk() recursively processes child nodes, each child becomes a new container
            // The insertion position only matters for the root element being inserted into mountNode
            // Inside nested containers, nodes are always appended sequentially
            walk(data, childContextStack, params, eachNode.childNodes, fragment, undefined)
        }
        
        // Insert complete fragment in one DOM operation at correct position
        // insertBeforeAnchor is needed for operations like unshift/splice that insert at specific positions
        // If undefined, fragment is appended at the end (for push or initial render)
        mount(fragment, mountNode, insertBeforeAnchor)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleEachNode: ${error.message}`)
    }
}

function reindexArrayMap(arrayMap, startIndex, shift, maxIndex) {
    // Shift indices by 'shift' positions
    // shift > 0: backward (to avoid overwriting)
    // shift < 0: forward
    if (shift === 0) return
    
    const start = shift > 0 ? maxIndex : startIndex
    const end = shift > 0 ? startIndex : maxIndex
    const step = shift > 0 ? -1 : 1
    
    for (let i = start; shift > 0 ? i >= end : i <= end; i += step) {
        const oldIndex = String(i)
        const newIndex = String(i + shift)
        if (arrayMap.has(oldIndex)) {
            arrayMap.set(newIndex, arrayMap.get(oldIndex))
            arrayMap.delete(oldIndex)
        }
    }
}

export function handleEachNodeRefresh(data, refreshInfo) {
    try {
        const linkedNodeHolders = nodeHoldersByKeys.getByKey(refreshInfo.fullKey)
        const { deleteStartIndex = 0, deleteCount = 0, insertStartIndex = 0, insertCount = 0, reindexStartIndex = 0, reindexShift = 0, reindexMaxIndex = 0 } = refreshInfo
        
        // Delete NodeHolder keys
        for (let i = 0; i < deleteCount; i++) {
            linkedNodeHolders.delete(String(deleteStartIndex + i))
        }
        
        // Shift NodeHolder keys
        if (reindexShift !== 0) {
            reindexArrayMap(linkedNodeHolders, reindexStartIndex, reindexShift, reindexMaxIndex)
        }
        
        // DOM updates for all registered holders
        for (const nodeHolder of linkedNodeHolders.get('holders')) {
            // Delete DOM elements
            for (let i = 0; i < deleteCount; i++) {
                const childToRemove = nodeHolder.mountNode.children[deleteStartIndex]
                if (childToRemove) {
                    nodeHolder.mountNode.removeChild(childToRemove)
                }
            }
            
            // Insert new DOM elements
            if (insertCount > 0) {
                handleEachNode(data, nodeHolder.contextStack, nodeHolder.params, nodeHolder.eachNode, nodeHolder.mountNode,
                    { startIndex: insertStartIndex, endIndex: insertStartIndex + insertCount - 1 })
            }
        }
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleEachNodeRefresh: ${error.message}`)
    }
}

export function handleIfNode(data, contextStack = new Map(), params = new Map(), ifNode, mountNode, insertBeforeAnchor = undefined) {
    try {
        const test = ifNode.getAttribute('test')
        const resolvedTest = resolveEx(test, data, contextStack, params)

        if (typeof resolvedTest.value !== 'boolean') {
            throw new Error('[TemplateEngine] if-test must resolve to a boolean')
        }

        const wrapperTag = ifNode.getAttribute('wrapper') || 'div'
        const wrapper = document.createElement(wrapperTag)
        wrapper.style.display = 'none'
        
        mount(wrapper, mountNode, insertBeforeAnchor)
        
        if (resolvedTest.value) {
            wrapper.style.display = ''
            walk(data, contextStack, params, ifNode.childNodes, wrapper)
        }

        // Re-rendering NodeHolder structure: contextStack/params not strictly necessary,
        // but included to avoid code duplication (updateHandler calls handleIfNode again)
        // Could be optimized with direct wrapper toggle, but current approach is simpler
        nodeHoldersByKeys.appendToKey(resolvedTest.fullKey,
            { action: 'updateIf', contextStack: contextStack, params: params, ifNode: ifNode, wrapper: wrapper })
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleIfNode: ${error.message}`)
    }
}

export function handleIfNodeRefresh(data, refreshInfo) {
    try {
        const wrapper = refreshInfo.wrapper

        if (!wrapper) {
            throw new Error('[TemplateEngine] wrapper element missing in IfNodeRefresh')
        }

        wrapper.replaceChildren()
        wrapper.style.display = 'none'
        
        const testValue = resolve(refreshInfo.fullKey, data)
        if (testValue) {
            wrapper.style.display = ''
            walk(data, refreshInfo.contextStack, refreshInfo.params, refreshInfo.ifNode.childNodes, wrapper)
        }
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleIfNodeRefresh: ${error.message}`)
    }
}

function handleTemplateUse(data, contextStack = new Map(), params = new Map(), templateUseNode, mountNode) {
    try {
        const childParams = new Map(params) // Inherit parent params
        
        for (const key in templateUseNode.dataset) {
            childParams.set(key, templateUseNode.dataset[key])
        }

        const templateId = templateUseNode.attributes.getNamedItem('template-id').value
        const templateNode = document.getElementById(templateId)
        
        if (!templateNode) {
            throw new Error(`[TemplateEngine] Template with id "${templateId}" not found`)
        }
        
        walk(data, contextStack, childParams, templateNode.content.children, mountNode)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleTemplateUse: ${error.message}`)
    }
}

function handleDefaultNode(data, contextStack = new Map(), params = new Map(), defaultNode, mountNode, insertBeforeAnchor = undefined) {
    try {
        const cloned = defaultNode.cloneNode(false)

        for (const attr of defaultNode.attributes) {
            const resolved = resolveEx(attr.value, data, contextStack, params)

            if (attr.name.startsWith('action-')) {
                handleActionAttribute(cloned, attr, data, contextStack, params)
            } else if (attr.name.startsWith('bind-')) {
                handleBindAttribute(cloned, attr, resolved, data)
            } else if (attr.name.startsWith('attr-') || attr.name.startsWith('style-')) {
                handleStyleOrAttrAttribute(cloned, attr, resolved)
            }
        }

        mount(cloned, mountNode, insertBeforeAnchor)
        
        // What is with insertBeforeAnchor? see handleEachNode
        walk(data, contextStack, params, defaultNode.childNodes, cloned)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleDefaultNode: ${error.message}`)
    }
}

export function handleDefaultNodeRefresh(data, refreshInfo) {
    try {
        const value = resolve(refreshInfo.fullKey, data)
        
        if (refreshInfo.type === 'bind') {
            // Update bound property (Data → UI)
            // synchronize all other UI elements bound to the same data key
            refreshInfo.node[refreshInfo.property] = value
        } else if (refreshInfo.type === 'attribute') {
            applyAttribute(refreshInfo.node, refreshInfo.attributeName, value)
        }
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in handleDefaultNodeRefresh: ${error.message}`)
    }
}

function walk(data, contextStack = new Map(), params = new Map(), nodes, mountNode, insertBeforeAnchor = undefined) {
    for (const node of nodes) {
        // What is with insertBeforeAnchor? see handleEachNode

        if (node.nodeType === Node.COMMENT_NODE) {
            continue
        }

        if (node.nodeType === Node.TEXT_NODE) {
            try {
                handleTextNode(node, mountNode, insertBeforeAnchor)
            } catch (error) {
                throw new Error(`[TemplateEngine] Error during handling of text node: ${error.message}`)
            }

            continue
        }

        try {
            switch (node.tagName) {
                case 'GET':
                    handleGetNode(data, contextStack, params, node, mountNode, insertBeforeAnchor)
                    break
                case 'EACH':
                    handleEachNode(data, contextStack, params, node, mountNode)
                    break
                case 'IF':
                    handleIfNode(data, contextStack, params, node, mountNode, insertBeforeAnchor)
                    break
                case 'TEMPLATE-USE':
                    handleTemplateUse(data, contextStack, params, node, mountNode)
                    break
                default:
                    handleDefaultNode(data, contextStack, params, node, mountNode, insertBeforeAnchor)
                    break
            }
        } catch (error) {
            throw new Error(`[TemplateEngine] Error during handling of <${node.tagName.toLowerCase()}> node: ${error.message}`)
        }
    }
}

function initialTemplateUse(data, contextStack = new Map(), templateUseNode) {
    try {
        const params = new Map()
        const mountNode = document.getElementById(templateUseNode.attributes.getNamedItem('mount-id').value)

        handleTemplateUse(data, contextStack, params, templateUseNode, mountNode)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in initialTemplateUse: ${error.message}`)
    }
}

export function run(data, templateUseNode) {
    if (templateUseNode.tagName !== 'TEMPLATE-USE') {
        throw new Error('[TemplateEngine] entry point must be template-use')
    }

    const contextStack = new Map()

    try {
        initialTemplateUse(data, contextStack, templateUseNode)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error during initial rendering: ${error.message}`)
    }

    //console.log(nodeHoldersByKeys)
}
