// Mapped Array Utility: Create bidirectional array mappings for MVVM pattern

export function createMappedArray(source, transform, writableProps = {}, reverseTransform = (x) => x, cachedProps = {}, options = {}) {
    const { idProperty = 'id' } = options
    
    const arr = source.map((item, index) => {
        const result = transform(item, index)
        
        // Add getter/setter for writable properties
        for (const [prop, sourceProp] of Object.entries(writableProps)) {
            delete result[prop]

            Object.defineProperty(result, prop, {
                get: () => {
                    const targetItem = source.find(s => s[idProperty] === item[idProperty])
                    return targetItem ? targetItem[sourceProp] : undefined
                },
                set: (v) => {
                    const targetItem = source.find(s => s[idProperty] === item[idProperty])
                    if (targetItem) targetItem[sourceProp] = v
                }
            })
        }
        
        // Add getter/setter for cached properties (UI state)
        for (const [prop, cache] of Object.entries(cachedProps)) {
            const itemId = item.id
            const defaultValue = result[prop] !== undefined ? result[prop] : false
            delete result[prop]
            Object.defineProperty(result, prop, {
                get: () => cache[itemId] !== undefined ? cache[itemId] : defaultValue,
                set: (v) => { cache[itemId] = v },
            })
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