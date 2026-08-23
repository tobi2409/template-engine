const ReactivityFrame = (function () {
    const defaultArrayMethods = ['push', 'pop', 'shift', 'unshift', 'splice']

    function createArrayChange(method, args, array, fullKey) {
        const change = { fullKey, action: method }

        if (method === 'push' || method === 'unshift') {
            change.items = args
        } else if (method === 'splice') {
            change.startIndex = args[0]
            change.deleteCount = args[1] || 0
            change.items = args.slice(2)
        }

        return change
    }

    function getInsertStartIndex(method, arrayLength, itemCount) {
        if (method === 'unshift') {
            return 0
        }

        if (method === 'push') {
            return arrayLength - itemCount
        }

        return 0
    }

    function patchArrayMethods(array, fullKey, extraParams) {

        const {
            getArrayItemKey = (_, index) => String(index),
            getArrayItemExtraParams = () => ({}),
            onArrayItem = () => {},
            onArrayChange = () => {},
            onArrayItemsChange = () => {}
        } = extraParams

        for (const method of defaultArrayMethods) {
            const original = array[method] !== Array.prototype[method]
                ? array[method]
                : Array.prototype[method]

            Object.defineProperty(array, method, {
                value: function (...args) {
                    const change = createArrayChange(method, args, this, fullKey)
                    const result = original.apply(this, args)

                    onArrayChange(change, this, extraParams)

                    if (change.items) {
                        const insertStartIndex = getInsertStartIndex(method, this.length, change.items.length)

                        for (let itemIndex = 0; itemIndex < change.items.length; itemIndex++) {
                            const item = change.items[itemIndex]

                            if (item && typeof item === 'object') {
                                const arrayIndex = insertStartIndex + itemIndex
                                const itemKey = getArrayItemKey(item, arrayIndex, this, fullKey)
                                const itemFullKey = fullKey ? `${fullKey}.${itemKey}` : String(itemKey)
                                const itemExtraParams = {
                                    ...extraParams,
                                    ...getArrayItemExtraParams(item, arrayIndex, extraParams, itemFullKey)
                                }

                                onArrayItem(item, arrayIndex, itemFullKey, itemExtraParams, extraParams)
                                makeReactive(item, itemFullKey, itemExtraParams)
                            }
                        }
                    }

                    onArrayItemsChange(change, this, extraParams)
                    return result
                },
                enumerable: false,
                writable: true,
                configurable: true
            })
        }
    }

    function makeArrayItemsReactive(array, fullKey, extraParams) {

        const {
            getArrayItemKey = (_, index) => String(index),
            getArrayItemExtraParams = () => ({}),
            onArrayItem = () => {}
        } = extraParams

        for (let index = 0; index < array.length; index++) {
            const item = array[index]

            if (item && typeof item === 'object') {
                const itemKey = getArrayItemKey(item, index, array, fullKey)
                const itemFullKey = fullKey ? `${fullKey}.${itemKey}` : String(itemKey)
                const itemExtraParams = {
                    ...extraParams,
                    ...getArrayItemExtraParams(item, index, extraParams, itemFullKey)
                }

                onArrayItem(item, index, itemFullKey, itemExtraParams, extraParams)
                makeReactive(item, itemFullKey, itemExtraParams)
            }
        }
    }

    function defineDataProperty(obj, prop, descriptor, fullKey, extraParams) {

        const {
            getNestedExtraParams = () => ({}),
            onDataPropertyGet = () => {},
            onDataPropertySet = () => {}
        } = extraParams

        let value = descriptor.value
        const objectSegments = extraParams.objectSegments
        const currentObjectSegments = objectSegments ? `${objectSegments}.${prop}` : prop

        // Data-property values already exist while the object is instrumented.
        if (value && typeof value === 'object') {
            makeReactive(value, fullKey, {
                ...extraParams,
                ...getNestedExtraParams(value, fullKey, extraParams),
                objectSegments: currentObjectSegments
            })
        }

        Object.defineProperty(obj, prop, {
            get() {
                onDataPropertyGet({ object: obj, property: prop, fullKey, value, extraParams })
                return value
            },
            set(newValue) {
                const oldValue = value
                value = newValue

                if (newValue && typeof newValue === 'object') {
                    makeReactive(newValue, fullKey, {
                        ...extraParams,
                        ...getNestedExtraParams(newValue, fullKey, extraParams),
                        objectSegments: currentObjectSegments
                    })
                }

                onDataPropertySet({
                    object: obj,
                    property: prop,
                    fullKey,
                    oldValue,
                    newValue,
                    extraParams: {
                        ...extraParams,
                        objectSegments: currentObjectSegments
                    }
                })
            },
            enumerable: descriptor.enumerable,
            configurable: true
        })
    }

    function defineAccessorProperty(obj, prop, descriptor, fullKey, extraParams) {

        const {
            getNestedExtraParams = () => ({}),
            onAccessorPropertyGet = () => {},
            onAccessorPropertySet = () => {}
        } = extraParams

        Object.defineProperty(obj, prop, {
            get() {
                const value = descriptor.get ? descriptor.get.call(this) : undefined
                
                if (value && typeof value === 'object') {
                    makeReactive(value, fullKey, {
                        ...extraParams,
                        ...getNestedExtraParams(value, fullKey, extraParams)
                    })
                }

                onAccessorPropertyGet({ object: obj, property: prop, fullKey, value, extraParams })
                return value
            },
            set(newValue) {
                if (!descriptor.set) {
                    return
                }

                const oldValue = descriptor.get ? descriptor.get.call(this) : undefined
                descriptor.set.call(this, newValue)
                const value = descriptor.get ? descriptor.get.call(this) : newValue

                if (value && typeof value === 'object') {
                    makeReactive(value, fullKey, {
                        ...extraParams,
                        ...getNestedExtraParams(value, fullKey, extraParams)
                    })
                }

                onAccessorPropertySet({
                    object: obj,
                    property: prop,
                    fullKey,
                    oldValue,
                    newValue: value,
                    extraParams
                })
            },
            enumerable: descriptor.enumerable,
            configurable: true
        })
    }

    function makeReactive(obj, fullKey = '', extraParams = {}) {
        if (!obj || typeof obj !== 'object') {
            return obj
        }

        const {
            marker = '__reactive__',
            getArrayItemKey = (_, index) => String(index),
            getArrayItemExtraParams = () => ({}),
            getNestedExtraParams = () => ({}),
            onArrayItem = () => {},
            onArrayChange = () => {},
            onArrayItemsChange = () => {},
            onDataPropertyGet = () => {},
            onDataPropertySet = () => {},
            onAccessorPropertyGet = () => {},
            onAccessorPropertySet = () => {}
        } = extraParams

        if (Object.prototype.hasOwnProperty.call(obj, marker) && obj[marker] === true) {
            return obj
        }

        Object.defineProperty(obj, marker, {
            value: true,
            enumerable: false,
            writable: false,
            configurable: false
        })

        if (Array.isArray(obj)) {
            makeArrayItemsReactive(obj, fullKey, extraParams)
            patchArrayMethods(obj, fullKey, extraParams)
            return obj
        }

        const descriptors = Object.getOwnPropertyDescriptors(obj)

        for (const [prop, descriptor] of Object.entries(descriptors)) {
            if (prop === marker || descriptor.configurable === false) {
                continue
            }

            const nextFullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

            if ('value' in descriptor) {
                defineDataProperty(obj, prop, descriptor, nextFullKey, extraParams)
            } else {
                defineAccessorProperty(obj, prop, descriptor, nextFullKey, extraParams)
            }
        }

        return obj
    }

    return { makeReactive }
})()

export default ReactivityFrame