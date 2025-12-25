// Key Resolution: Conversion and dereferencing of keys

export function convertToFullKey(relativeKey, contextStack = new Map()) {
    try {
        const splitted = relativeKey.split('.')
        const isFirstContext = contextStack.has(splitted[0])

        if (!isFirstContext) {
            return relativeKey
        }

        // Build full key by iterating through contextStack (preserves insertion order)
        let fullKey = ''
        
        // Iterate through all contexts up to and including the target
        for (const [key, context] of contextStack.entries()) {
            const index = context.data.__item_index__
            fullKey += `${context.prop}.${index}`
            
            // Stop when we reach the target context
            if (key === splitted[0]) {
                break
            }
            
            // Add dot separator for next context
            fullKey += '.'
        }
        
        // Add remaining relative path (properties after the context variable)
        if (splitted.length > 1) {
            fullKey += '.' + splitted.slice(1).join('.')
        }
        //console.log(fullKey)        
        return fullKey
    } catch (error) {
        throw new Error(`[TemplateEngine] Error converting to full key for "${relativeKey}": ${error.message}`)
    }
}

export function dereferenceKey(key, data, params = new Map()) {
    try {
        if (key.startsWith('*')) {
            const indirectKey = key.slice(1)
            return resolve(indirectKey, data, params)
        }

        return key
    } catch (error) {
        throw new Error(`[TemplateEngine] Error dereferencing key "${key}": ${error.message}`)
    }
}

export function resolve(key, data, params = new Map()) {
    try {
        const splitted = key.split('.')
        let value = data

        for (const [index, segment] of splitted.entries()) {
            if (index === 0 && params.has(segment)) {
                // A param name (e.g., param1) is always represented by a single key
                return params.get(segment)
            }

            try {
                value = value[segment]
            } catch (error) {
                // console.warn because not all data needs to be rendered and present in NodeHolders
                console.warn(`[TemplateEngine] Error resolving key segment "${segment}": ${error.message}`)
            }
        }

        return value
    } catch (error) {
        throw new Error(`[TemplateEngine] Error resolving key "${key}": ${error.message}`)
    }
}

export function resolveEx(key, data, contextStack = new Map(), params = new Map()) {
    try {
        // Only param names are supported for dereferencing
        const dereferencedKey = key.startsWith('*') && params.has(key.slice(1)) ? dereferenceKey(key, data, params) : key
        const fullKey = convertToFullKey(dereferencedKey, contextStack)
        return { fullKey: fullKey, value: resolve(fullKey, data, params) }
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in resolveEx for key "${key}": ${error.message}`)
    }
}

export function setByPath(key, data, newValue) {
    try {
        const splitted = key.split('.')
        let target = data

        // Navigate to parent object
        for (let i = 0; i < splitted.length - 1; i++) {
            target = target[splitted[i]]
            if (!target) {
                throw new Error(`[TemplateEngine] Cannot set "${key}": path does not exist`)
            }
        }

        // Set final property (triggers Proxy setter if target is a Proxy)
        const lastKey = splitted[splitted.length - 1]
        target[lastKey] = newValue
    } catch (error) {
        throw new Error(`[TemplateEngine] Error setting value by path "${key}": ${error.message}`)
    }
}
