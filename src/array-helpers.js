// Array Helpers: small utilities for common array mutations

export function removeByReference(array, item) {
    if (!Array.isArray(array)) {
        return -1
    }

    const index = array.findIndex((entry) => entry === item)

    if (index !== -1) {
        array.splice(index, 1)
    }

    return index
}

export function getParentContext(contextStack, aliasBase = 'item') {
    return contextStack?.get(`${aliasBase}-level-${contextStack.size - 3}`)
}

const ArrayHelpers = {
    removeByReference,
    getParentContext
}

export default ArrayHelpers
