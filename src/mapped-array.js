// Mapped Array Utility: Create bidirectional array mappings for MVVM pattern

export function createMappedArray(source, transform, writableProps = {}, reverseTransform = (x) => x) {
    const arr = source.map((item, index) => {
        const result = transform(item, index)
        
        // Add getter/setter for writable properties
        for (const [prop, sourceProp] of Object.entries(writableProps)) {
            const value = result[prop]
            delete result[prop]
            
            Object.defineProperty(result, prop, {
                get: () => source[index][sourceProp],
                set: (v) => { source[index][sourceProp] = v },
                enumerable: true
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