// Key Resolution: Conversion and dereferencing of keys

import UuidItemMap from './uuid-item-map.js'

const KeyResolver = (function () {
    function convertToFullKey(relativeKey, contextStack = new Map()) {
        try {
            const splitted = relativeKey.split('.')
            const isFirstContext = contextStack.has(splitted[0])

            if (!isFirstContext) {
                return relativeKey
            }

            const context = contextStack.get(splitted[0])
            const index = UuidItemMap.getUuidByItem(context.data)

            if (index === undefined) {
                throw new Error(`[TemplateEngine] Cannot resolve relative key "${relativeKey}": item index missing for context "${splitted[0]}"`)
            }

            return convertToFullKey(`${context.fullKey}.${index}${splitted.length > 1 ? '.' : ''}${splitted.slice(1).join('.')}`,
                                    contextStack)
        } catch (error) {
            throw new Error(`[TemplateEngine] Error converting to full key for "${relativeKey}": ${error.message}`)
        }
    }

    function dereferenceKey(key, data, params = new Map()) {
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

    function resolve(key, data, params = new Map()) {
        try {
            const splitted = key.split('.')
            let value = data

            for (const [index, segment] of splitted.entries()) {
                if (index === 0 && params.has(segment)) {
                    return params.get(segment)
                }

                try {
                    if (segment.startsWith('__uuid__')) {
                        value = UuidItemMap.getItemByUuid(segment)
                        continue
                    }

                    value = value[segment]
                } catch (error) {
                    console.warn(`[TemplateEngine] Error resolving key segment "${segment}": ${error.message}`)
                }
            }

            return value
        } catch (error) {
            throw new Error(`[TemplateEngine] Error resolving key "${key}": ${error.message}`)
        }
    }

    function resolveEx(key, data, contextStack = new Map(), params = new Map()) {
        try {
            const dereferencedKey = key.startsWith('*') && params.has(key.slice(1)) ? dereferenceKey(key, data, params) : key
            const fullKey = convertToFullKey(dereferencedKey, contextStack)
            return { fullKey: fullKey, value: resolve(fullKey, data, params) }
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in resolveEx for key "${key}": ${error.message}`)
        }
    }

    function setByPath(key, data, newValue) {
        try {
            const splitted = key.split('.')
            let target = data

            for (let i = 0; i < splitted.length - 1; i++) {
                const segment = splitted[i]

                if (segment.startsWith('__uuid__')) {
                    target = UuidItemMap.getItemByUuid(segment)
                } else {
                    target = target[segment]
                }

                if (!target) {
                    throw new Error(`[TemplateEngine] Cannot set "${key}": path does not exist`)
                }
            }

            const lastKey = splitted[splitted.length - 1]
            target[lastKey] = newValue
        } catch (error) {
            throw new Error(`[TemplateEngine] Error setting value by path "${key}": ${error.message}`)
        }
    }

    return {
        convertToFullKey,
        dereferenceKey,
        resolve,
        resolveEx,
        setByPath
    }
})()

export default KeyResolver