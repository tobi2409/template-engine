// Refresh Component: Updates and reactivity

import NodeHolders from './utils/node-holders.js'
import KeyResolver from './utils/key-resolver.js'
import RefreshRendering from './refresh-rendering.js'

const RefreshDelegator = (function () {
    function refresh(data, change, app) {
        try {
            switch (change.action) {
                case 'push': {
                    const list = KeyResolver.resolve(change.fullKey, data)
                    
                    RefreshRendering.handleEachNodeRefresh(data,
                        { fullKey: change.fullKey, insertStartIndex: list.length - change.items.length, insertCount: change.items.length })

                    break
                }
                case 'pop': {
                    const list = KeyResolver.resolve(change.fullKey, data)

                    RefreshRendering.handleEachNodeRefresh(data,
                        { fullKey: change.fullKey, deleteStartIndex: list.length, deleteCount: 1 })

                    break
                }
                case 'shift': {
                    const list = KeyResolver.resolve(change.fullKey, data)

                    RefreshRendering.handleEachNodeRefresh(data,
                        { fullKey: change.fullKey, deleteStartIndex: 0, deleteCount: 1, reindexStartIndex: 1, reindexShift: -1, reindexMaxIndex: list.length })

                    break
                }
                case 'unshift': {
                    const list = KeyResolver.resolve(change.fullKey, data)

                    RefreshRendering.handleEachNodeRefresh(data,
                        { fullKey: change.fullKey, insertStartIndex: 0, insertCount: change.items.length,
                            reindexStartIndex: 0, reindexShift: change.items.length, reindexMaxIndex: list.length - change.items.length - 1 })

                    break
                }
                case 'splice': {
                    const list = KeyResolver.resolve(change.fullKey, data)
                    const shift = change.items.length - change.deleteCount
                    const oldLength = list.length - change.items.length + change.deleteCount

                    RefreshRendering.handleEachNodeRefresh(data,
                        { fullKey: change.fullKey, deleteStartIndex: change.startIndex, deleteCount: change.deleteCount,
                            insertStartIndex: change.startIndex, insertCount: change.items.length,
                            reindexStartIndex: change.startIndex + change.deleteCount, reindexShift: shift, reindexMaxIndex: oldLength - 1 })

                    break
                }
                case 'updateEach': {
                    const list = KeyResolver.resolve(change.fullKey, data)

                    RefreshRendering.handleEachNodeRefresh(data,
                        { fullKey: change.fullKey, deleteStartIndex: 0, deleteCount: list.length,
                            insertStartIndex: 0, insertCount: list.length })

                    break
                }
                case 'updateGet': {
                    const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(change.fullKey)
                    const resolvedValue = KeyResolver.resolve(change.fullKey, data)

                    for (const nodeHolder of linkedNodeHolders.get('holders')) {
                        RefreshRendering.handleGetNodeRefresh(data, { existingNode: nodeHolder.node, fullKey: change.fullKey, resolvedValue })
                    }

                    break
                }
                case 'updateIf': {
                    const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(change.fullKey)

                    for (const nodeHolder of linkedNodeHolders.get('holders')) {
                        RefreshRendering.handleIfNodeRefresh(data, { wrapper: nodeHolder.wrapper, fullKey: change.fullKey,
                            contextStack: nodeHolder.contextStack, params: nodeHolder.params, ifNode: nodeHolder.ifNode })
                    }

                    break
                }
                case 'updateDefault': {
                    const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(change.fullKey)
                    const resolvedValue = KeyResolver.resolve(change.fullKey, data)

                    for (const nodeHolder of linkedNodeHolders.get('holders')) {
                        if (nodeHolder.type === 'bind') {
                            RefreshRendering.handleDefaultNodeRefresh(data, { node: nodeHolder.node, type: nodeHolder.type, fullKey: change.fullKey, property: nodeHolder.property, resolvedValue })
                        } else if (nodeHolder.type === 'attribute') {
                            RefreshRendering.handleDefaultNodeRefresh(data, { node: nodeHolder.node, type: nodeHolder.type, fullKey: change.fullKey, attributeName: nodeHolder.attributeName, resolvedValue })
                        }
                    }

                    break
                }
                default:
                    throw new Error(`[TemplateEngine] Unsupported refresh action: "${change.action}"`)
            }
        } catch (error) {
            throw new Error(`[TemplateEngine] Error handling refresh for "${change.fullKey}" with action "${change.action}": ${error.message}`)
        }
    }

    return {
        refresh
    }
})()

export default RefreshDelegator
