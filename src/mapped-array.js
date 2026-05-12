// Mapped Array Utility: Create bidirectional array mappings for MVVM pattern

// Keep one mapped result object per source item (singleton per item).
// This preserves object identity across repeated createMappedArray() calls,
// which is required so context references/index tracking stay consistent
// after array operations like splice/reindex.
const mappedItemCache = new WeakMap()

export function createMappedArray(source, transform, writableProps = {}, reverseTransform = (x) => x) {
    // writableProps: Maps ViewModel properties to Model properties for bidirectional sync.
    // When a writable property changes, reverseTransform is applied and the result
    // is written back to the corresponding source property.

    const arr = source.map((item, index) => {
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
                        const transformed = reverseTransform(result)
                        item[sourceProp] = transformed[sourceProp]
                    },
                    configurable: true
                })
            }
        }

        return result
    })
    
    // Override array methods
    arr.push = (...items) => source.push(...items.map(reverseTransform))
    arr.splice = (start, deleteCount, ...items) => source.splice(start, deleteCount, ...items.map(reverseTransform))
    arr.unshift = (...items) => source.unshift(...items.map(reverseTransform))
    arr.pop = () => source.pop()
    arr.shift = () => source.shift()
    
    return arr
}