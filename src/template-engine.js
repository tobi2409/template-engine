// Reactive Component: Reactivity through Object.defineProperty-based data observation

import { run } from './components/render.js'
import { nodeHoldersByKeys } from './components/utils/node-holders.js'
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

                const uuid = getUuidByItem(item) || `__uuid__${crypto.randomUUID()}`
                setItemByUuid(uuid, item)
                setUuidByItem(item, uuid)
                return uuid
            }

            function notifyKeyChange(fullKey) {
                notifyChange(fullKey)
            }

            function notifyChange(fullKey, change = undefined) {
                const linkedNodeHolders = nodeHoldersByKeys.getByKey(fullKey)
                const matchingDependents = findMatchingDependencies(fullKey, dependencies)

                if ((!linkedNodeHolders || linkedNodeHolders.get('holders')?.length === 0)
                    && matchingDependents.length === 0) {
                    return
                }

                if (linkedNodeHolders?.get('holders')?.length > 0) {
                    if (change) {
                        refresh(topData, change)
                    } else {
                        for (const nodeHolder of linkedNodeHolders.get('holders')) {
                            refresh(topData, { fullKey, action: nodeHolder.action })
                        }
                    }
                }

                notifyDependencies(topData, matchingDependents, change)
            }

            function makeArrayItemsReactive(obj, fullKey) {
                for (let i = 0; i < obj.length; i++) {
                    const item = obj[i]

                    if (item && typeof item === 'object') {
                        const uuid = ensureUuid(item)
                        const itemFullKey = fullKey ? `${fullKey}.${uuid}` : String(uuid)
                        // Beispiel: data.persons = [{ name: 'Anna' }, { name: 'Ben' }] ->
                        // data.persons[0].name = 'Clara' soll triggern.
                        makeReactive(item, itemFullKey)
                    }
                }
            }

            function patchArrayMethods(obj, fullKey) {
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

                            if (change.items) {
                                for (const item of change.items) {
                                    if (item && typeof item === 'object') {
                                        const uuid = ensureUuid(item)
                                        const itemFullKey = fullKey ? `${fullKey}.${uuid}` : uuid
                                            // Beispiel: data.persons.push({ name: 'David' }) ->
                                            // danach muss data.persons[2].name = 'Daniel' triggern.
                                        makeReactive(item, itemFullKey)
                                    }
                                }
                            }

                            const result = original.apply(this, args)

                            try {
                                notifyChange(fullKey, change)
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
            }

            function defineReactiveDataProperty(obj, prop, descriptor, nextFullKey) {
                let _value = descriptor.value

                if (_value && typeof _value === 'object') {
                    // Beispiel: data.person = { address: { city: 'Berlin' } } ->
                    // data.person.address.city = 'Hamburg' soll triggern.
                    // wenn Objekt bereits verschachtelt vorhanden ist, dann muss es auch reaktiv gemacht werden.
                    makeReactive(_value, nextFullKey)
                }

                Object.defineProperty(obj, prop, {
                    get() {
                        return _value
                    },
                    set(newValue) {
                        _value = newValue

                        if (newValue && typeof newValue === 'object') {
                            // Beispiel: data.person.address = { city: 'Köln' } ->
                            // danach data.person.address.city = 'Bonn' soll triggern. (multilevel reactivity)
                            // wenn verschachteltes Objekt gesetzt wird, dann muss es auch reaktiv gemacht werden.
                            makeReactive(newValue, nextFullKey)
                        }

                        try {
                            notifyKeyChange(nextFullKey)
                        } catch (error) {
                            throw new Error(`[TemplateEngine] Error during refresh of "${nextFullKey}": ${error.message}`)
                        }
                    },
                    enumerable: descriptor.enumerable,
                    configurable: true
                })
            }

            function defineReactiveAccessorProperty(obj, prop, descriptor, nextFullKey) {
                Object.defineProperty(obj, prop, {
                    get() {
                        const value = descriptor.get ? descriptor.get.call(this) : undefined

                        if (value && typeof value === 'object') {
                            // Beispiel:
                            // get selectedPerson() { return this.persons[this.currentIndex] }
                            // -> selectedPerson.name bleibt reaktiv.
                            makeReactive(value, nextFullKey)
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
                            // Beispiel:
                            // set selectedPerson(v) { this.persons[this.currentIndex] = v }
                            // data.selectedPerson = { name: 'Finn' } -> neuer Wert wird reaktiv.
                            makeReactive(currentValue, nextFullKey)
                        }

                        try {
                            notifyKeyChange(nextFullKey)
                        } catch (error) {
                            throw new Error(`[TemplateEngine] Error during refresh of "${nextFullKey}": ${error.message}`)
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

                // WICHTIG:
                // __reactive__ ist nur ein Marker gegen doppeltes Patchen.
                // Die echte Reaktivität entsteht erst in:
                // - patchArrayMethods(...)
                // - defineReactiveDataProperty(...)
                // - defineReactiveAccessorProperty(...)
                // Bereits gepatcht? Dann nicht nochmal reaktiv machen.
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
                    makeArrayItemsReactive(obj, fullKey)
                    patchArrayMethods(obj, fullKey)

                    return obj
                }

                // next-level descriptors with its properties
                const descriptors = Object.getOwnPropertyDescriptors(obj)

                for (const [prop, descriptor] of Object.entries(descriptors)) {
                    if (prop === '__reactive__' || descriptor.configurable === false) {
                        continue
                    }

                    const nextFullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

                    if ('value' in descriptor) {
                        // prop e.g. name -> create setters/getters for name
                        defineReactiveDataProperty(obj, prop, descriptor, nextFullKey)
                    } else {
                        // objects with getters/setters and without value
                        defineReactiveAccessorProperty(obj, prop, descriptor, nextFullKey)
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
            // Beispiel (Einstieg):
            // const data = { person: { name: 'Anna' } }
            // makeReactive(data) => data.person.name = 'Lisa' löst Refresh aus.
            makeReactive(data)

            return data
        }
    }
})()

export default TemplateEngine
