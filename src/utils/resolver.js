// Key-Resolution: Konvertierung und Dereferenzierung von Keys

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
            // a paramname (eg. param1) is always represented by a single-key
            return params.get(segment)
        }

        value = value[segment]
    }

    return value
}

export function resolveEx(key, data, contextStack = new Map(), params = new Map()) {
    // only a paramname is supported for dereferencing
    const dereferencedKey = key.startsWith('*') && params.has(key.slice(1)) ? dereferenceKey(key, data, params) : key
    const fullKey = convertToFullKey(dereferencedKey, contextStack)
    return { fullKey: fullKey, value: resolve(fullKey, data, params) }
}
