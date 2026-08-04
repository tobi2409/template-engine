// Mapped Array Utility: Create bidirectional array mappings for MVVM pattern

// Keep one mapped result object per source item (singleton per item).
// This preserves object identity across repeated createMappedArray() calls,
// which is required so context references/index tracking stay consistent
// after array operations like splice/reindex.
/*const mappedItemCache = new WeakMap()

export function createMappedArray(source, transform, writableProps = {}, reverseTransform = (viewModelItem) => viewModelItem) {
    if (!Array.isArray(source)) {
        throw new TypeError(`createMappedArray expected "source" to be an array, got ${source === null ? 'null' : typeof source}`)
    }
    
    if (typeof transform !== 'function') {
        throw new TypeError(`createMappedArray expected "transform" to be a function, got ${typeof transform}`)
    }
    
    if (typeof reverseTransform !== 'function') {
        throw new TypeError(`createMappedArray expected "reverseTransform" to be a function, got ${typeof reverseTransform}`)
    }

    function context(operation, extra = {}) {
        return {
            operation,
            ...extra
        }
    }

    let arr = []

    // writableProps: Maps ViewModel properties to Model properties for bidirectional sync.
    // When a writable property changes, reverseTransform(viewModelItem, context)
    // is applied and the result
    // is written back to the corresponding source property.

    arr = source.map((item, index) => {
        // Reuse previously mapped result (singleton) or create it once.
        let result = mappedItemCache.get(item)

        if (!result) {
            result = transform(item, index)
            mappedItemCache.set(item, result)

            // Add setter for writable properties to sync back to source
            for (const [prop, sourceProp] of Object.entries(writableProps)) {
                let internalValue = result[prop]
                
                Object.defineProperty(result, prop, {
                    get: () => internalValue,
                    set: (v) => {
                        internalValue = v
                        const transformed = reverseTransform(result, context('set', { prop }))

                        if (!transformed || typeof transformed !== 'object') {
                            throw new TypeError(`reverseTransform for writable prop "${prop}" must return an object`)
                        }

                        item[sourceProp] = transformed[sourceProp]
                    },
                    configurable: true
                })
            }
        }

        return result
    })
    
    // Override array methods
    arr.push = (...viewModelItems) => {
        const modelItems = viewModelItems.map((viewModelItem) => reverseTransform(viewModelItem, context('push')))
        // should be mapped to provide the Proxy for setting and list operations
        const mappedViewModelItems = createMappedArray(modelItems, transform, writableProps, reverseTransform)
        Array.prototype.push.apply(arr, mappedViewModelItems)
        return source.push(...modelItems)
    }

    arr.splice = (start, deleteCount, ...items) => {
        const modelItems = items.map((viewModelItem) => reverseTransform(viewModelItem,
            context('splice', { start, deleteCount, insertCount: items.length })))
        const mappedViewModelItems = createMappedArray(modelItems, transform, writableProps, reverseTransform)
        Array.prototype.splice.apply(arr, [start, deleteCount, ...mappedViewModelItems])
        return source.splice(start, deleteCount, ...modelItems)
    }

    arr.unshift = (...items) => {
        const modelItems = items.map((viewModelItem) => reverseTransform(viewModelItem, context('unshift')))
        const mappedViewModelItems = createMappedArray(modelItems, transform, writableProps, reverseTransform)
        Array.prototype.unshift.apply(arr, mappedViewModelItems)
        return source.unshift(...modelItems)
    }

    arr.pop = () => {
        Array.prototype.pop.apply(arr)
        return source.pop()
    }

    arr.shift = () => {
        Array.prototype.shift.apply(arr)
        return source.shift()
    }
    
    return arr
}*/


const MappedArray = (function () {
    const mappedItemCache = new WeakMap()

    function transformArray(source, transform, reverseTransform = (viewModelItem) => viewModelItem) {
        if (!Array.isArray(source)) {
            throw new TypeError(`transformArray expected "source" to be an array, got ${source === null ? 'null' : typeof source}`)
        }
        
        if (typeof transform !== 'function') {
            throw new TypeError(`transformArray expected "transform" to be a function, got ${typeof transform}`)
        }

        if (typeof reverseTransform !== 'function') {
            throw new TypeError(`transformArray expected "reverseTransform" to be a function, got ${typeof reverseTransform}`)
        }

        const transformedArray = source.map((item, index) => {
            let result = mappedItemCache.get(item)

            if (!result) {
                result = transform(item, index)
                mappedItemCache.set(item, result)
            }

            return result
        })

        transformedArray.__source__ = source
        transformedArray.__reverseTransform__ = reverseTransform

        return transformedArray
    }

    return { transformArray }
})()

export default MappedArray