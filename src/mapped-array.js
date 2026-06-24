// Mapped Array Utility: Create bidirectional array mappings for MVVM pattern

// Keep one mapped result object per source item (singleton per item).
// This preserves object identity across repeated createMappedArray() calls,
// which is required so context references/index tracking stay consistent
// after array operations like splice/reindex.
const mappedItemCache = new WeakMap()

export function createMappedArray(source, transform, writableProps = {}, reverseTransform = (x) => x) {
    let arr = []
    
    try {
        // writableProps: Maps ViewModel properties to Model properties for bidirectional sync.
        // When a writable property changes, reverseTransform is applied and the result
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
                            const transformed = reverseTransform(result)
                            item[sourceProp] = transformed[sourceProp]
                        },
                        configurable: true
                    })
                }
            }

            return result
        })
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in createMappedArray: ${error.message}`)
    }
    
    // Override array methods
    arr.push = (...items) => {
        try {
            return source.push(...items.map(reverseTransform))
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in mapped array push: ${error.message}`)
        }
    }

    arr.splice = (start, deleteCount, ...items) => {
        try {
            return source.splice(start, deleteCount, ...items.map(reverseTransform))
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in mapped array splice: ${error.message}`)
        }
    }

    arr.unshift = (...items) => {
        try {
            return source.unshift(...items.map(reverseTransform))
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in mapped array unshift: ${error.message}`)
        }
    }

    arr.pop = () => {
        try {
            return source.pop()
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in mapped array pop: ${error.message}`)
        }
    }

    arr.shift = () => {
        try {
            return source.shift()
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in mapped array shift: ${error.message}`)
        }
    }
    
    return arr
}

export default createMappedArray