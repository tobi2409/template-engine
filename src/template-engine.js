// Reactive Component: Reactivity through Object.defineProperty-based data observation

import { nodeHoldersByKeys } from './components/utils/node-holders.js'
import { run } from './components/render.js'
import { refresh } from './components/refresh-delegator.js'
import { notifyDependencies, findMatchingDependencies } from './components/utils/notifier.js'
import { setItemByUuid, setUuidByItem, getUuidByItem } from './components/utils/uuid-item-map.js'

const TemplateEngine = (function () {
    return {
        reactive(data, node, dependencies = {}) {
            const topData = data

            function ensureUuid(item) {
                if (!item || typeof item !== 'object') {
                    return undefined
                }

                // Arrays and nested each-contexts are addressed by UUID-based path segments.
                // Some items may already have received a UUID during an earlier render pass,
                // while still-hidden items may not have one yet. We therefore:
                // 1. reuse an existing UUID if present,
                // 2. otherwise create one eagerly,
                // 3. re-store the same mapping in both directions to keep the maps consistent.
                // This prevents fallback-to-index fullKeys like "children.1" from diverging
                // later from rendered UUID fullKeys like "children.__uuid__abc...".
                const uuid = getUuidByItem(item) || `__uuid__${crypto.randomUUID()}`
                setItemByUuid(uuid, item)
                setUuidByItem(item, uuid)
                return uuid
            }

            function notifyKeyChange(fullKey) {
                const linkedNodeHolders = nodeHoldersByKeys.getByKey(fullKey)
                const matchingDependents = findMatchingDependencies(fullKey, dependencies)

                if ((!linkedNodeHolders || linkedNodeHolders.get('holders')?.length === 0)
                    && matchingDependents.length === 0) {
                    return
                }

                if (linkedNodeHolders?.get('holders')?.length > 0) {
                    for (const nodeHolder of linkedNodeHolders.get('holders')) {
                        const change = { fullKey: fullKey, action: nodeHolder.action }
                        refresh(topData, change)
                    }
                }

                notifyDependencies(topData, matchingDependents)
            }

            function defineReactiveDataProperty(obj, prop, initialValue, fullKey, descriptor) {
                let _value = initialValue

                if (_value && typeof _value === 'object') {
                    makeReactive(_value, fullKey)
                }

                Object.defineProperty(obj, prop, {
                    get() {
                        return _value
                    },
                    set(newValue) {
                        _value = newValue

                        if (newValue && typeof newValue === 'object') {
                            makeReactive(newValue, fullKey)
                        }

                        try {
                            notifyKeyChange(fullKey)
                        } catch (error) {
                            throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}": ${error.message}`)
                        }
                    },
                    enumerable: descriptor.enumerable,
                    configurable: true
                })
            }

            function defineReactiveAccessorProperty(obj, prop, descriptor, fullKey) {
                Object.defineProperty(obj, prop, {
                    get() {
                        const value = descriptor.get ? descriptor.get.call(this) : undefined

                        if (value && typeof value === 'object') {
                            makeReactive(value, fullKey)
                        }

                        return value
                    },
                    set(newValue) {
                        if (!descriptor.set) {
                            return
                        }

                        descriptor.set.call(this, newValue)

                        const currentValue = descriptor.get ? descriptor.get.call(this) : newValue
                        if (currentValue && typeof currentValue === 'object') {
                            makeReactive(currentValue, fullKey)
                        }

                        try {
                            notifyKeyChange(fullKey)
                        } catch (error) {
                            throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}": ${error.message}`)
                        }
                    },
                    enumerable: descriptor.enumerable,
                    configurable: true
                })
            }

            function makeReactive(obj, fullKey = '') {
                if (!obj || typeof obj !== 'object') {
                    return obj
                }

                // Prevent double-patching the same object
                if (Object.prototype.hasOwnProperty.call(obj, '__reactive__')) {
                    return obj
                }

                Object.defineProperty(obj, '__reactive__', {
                    value: true,
                    enumerable: false,
                    writable: false,
                    configurable: false
                })

                if (Array.isArray(obj)) {
                    // Make all currently existing items reactive
                    for (let i = 0; i < obj.length; i++) {
                        const item = obj[i]
                        
                        if (item && typeof item === 'object') {
                            const nextProp = ensureUuid(item)
                            const nextFullKey = fullKey ? `${fullKey}.${nextProp}` : String(nextProp)
                            makeReactive(item, nextFullKey)
                        }
                    }

                    // Patch mutation methods so newly inserted items are also made reactive
                    for (const method of ['push', 'pop', 'shift', 'unshift', 'splice']) {
                        const original = Array.prototype[method]

                        Object.defineProperty(obj, method, {
                            value: function(...args) {
                                const change = { fullKey, action: method }

                                if (method === 'push' || method === 'unshift') {
                                    change.items = args
                                } else if (method === 'splice') {
                                    change.startIndex = args[0]
                                    change.deleteCount = args[1] || 0
                                    change.items = args.slice(2)
                                }

                                // Assign UUIDs and make new items reactive before inserting
                                if (change.items) {
                                    for (const item of change.items) {
                                        if (item && typeof item === 'object') {
                                            const uuid = ensureUuid(item)
                                            const nextFullKey = fullKey ? `${fullKey}.${uuid}` : uuid
                                            makeReactive(item, nextFullKey)
                                        }
                                    }
                                }

                                const result = original.apply(this, args)

                                try {
                                    const linkedNodeHolders = nodeHoldersByKeys.getByKey(fullKey)
                                    
                                    if (linkedNodeHolders?.get('holders')?.length > 0) {
                                        refresh(topData, change)
                                    }
                                    
                                    const matchingDependents = findMatchingDependencies(fullKey, dependencies)
                                    notifyDependencies(topData, matchingDependents, change)
                                } catch (error) {
                                    throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}" after "${method}": ${error.message}`)
                                }

                                return result
                            },
                            enumerable: false,
                            writable: true,
                            configurable: true
                        })
                    }
                } else {
                    // Object: wrap existing data properties and accessors while preserving semantics.
                    const descriptors = Object.getOwnPropertyDescriptors(obj)

                    for (const [prop, descriptor] of Object.entries(descriptors)) {
                        if (prop === '__reactive__' || descriptor.configurable === false) {
                            continue
                        }

                        const nextFullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

                        if ('value' in descriptor) {
                            defineReactiveDataProperty(obj, prop, descriptor.value, nextFullKey, descriptor)
                        } else {
                            defineReactiveAccessorProperty(obj, prop, descriptor, nextFullKey)
                        }
                    }
                }

                return obj
            }

            // run() first: lets the template engine assign UUIDs to array items.
            // makeReactive() then reads those UUIDs to build the correct fullKey paths.
            try {
                run(data, node, dependencies)
            } catch (error) {
                throw new Error(`[TemplateEngine] Error during initial render: ${error.message}`)
            }

            // Patch data in-place. The returned object IS the original data,
            // now with reactive getters/setters on every property.
            makeReactive(data)

            return data
        }
    }
})()

export default TemplateEngine
