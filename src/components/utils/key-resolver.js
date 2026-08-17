// Key Resolution: Conversion and dereferencing of keys

import UuidItemMap from './uuid-item-map.js'

const KeyResolver = (function () {
    function convertToFullKey(relativeKey, contextStack = new Map()) {
        const splitted = relativeKey.split('.')
        const isFirstContext = contextStack.has(splitted[0])

        if (!isFirstContext) {
            return relativeKey
        }

        const context = contextStack.get(splitted[0])
        const index = UuidItemMap.getUuidByItem(context.data)

        if (index === undefined) {
            throw new Error(`Cannot resolve relative key "${relativeKey}": item index missing for context "${splitted[0]}"`)
        }

        return convertToFullKey(`${context.fullKey}.${index}${splitted.length > 1 ? '.' : ''}${splitted.slice(1).join('.')}`,
                                contextStack)
    }

    function dereferenceKey(key, data, params = new Map()) {
        if (key.startsWith('*')) {
            const indirectKey = key.slice(1)
            return resolve(indirectKey, data, params)
        }

        return key
    }

    function resolve(key, data, params = new Map(), evaluateFunctions = false) {
        const splitted = key.split('.')
        let value = data

        for (const [index, segment] of splitted.entries()) {
            if (index === 0 && params.has(segment)) {
                value = params.get(segment)
                return evaluateFunctions && typeof value === 'function' ? value() : value
            }

            if (segment.startsWith('__uuid__')) {
                const itemByUuid = UuidItemMap.getItemByUuid(segment)

                if (itemByUuid === undefined) {
                    throw new Error(`Error resolving key "${key}": UUID segment "${segment}" does not exist`)
                }

                value = itemByUuid
                continue
            }

            if (value === null || value === undefined) {
                const traversed = splitted.slice(0, index).join('.') || 'data-root'
                throw new Error(`Error resolving key "${key}": segment "${segment}" cannot be resolved because "${traversed}" is ${value === null ? 'null' : 'undefined'}`)
            }

            value = value[segment]

            if (evaluateFunctions && typeof value === 'function') {
                value = value()
            }
        }

        return value
    }

    function resolveEx(key, data, contextStack = new Map(), params = new Map()) {
        const dereferencedKey = key.startsWith('*') && params.has(key.slice(1)) ? dereferenceKey(key, data, params) : key
        const fullKey = convertToFullKey(dereferencedKey, contextStack)
        return { fullKey: fullKey, value: resolve(fullKey, data, params) }
    }

    function setByPath(key, data, newValue) {
        const splitted = key.split('.')
        let target = data

        for (let i = 0; i < splitted.length - 1; i++) {
            const segment = splitted[i]

            if (segment.startsWith('__uuid__')) {
                target = UuidItemMap.getItemByUuid(segment)
            } else {
                target = target[segment]
            }

            if (target === null || target === undefined) {
                const traversed = splitted.slice(0, i + 1).join('.')
                throw new Error(`Cannot set "${key}": path "${traversed}" does not exist`)
            }
        }

        const lastKey = splitted[splitted.length - 1]
        target[lastKey] = newValue
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