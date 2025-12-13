// Refresh-Komponente: Updates und Reaktivität

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { resolve } from './utils/resolver.js'
import { handleGetNodeRefresh, handleEachNodeRefresh, handleIfNodeRefresh, handleDefaultNodeRefresh } from './render.js'

export function refresh(data, change, app) {
    switch (change.action) {
        case 'push': {
            try {
                const list = resolve(change.fullKey, data)
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, insertStartIndex: list.length - change.items.length, insertCount: change.items.length })
            } catch (error) {
                throw new Error(`[TemplateEngine] Error in refreshing push for "${change.fullKey}": ${error.message}`)
            }

            break
        }
        case 'pop': {
            try {
                const list = resolve(change.fullKey, data)
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: list.length, deleteCount: 1 })
            } catch (error) {
                throw new Error(`[TemplateEngine] Error in refreshing pop for "${change.fullKey}": ${error.message}`)
            }

            break
        }
        case 'shift': {
            try {
                const list = resolve(change.fullKey, data)
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: 0, deleteCount: 1, reindexStartIndex: 1, reindexShift: -1, reindexMaxIndex: list.length })
            } catch (error) {
                throw new Error(`[TemplateEngine] Error in refreshing shift for "${change.fullKey}": ${error.message}`)
            }

            break
        }
        case 'unshift': {
            try {
                const list = resolve(change.fullKey, data)
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, insertStartIndex: 0, insertCount: change.items.length, reindexStartIndex: 0, reindexShift: change.items.length, reindexMaxIndex: list.length - change.items.length - 1 })
            } catch (error) {
                throw new Error(`[TemplateEngine] Error in refreshing unshift for "${change.fullKey}": ${error.message}`)
            }

            break
        }
        case 'splice': {
            try {
                const list = resolve(change.fullKey, data)
                const shift = change.items.length - change.deleteCount
                const oldLength = list.length - change.items.length + change.deleteCount
                
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: change.startIndex, deleteCount: change.deleteCount, insertStartIndex: change.startIndex, insertCount: change.items.length, reindexStartIndex: change.startIndex + change.deleteCount, reindexShift: shift, reindexMaxIndex: oldLength - 1 })
            } catch (error) {
                throw new Error(`[TemplateEngine] Error in refreshing splice for "${change.fullKey}": ${error.message}`)
            }

            break
        }
        case 'updateGet': {
            try {
                const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.fullKey)
                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    handleGetNodeRefresh(data, { existingNode: nodeHolder.node, fullKey: change.fullKey })
                }
            } catch (error) {
                throw new Error(`[TemplateEngine] Error in refreshing updateGet for "${change.fullKey}": ${error.message}`)
            }

            break
        }
        case 'updateIf': {
            try {
                const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.fullKey)
                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    handleIfNodeRefresh(data, { wrapper: nodeHolder.wrapper, fullKey: change.fullKey, contextStack: nodeHolder.contextStack, params: nodeHolder.params, ifNode: nodeHolder.ifNode })
                }
            } catch (error) {
                throw new Error(`[TemplateEngine] Error in refreshing updateIf for "${change.fullKey}": ${error.message}`)
            }

            break
        }
        case 'updateDefault': {
            try {
                const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.fullKey)
                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    if (nodeHolder.type === 'bind') {
                        handleDefaultNodeRefresh(data, { node: nodeHolder.node, type: nodeHolder.type, fullKey: change.fullKey, property: nodeHolder.property })
                    } else if (nodeHolder.type === 'attribute') {
                        handleDefaultNodeRefresh(data, { node: nodeHolder.node, type: nodeHolder.type, fullKey: change.fullKey, attributeName: nodeHolder.attributeName })
                    }
                }
            } catch (error) {
                throw new Error(`[TemplateEngine] Error in refreshing updateDefault for "${change.fullKey}": ${error.message}`)
            }

            break
        }
    }
}
