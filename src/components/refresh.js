// Refresh Component: Updates and reactivity

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { resolve } from './utils/resolver.js'
import { handleGetNodeRefresh, handleEachNodeRefresh, handleIfNodeRefresh, handleDefaultNodeRefresh } from './render.js'

export function refresh(data, change, app) {
    try {
        switch (change.action) {
            case 'push': {
                const list = resolve(change.fullKey, data)
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, insertStartIndex: list.length - change.items.length, insertCount: change.items.length })

                break
            }
            case 'pop': {
                const list = resolve(change.fullKey, data)
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: list.length, deleteCount: 1 })

                break
            }
            case 'shift': {
                const list = resolve(change.fullKey, data)
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: 0, deleteCount: 1, reindexStartIndex: 1, reindexShift: -1, reindexMaxIndex: list.length })

                break
            }
            case 'unshift': {
                const list = resolve(change.fullKey, data)
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, insertStartIndex: 0, insertCount: change.items.length,
                        reindexStartIndex: 0, reindexShift: change.items.length, reindexMaxIndex: list.length - change.items.length - 1 })
                
                break
            }
            case 'splice': {
                const list = resolve(change.fullKey, data)
                const shift = change.items.length - change.deleteCount
                const oldLength = list.length - change.items.length + change.deleteCount
                
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: change.startIndex, deleteCount: change.deleteCount,
                        insertStartIndex: change.startIndex, insertCount: change.items.length,
                        reindexStartIndex: change.startIndex + change.deleteCount, reindexShift: shift, reindexMaxIndex: oldLength - 1 })
                
                break
            }
            case 'updateEach': {
                const list = resolve(change.fullKey, data)
                handleEachNodeRefresh(data,
                    { fullKey: change.fullKey, deleteStartIndex: 0, deleteCount: list.length,
                        insertStartIndex: 0, insertCount: list.length })
                
                break
            }
            case 'updateGet': {
                const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.fullKey)
                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    handleGetNodeRefresh(data, { existingNode: nodeHolder.node, fullKey: change.fullKey })
                }

                break
            }
            case 'updateIf': {
                //console.log(change.fullKey)
                const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.fullKey)
                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    handleIfNodeRefresh(data, { wrapper: nodeHolder.wrapper, fullKey: change.fullKey,
                        contextStack: nodeHolder.contextStack, params: nodeHolder.params, ifNode: nodeHolder.ifNode })
                }

                break
            }
            case 'updateDefault': {
                const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.fullKey)
                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    if (nodeHolder.type === 'bind') {
                        handleDefaultNodeRefresh(data, { node: nodeHolder.node, type: nodeHolder.type, fullKey: change.fullKey, property: nodeHolder.property })
                    } else if (nodeHolder.type === 'attribute') {
                        handleDefaultNodeRefresh(data, { node: nodeHolder.node, type: nodeHolder.type, fullKey: change.fullKey, attributeName: nodeHolder.attributeName })
                    }
                }

                break
            }
        }
    } catch (error) {
        throw new Error(`[TemplateEngine] Error handling refresh for "${change.fullKey}" with action "${change.action}": ${error.message}`)
    }
}
