// Proxy Component: Reactivity through proxy-based data observation

import { nodeHoldersByKeys } from './components/utils/node-holders.js'
import { run } from './components/render.js'
import { refresh } from './components/refresh-delegator.js'
import { notifyDependencies, findMatchingDependencies } from './components/utils/notifier.js'
import { setItemByUuid, setUuidByItem, getUuidByItem } from './components/utils/uuid-item-map.js'

const TemplateEngine = (function () {
    return {
        reactive(data, node, dependencies = {}) {
            const topData = data

            // TODO: Proxy caching (WeakMap or __proxy__ + Symbol) to prevent stale fullKey paths
            // after splice/reorder operations. Currently, the same raw object can be wrapped by
            // multiple proxy instances with different (frozen) fullKey closures, causing redundant
            // set-trap calls (e.g., both "persons.0.childs.2.editing" and "persons.0.childs.3.editing").
            // Functionally correct, but produces duplicate refresh calls for affected nodes.
            function innerReactive(data, fullKey = '') {
                let isInArrayMethod = false
                
                const proxy = new Proxy(data, {
                    get(target, prop) {
                        const value = target[prop]
                        
                        // handle non-array-method cases first
                        if (!Array.isArray(target) || typeof value !== 'function' || 
                            !['push', 'pop', 'shift', 'unshift', 'splice'].includes(prop)) {
                                
                            if (value && typeof value === 'object') {
                                let nextProp = prop

                                if (Array.isArray(target) && typeof prop !== 'symbol' && /^\d+$/.test(String(prop))) {
                                    nextProp = getUuidByItem(target[prop])
                                }

                                const nextFullKey = fullKey ? `${fullKey}.${nextProp}` : String(nextProp)
                                return innerReactive(value, nextFullKey) // deep wrapping
                            }

                            return value
                        }
                        
                        // intercept array methods
                        return function(...args) {
                            isInArrayMethod = true

                            let result

                            try {
                                result = value.apply(proxy, args)
                            } catch (error) {
                                throw new Error(`[TemplateEngine] Error executing ${prop} on "${fullKey}": ${error.message}`)
                            } finally {
                                isInArrayMethod = false
                            }
                            
                            const change = { fullKey, action: prop }
                            
                            if (prop === 'push' || prop === 'unshift') {
                                change.items = args
                            } else if (prop === 'splice') {
                                change.startIndex = args[0]
                                change.deleteCount = args[1] || 0
                                change.items = args.slice(2)
                            }

                            if (['push', 'unshift', 'splice'].includes(prop) && change.items) {
                                for (let i = 0; i < change.items.length; i++) {
                                    const uuid = `__uuid__${crypto.randomUUID()}`
                                    setItemByUuid(uuid, change.items[i])
                                    //console.log(innerReactive(change.items[i]))
                                    setUuidByItem(change.items[i], uuid)
                                }
                            }
                            
                            try {
                                // Check if there are NodeHolders or dependencies for this array
                                const linkedNodeHolders = nodeHoldersByKeys.getByKey(fullKey)
                                const matchingDependents = findMatchingDependencies(fullKey, dependencies)
                                // Only refresh if array is used in template or has dependencies
                                if (linkedNodeHolders && linkedNodeHolders.get('holders')?.length > 0) {
                                    refresh(topData, change)
                                }
                                
                                // Always notify dependencies (even if array itself not in template)
                                // Pass the original change object so dependencies can use the same efficient operation
                                notifyDependencies(topData, matchingDependents, change)
                            } catch (error) {
                                throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}" after "${prop}": ${error.message}`)
                            }

                            return result
                        }
                    },

                    set(target, prop, value) {
                        target[prop] = value

                        if (prop !== 'length' && !isInArrayMethod) {
                            console.log(target)
                            const nextFullKey = fullKey ? `${fullKey}.${prop}` : String(prop)
                            //console.log(nextFullKey)
                            //console.log(nextFullKey)
                            // Determine action based on registered NodeHolders
                            // [0] is sufficient since typically all holders for the same key have the same action
                            // (e.g., all <get>data.name</get> have 'updateGet', all <if test="data.flag"> have 'updateIf')
                            const linkedNodeHolders = nodeHoldersByKeys.getByKey(nextFullKey)
                            
                            // Find matching dependencies (direct match + nested paths)
                            const matchingDependents = findMatchingDependencies(nextFullKey, dependencies)
                            
                            // Early return if no UI elements depend on this property
                            if ((!linkedNodeHolders || linkedNodeHolders.get('holders')?.length === 0)
                                && matchingDependents.length === 0) {
                                return true
                            }

                            try {
                                // Refresh all NodeHolders for this key (may have different actions)
                                // e.g., both <get>model.wage</get> (updateGet) and <input bind-input-value="model.wage"> (updateDefault)
                                if (linkedNodeHolders && linkedNodeHolders.get('holders')?.length > 0) {
                                    for (const nodeHolder of linkedNodeHolders.get('holders')) {
                                        const change = { fullKey: nextFullKey, action: nodeHolder.action }
                                        refresh(topData, change)
                                    }
                                }
                                
                                notifyDependencies(topData, matchingDependents)
                            } catch (error) {
                                throw new Error(`[TemplateEngine] Error during refresh of "${nextFullKey}": ${error.message}`)
                            }
                        }

                        return true
                    }
                })

                return proxy
            }

            const reactiveData = innerReactive(data)
            //console.log(reactiveData)

            try {
                run(reactiveData, node, dependencies)
            } catch (error) {
                throw new Error(`[TemplateEngine] Error during initial render: ${error.message}`)
            }

            return reactiveData
        }
    }
})()

export default TemplateEngine
