// Render-Komponente: Initiales Rendering der Templates

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { resolve, resolveEx } from './utils/resolver.js'
import { mount } from './utils/dom.js'

// textNode only contains text, nothing more -> no walk anymore
function handleTextNode(textNode, mountNode, insertBeforeAnchor = undefined) {
    const cloned = textNode.cloneNode(false)
    mount(cloned, mountNode, insertBeforeAnchor)
}

// getNode only contains key, nothing more -> no walk anymore
export function handleGetNode(data, contextStack = new Map(), params = new Map(), getNode, mountNode, insertBeforeAnchor = undefined, refreshInfo = undefined) {
    if (refreshInfo) {
        refreshInfo.existingNode.innerText = resolve(refreshInfo.fullKey, data)
        return
    }

    const key = getNode.innerText
    const resolved = resolveEx(key, data, contextStack, params)

    const resolvedTextSpan = document.createElement('span')
    resolvedTextSpan.classList.add('get-resolved')
    resolvedTextSpan.innerText = resolved.value
    mount(resolvedTextSpan, mountNode, insertBeforeAnchor)
    
    // NodeHolder-Struktur: getNode wird für refresh benötigt
    nodeHoldersByKeys.appendToKey(resolved.fullKey,
        { action: 'updateGet', getNode: getNode, node: resolvedTextSpan })
}

export function handleEachNode(data, contextStack = new Map(), params = new Map(), eachNode, mountNode, refreshInfo = undefined) {
    const ofAttribute = eachNode.getAttribute('of')
    const resolvedOf = resolveEx(ofAttribute, data, contextStack, params)

    const asAttribute = eachNode.getAttribute('as')

    if (!refreshInfo) {
        // Vollständige NodeHolder-Struktur: contextStack/params/eachNode werden benötigt,
        // um bei Array-Updates das Template mit relativen Keys neu zu rendern
        nodeHoldersByKeys.appendToKey(resolvedOf.fullKey,
            { action: 'updateArray', contextStack: new Map(contextStack), params: params, eachNode: eachNode, mountNode: mountNode })
    }

    const list = resolvedOf.value

    if (list.constructor.name !== 'Array') {
        throw new Error('each-of must be an Array')
    }

    const startIndex = refreshInfo?.startIndex ?? 0
    const endIndex = refreshInfo?.endIndex ?? undefined

    const defaultPushStartIndex = list.length + startIndex
    const _startIndex = startIndex < 0 ? defaultPushStartIndex : startIndex
    const _endIndex = endIndex !== undefined ? endIndex : list.length - 1

    const insertBeforeAnchor = refreshInfo ? mountNode.children[_startIndex] : undefined

    for (let index = _startIndex ; index <= _endIndex ; index++) {
        const listElement = list[index]
        const childContextStack = new Map(contextStack)
        childContextStack.set(asAttribute, { isEachContext: true, data: listElement, of: resolvedOf.fullKey, index: index })
        
        // insertBeforeAnchor is passed down only one each level.
        // The insertion position matters only within the current container.
        // Nested containers are positioned based on their parent container's position.
        walk(data, childContextStack, params, eachNode.childNodes, mountNode, insertBeforeAnchor)
    }
}

export function handleIfNode(data, contextStack = new Map(), params = new Map(), ifNode, mountNode, insertBeforeAnchor = undefined, refreshInfo = undefined) {
    const test = ifNode.getAttribute('test')
    const resolvedTest = resolveEx(test, data, contextStack, params)

    let wrapper = refreshInfo?.wrapper

    if (!wrapper) {
        wrapper = document.createElement('div')
        mount(wrapper, mountNode, insertBeforeAnchor)
    }

    if (resolvedTest.value) {
        walk(data, contextStack, params, ifNode.childNodes, wrapper)
    }

    // Re-rendering NodeHolder-Struktur: contextStack/params nicht unbedingt nötig,
    // aber mitgenommen um Code-Duplikation zu vermeiden (updateHandler ruft handleIfNode nochmal auf)
    // Könnte optimiert werden durch direktes wrapper-Toggle, aber current approach ist einfacher
    nodeHoldersByKeys.appendToKey(resolvedTest.fullKey,
        { action: 'updateIf', contextStack: contextStack, params: params, ifNode: ifNode, wrapper: wrapper })
}

function handleTemplateUse(data, contextStack = new Map(), params = new Map(), templateUseNode, mountNode) {
    const childParams = new Map(params) // Inherit parent params
    
    for (const key in templateUseNode.dataset) {
        childParams.set(key, templateUseNode.dataset[key])
    }

    const templateNode = document.getElementById(templateUseNode.attributes.getNamedItem('template-id').value)
    walk(data, contextStack, childParams, templateNode.content.children, mountNode)
}

function handleDefaultNode(data, contextStack = new Map(), params = new Map(), defaultNode, mountNode, insertBeforeAnchor = undefined) {
    const cloned = defaultNode.cloneNode(false)
    mount(cloned, mountNode, insertBeforeAnchor)
    // What is with insertBeforeAnchor? see handleEachNode
    walk(data, contextStack, params, defaultNode.childNodes, cloned)
}

function walk(data, contextStack = new Map(), params = new Map(), nodes, mountNode, insertBeforeAnchor = undefined) {
    for (const node of nodes) {
        // What is with insertBeforeAnchor? see handleEachNode

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
        throw new Error('entry point must be template-use')
    }

    const contextStack = new Map()

    initialTemplateUse(data, contextStack, templateUseNode)

    //console.log(nodeHoldersByKeys)
}
