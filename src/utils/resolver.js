// Key Resolution: Conversion and dereferencing of keys

export function convertToFullKey(relativeKey, contextStack = new Map()) {
    const splitted = relativeKey.split('.')
    const isFirstContext = contextStack.has(splitted[0])

    if (!isFirstContext) {
        return relativeKey
    }

    return convertToFullKey(`${contextStack.get(splitted[0]).of}.${contextStack.get(splitted[0]).index}${splitted.length > 1 ? '.':''}${splitted.slice(1).join('.')}`,
                            contextStack)
}

export function dereferenceKey(key, data, params = new Map()) {
    if (key.startsWith('*')) {
        const indirectKey = key.slice(1)
        return resolve(indirectKey, data, params)
    }

    return key
}

export function resolve(key, data, params = new Map()) {
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
}

export function resolveEx(key, data, contextStack = new Map(), params = new Map()) {
    // Only param names are supported for dereferencing
    const dereferencedKey = key.startsWith('*') && params.has(key.slice(1)) ? dereferenceKey(key, data, params) : key
    const fullKey = convertToFullKey(dereferencedKey, contextStack)
    return { fullKey: fullKey, value: resolve(fullKey, data, params) }
}

export function setByPath(key, data, newValue) {
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
}
