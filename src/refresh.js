// Refresh-Komponente: Updates und Reaktivität

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { resolve } from './utils/resolver.js'
import { handleGetNode, handleEachNode, handleIfNode } from './render.js'

// handleEachNode wird als Template verwendet, um neue DOM-Elemente für Array-Items zu erstellen
function createItemsNodes(data, contextStack, params, eachNode, mountNode, startIndex = 0, endIndex = undefined) {
    handleEachNode(data, contextStack, params, eachNode, mountNode, { startIndex, endIndex })
}

function reindexArrayMap(arrayMap, startIndex, shift, maxIndex) {
    // Verschiebe Indices um 'shift' Positionen
    // shift > 0: von hinten nach vorne (um nicht zu überschreiben)
    // shift < 0: von vorne nach hinten
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

function handleArrayMutation(data, change, 
    { deleteStartIndex = null, deleteCount = 0, insertStartIndex = null, insertCount = 0, reindexStartIndex = null, reindexShift = 0, reindexMaxIndex = null }) {
    const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.fullKey)
    
    // 1. Cleanup: Lösche NodeHolder-Keys
    for (let i = 0; i < deleteCount; i++) {
        linkedNodeHolders.delete(String(deleteStartIndex + i))
    }
    
    // 2. Reindex: Verschiebe NodeHolder-Keys
    if (reindexShift !== 0) {
        reindexArrayMap(linkedNodeHolders, reindexStartIndex, reindexShift, reindexMaxIndex)
    }
    
    // 3. DOM-Updates für alle registrierten Holder
    for (const nodeHolder of linkedNodeHolders.get('holders')) {
        // DOM-Elemente löschen
        for (let i = 0; i < deleteCount; i++) {
            const childToRemove = nodeHolder.mountNode.children[deleteStartIndex]
            if (childToRemove) {
                nodeHolder.mountNode.removeChild(childToRemove)
            }
        }
        
        // Neue DOM-Elemente einfügen
        if (insertCount > 0) {
            createItemsNodes(data, nodeHolder.contextStack, nodeHolder.params, nodeHolder.eachNode, nodeHolder.mountNode,
                insertStartIndex, insertStartIndex + insertCount - 1)
        }
    }
}

export function refresh(data, change, app) {
    switch (change.action) {
        case 'push': {
            const list = resolve(change.fullKey, data)
            handleArrayMutation(data, change, {
                insertStartIndex: list.length - change.items.length, insertCount: change.items.length
            })
            break
        }
        case 'pop': {
            const list = resolve(change.fullKey, data)
            handleArrayMutation(data, change, { deleteStartIndex: list.length, deleteCount: 1 })
            break
        }
        case 'shift': {
            const list = resolve(change.fullKey, data)
            handleArrayMutation(data, change, {
                deleteStartIndex: 0, deleteCount: 1,
                reindexStartIndex: 1, reindexShift: -1, reindexMaxIndex: list.length
            })
            break
        }
        case 'unshift': {
            const list = resolve(change.fullKey, data)
            handleArrayMutation(data, change, {
                insertStartIndex: 0, insertCount: change.items.length,
                reindexStartIndex: 0, reindexShift: change.items.length, reindexMaxIndex: list.length - change.items.length - 1
            })
            break
        }
        case 'splice': {
            const list = resolve(change.fullKey, data)
            const shift = change.items.length - change.deleteCount
            const oldLength = list.length - change.items.length + change.deleteCount
            
            handleArrayMutation(data, change, {
                deleteStartIndex: change.startIndex, deleteCount: change.deleteCount,
                insertStartIndex: change.startIndex, insertCount: change.items.length,
                reindexStartIndex: change.startIndex + change.deleteCount, reindexShift: shift, reindexMaxIndex: oldLength - 1
            })
            break
        }
        case 'updateGet': {
            // handleGetNode wird verwendet, um Abstraktion zu wahren
            // (alternativ: direkt nodeHolder.node.innerText = resolve(change.fullKey, data))
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.fullKey)
            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                handleGetNode(data, new Map(), new Map(), nodeHolder.getNode, null, undefined, 
                    { existingNode: nodeHolder.node, fullKey: change.fullKey })
            }
            break
        }
        case 'updateIf': {
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.fullKey)
            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                nodeHolder.wrapper.replaceChildren()
                
                handleIfNode(data, nodeHolder.contextStack, nodeHolder.params, nodeHolder.ifNode, null, undefined,
                    { wrapper: nodeHolder.wrapper })
            }
            break
        }
    }
}
