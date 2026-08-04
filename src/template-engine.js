// Reactive Component: Reactivity through Object.defineProperty-based data observation

import RenderEngine from './components/render-engine.js'
import Notifier from './components/reactivity-helpers/notifier.js'
import UuidItemMap from './components/utils/uuid-item-map.js'
import ModelSynchronization from './components/reactivity-helpers/model-synchronization.js'

const TemplateEngine = (function () {
    return {
        reactive(data, node, dependencies = {}) {
            if (!data || typeof data !== 'object') {
                throw new TypeError(`[TemplateEngine] reactive expected "data" to be an object, got ${data === null ? 'null' : typeof data}`)
            }

            if (!node || typeof node !== 'object' || node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'TEMPLATE-USE') {
                throw new TypeError('[TemplateEngine] reactive expected "node" to be a <template-use> element')
            }

            if (!dependencies || typeof dependencies !== 'object') {
                throw new TypeError(`[TemplateEngine] reactive expected "dependencies" to be an object, got ${dependencies === null ? 'null' : typeof dependencies}`)
            }

            const topData = data

            function makeArrayItemsReactive(obj, fullKey, mappedArrayConfig = undefined) {
                for (let i = 0; i < obj.length; i++) {
                    const item = obj[i]

                    const mappedArrayItemConfig = (mappedArrayConfig
                        && typeof mappedArrayConfig === 'object'
                        && mappedArrayConfig.hasOwnProperty('source')
                        && mappedArrayConfig.hasOwnProperty('reverseTransform')
                        && Array.isArray(mappedArrayConfig.source)
                        && typeof mappedArrayConfig.reverseTransform === 'function')
                        ? {
                            viewModelArray: obj,
                            sourceItem: mappedArrayConfig.source[i],
                            reverseTransform: mappedArrayConfig.reverseTransform
                        }
                        : undefined

                    if (item && typeof item === 'object') {
                        const uuid = UuidItemMap.ensureUuidForItem(item)
                        const itemFullKey = fullKey ? `${fullKey}.${uuid}` : String(uuid)
                        // Beispiel: data.persons = [{ name: 'Anna' }, { name: 'Ben' }] ->
                        // data.persons[0].name = 'Clara' soll triggern.
                        makeReactive(item, itemFullKey, mappedArrayItemConfig)
                    }
                }
            }

            function patchArrayMethods(obj, fullKey, mappedArrayConfig = undefined) {
                for (const method of ['push', 'pop', 'shift', 'unshift', 'splice']) {
                    // If the array already has a custom method push, pop, ... (e.g. from createMappedArray),
                    // wrap it instead of Array.prototype so the source sync is preserved.
                    const original = (obj[method] !== Array.prototype[method])
                        ? obj[method]
                        : Array.prototype[method]

                    Object.defineProperty(obj, method, {
                        value: function(...args) {
                            const change = { fullKey, action: method }
                            let insertedViewItems = []
                            let insertedModelItems = []

                            if (method === 'push' || method === 'unshift') {
                                change.items = args
                                insertedViewItems = args
                            } else if (method === 'splice') {
                                change.startIndex = args[0]
                                change.deleteCount = args[1] || 0
                                change.items = args.slice(2)
                                insertedViewItems = change.items
                            }

                            if (mappedArrayConfig && typeof mappedArrayConfig === 'object'
                                && Array.isArray(mappedArrayConfig.source)
                                && typeof mappedArrayConfig.reverseTransform === 'function') {
                                if (method === 'push') {
                                    insertedModelItems = insertedViewItems.map((item) => mappedArrayConfig.reverseTransform(item, { operation: 'push' }))
                                    mappedArrayConfig.source.push(...insertedModelItems)
                                } else if (method === 'unshift') {
                                    insertedModelItems = insertedViewItems.map((item) => mappedArrayConfig.reverseTransform(item, { operation: 'unshift' }))
                                    mappedArrayConfig.source.unshift(...insertedModelItems)
                                } else if (method === 'splice') {
                                    insertedModelItems = insertedViewItems.map((item) => mappedArrayConfig.reverseTransform(item,
                                        { operation: 'splice', start: change.startIndex, deleteCount: change.deleteCount, insertCount: insertedViewItems.length }))

                                    mappedArrayConfig.source.splice(change.startIndex, change.deleteCount, ...insertedModelItems)
                                } else if (method === 'pop') {
                                    mappedArrayConfig.source.pop()
                                } else if (method === 'shift') {
                                    mappedArrayConfig.source.shift()
                                }
                            }

                            if (change.items) {
                                for (let itemIndex = 0; itemIndex < change.items.length; itemIndex++) {
                                    const item = change.items[itemIndex]
                                    if (item && typeof item === 'object') {
                                        const uuid = UuidItemMap.ensureUuidForItem(item)
                                        const itemFullKey = fullKey ? `${fullKey}.${uuid}` : uuid
                                            // Beispiel: data.persons.push({ name: 'David' }) ->
                                            // danach muss data.persons[2].name = 'Daniel' triggern.

                                        const mappedArrayItemConfig = insertedModelItems[itemIndex] && mappedArrayConfig
                                            ? {
                                                viewModelItem: item,
                                                sourceItem: insertedModelItems[itemIndex],
                                                reverseTransform: mappedArrayConfig.reverseTransform
                                            }
                                            : undefined

                                        makeReactive(item, itemFullKey, mappedArrayItemConfig)
                                    }
                                }
                            }

                            const result = original.apply(this, args)

                            try {
                                Notifier.notifyChange(topData, fullKey, change, dependencies)
                            } catch (error) {
                                throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}" after "${method}"`, { cause: error })
                            }

                            return result
                        },
                        enumerable: false,
                        writable: true,
                        configurable: true
                    })
                }
            }

            function defineReactiveDataProperty(obj, prop, descriptor, nextFullKey, mappedArrayItemConfig = undefined) {
                let _value = descriptor.value

                if (_value && typeof _value === 'object') {
                    // Beispiel: data.person = { address: { city: 'Berlin' } } ->
                    // data.person.address.city = 'Hamburg' soll triggern.
                    // wenn Objekt bereits verschachtelt vorhanden ist, dann muss es auch reaktiv gemacht werden.
                    makeReactive(_value, nextFullKey, mappedArrayItemConfig)
                }

                Object.defineProperty(obj, prop, {
                    get() {
                        return _value
                    },
                    set(newValue) {
                        ModelSynchronization.synchronizeViewModelItemWithModelArray(mappedArrayItemConfig)

                        if (newValue && typeof newValue === 'object') {
                            // Beispiel: data.person.address = { city: 'Köln' } ->
                            // danach data.person.address.city = 'Bonn' soll triggern. (multilevel reactivity)
                            // wenn verschachteltes Objekt gesetzt wird, dann muss es auch reaktiv gemacht werden.
                            makeReactive(newValue, nextFullKey, mappedArrayItemConfig)
                        }

                        try {
                            Notifier.notifyKeyChange(topData, nextFullKey, dependencies)
                        } catch (error) {
                            throw new Error(`[TemplateEngine] Error during refresh of "${nextFullKey}"`, { cause: error })
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

                            // falls value ein __source__ und __reverseTransform__ (wird von mappedArray angehangen) hat,
                            // dann makeReactive mit diesem source und reverseTransform aufrufen
                            // beautifiedPersons ist ein Array -> führt zu makeArrayItemsReactive

                            makeReactive(value, nextFullKey,
                                value.__source__ && value.__reverseTransform__ ?
                                { source: value.__source__, reverseTransform: value.__reverseTransform__ } : undefined)
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
                            makeReactive(currentValue, nextFullKey,
                                currentValue.__source__ && currentValue.__reverseTransform__
                                    ? { source: currentValue.__source__, reverseTransform: currentValue.__reverseTransform__ }
                                    : undefined)
                        }

                        try {
                            Notifier.notifyKeyChange(topData, nextFullKey, dependencies)
                        } catch (error) {
                            throw new Error(`[TemplateEngine] Error during refresh of "${nextFullKey}"`, { cause: error })
                        }
                    },
                    enumerable: descriptor.enumerable,
                    configurable: true
                })
            }

            function makeReactive(obj, fullKey = '', mappedArrayConfig = undefined) {
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
                    makeArrayItemsReactive(obj, fullKey, mappedArrayConfig)
                    patchArrayMethods(obj, fullKey, mappedArrayConfig)

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
                        defineReactiveDataProperty(obj, prop, descriptor, nextFullKey, mappedArrayConfig)
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
                RenderEngine.run(data, node, dependencies)
            } catch (error) {
                throw new Error(`[TemplateEngine] Error during initial render: ${error.message}`, { cause: error })
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
