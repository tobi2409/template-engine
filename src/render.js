// Render Component: Initial template rendering

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { resolve, resolveEx, setByPath } from './utils/resolver.js'
import { mount } from './utils/dom.js'

// textNode only contains text, nothing more -> no walk anymore
function handleTextNode(textNode, mountNode, insertBeforeAnchor = undefined) {
    const cloned = textNode.cloneNode(false)
    mount(cloned, mountNode, insertBeforeAnchor)
}

// getNode only contains key, nothing more -> no walk anymore
export function handleGetNode(data, contextStack = new Map(), params = new Map(), getNode, mountNode, insertBeforeAnchor = undefined) {
    const key = getNode.innerText
    const resolved = resolveEx(key, data, contextStack, params)

    const resolvedTextSpan = document.createElement('span')
    resolvedTextSpan.classList.add('get-resolved')
    resolvedTextSpan.innerText = resolved.value
    mount(resolvedTextSpan, mountNode, insertBeforeAnchor)
    
    // NodeHolder structure: getNode is needed for refresh
    nodeHoldersByKeys.appendToKey(resolved.fullKey,
        { action: 'updateGet', getNode: getNode, node: resolvedTextSpan })
}

export function handleGetNodeRefresh(data, refreshInfo) {
    refreshInfo.existingNode.innerText = resolve(refreshInfo.fullKey, data)
}

export function handleEachNode(data, contextStack = new Map(), params = new Map(), eachNode, mountNode, refreshInfo = undefined) {
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
    const linkedNodeHolders = nodeHoldersByKeys.getByKey(refreshInfo.fullKey)
    const { deleteStartIndex = 0, deleteCount = 0, insertStartIndex = 0, insertCount = 0, reindexStartIndex = 0, reindexShift = 0, reindexMaxIndex = 0 } = refreshInfo
    
    // 1. Cleanup: Delete NodeHolder keys
    for (let i = 0; i < deleteCount; i++) {
        linkedNodeHolders.delete(String(deleteStartIndex + i))
    }
    
    // 2. Reindex: Shift NodeHolder keys
    if (reindexShift !== 0) {
        reindexArrayMap(linkedNodeHolders, reindexStartIndex, reindexShift, reindexMaxIndex)
    }
    
    // 3. DOM updates for all registered holders
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
}

export function handleIfNode(data, contextStack = new Map(), params = new Map(), ifNode, mountNode, insertBeforeAnchor = undefined) {
    const test = ifNode.getAttribute('test')
    const resolvedTest = resolveEx(test, data, contextStack, params)

    if (typeof resolvedTest.value !== 'boolean') {
        throw new Error('[TemplateEngine] if-test must resolve to a boolean')
    }

    const wrapper = resolvedTest.value ? document.createElement('div') : undefined

    if (wrapper) {
        mount(wrapper, mountNode, insertBeforeAnchor)
    }
    
    if (resolvedTest.value) {
        walk(data, contextStack, params, ifNode.childNodes, wrapper)
    }

    // Re-rendering NodeHolder structure: contextStack/params not strictly necessary,
    // but included to avoid code duplication (updateHandler calls handleIfNode again)
    // Could be optimized with direct wrapper toggle, but current approach is simpler
    nodeHoldersByKeys.appendToKey(resolvedTest.fullKey,
        { action: 'updateIf', contextStack: contextStack, params: params, ifNode: ifNode, wrapper: wrapper })
}

export function handleIfNodeRefresh(data, refreshInfo) {
    const wrapper = refreshInfo.wrapper

    if (!wrapper) {
        throw new Error('[TemplateEngine] wrapper element missing in IfNodeRefresh')
    }

    wrapper.replaceChildren()
    
    const testValue = resolve(refreshInfo.fullKey, data)
    if (testValue) {
        walk(data, refreshInfo.contextStack, refreshInfo.params, refreshInfo.ifNode.childNodes, wrapper)
    }
}

function handleTemplateUse(data, contextStack = new Map(), params = new Map(), templateUseNode, mountNode) {
    const childParams = new Map(params) // Inherit parent params
    
    for (const key in templateUseNode.dataset) {
        childParams.set(key, templateUseNode.dataset[key])
    }

    const templateNode = document.getElementById(templateUseNode.attributes.getNamedItem('template-id').value)
    walk(data, contextStack, childParams, templateNode.content.children, mountNode)
}

// Helper function to apply attribute value to DOM element
function applyAttribute(node, attrName, value) {
    if (attrName.startsWith('style-')) {
        node.style[attrName.slice(6)] = value
    } else if (attrName.startsWith('attr-')) {
        node.setAttribute(attrName.slice(5), value)
    }
}

function handleDefaultNode(data, contextStack = new Map(), params = new Map(), defaultNode, mountNode, insertBeforeAnchor = undefined) {
    const cloned = defaultNode.cloneNode(false)

    for (const attr of defaultNode.attributes) {
        const resolved = resolveEx(attr.value, data, contextStack, params)

        if (attr.name.startsWith('bind-')) {
            // Two-way binding: bind-{event}-{property}="dataKey"
            const parts = attr.name.split('-')
            const event = parts[1]      // e.g., 'input'
            const property = parts[2]   // e.g., 'value'
            
            // Set initial value
            cloned[property] = resolved.value
            
            // Add event listener for data binding (UI → Data)
            cloned.addEventListener(event, (e) => {
                setByPath(resolved.fullKey, data, e.target[property])
            })
            
            cloned.removeAttribute(attr.name)
            
            // Register NodeHolder for refresh (Data → UI)
            nodeHoldersByKeys.appendToKey(resolved.fullKey, 
                { action: 'updateDefault', type: 'bind', node: cloned, property: property })
        } else if (attr.name.startsWith('attr-') || attr.name.startsWith('style-')) {
            applyAttribute(cloned, attr.name, resolved.value)
            cloned.removeAttribute(attr.name)

            nodeHoldersByKeys.appendToKey(resolved.fullKey, 
                { action: 'updateDefault', type: 'attribute', node: cloned, attributeName: attr.name })
        }
    }

    mount(cloned, mountNode, insertBeforeAnchor)
    // What is with insertBeforeAnchor? see handleEachNode
    walk(data, contextStack, params, defaultNode.childNodes, cloned)
}

export function handleDefaultNodeRefresh(data, refreshInfo) {
    const value = resolve(refreshInfo.fullKey, data)
    
    if (refreshInfo.type === 'bind') {
        // Update bound property (Data → UI)
        refreshInfo.node[refreshInfo.property] = value
    } else if (refreshInfo.type === 'attribute') {
        applyAttribute(refreshInfo.node, refreshInfo.attributeName, value)
    }
}

function walk(data, contextStack = new Map(), params = new Map(), nodes, mountNode, insertBeforeAnchor = undefined) {
    for (const node of nodes) {
        // What is with insertBeforeAnchor? see handleEachNode

        if (node.nodeType === Node.COMMENT_NODE) {
            continue
        }

        if (node.nodeType === Node.TEXT_NODE) {
            handleTextNode(node, mountNode, insertBeforeAnchor)
            continue
        }

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
    }
}

function initialTemplateUse(data, contextStack = new Map(), templateUseNode) {
    const params = new Map()
    const mountNode = document.getElementById(templateUseNode.attributes.getNamedItem('mount-id').value)
    handleTemplateUse(data, contextStack, params, templateUseNode, mountNode)
}

export function run(data, templateUseNode) {
    if (templateUseNode.tagName !== 'TEMPLATE-USE') {
        throw new Error('[TemplateEngine] entry point must be template-use')
    }

    const contextStack = new Map()

    initialTemplateUse(data, contextStack, templateUseNode)

    //console.log(nodeHoldersByKeys)
}
