// NodeHolder Management: Tracking of DOM nodes and their registration

export const nodeHoldersByKeys = new Map()

nodeHoldersByKeys.getByKey = function(fullKey, create = false) {
    try {
        const segments = fullKey.split('.')
        let ref = nodeHoldersByKeys
        
        for (const segment of segments) {
            if (!ref.has(segment)) {
                if (!create) return undefined
                ref.set(segment, new Map())
            }
            ref = ref.get(segment)
        }

        return ref
    } catch (error) {
        throw new Error(`[TemplateEngine] Error in getByKey for "${fullKey}": ${error.message}`)
    }
}

nodeHoldersByKeys.appendToKey = function(fullKey, nodeHolder) {
    try {
        const ref = this.getByKey(fullKey, true)
        
        if (!ref.has('holders')) ref.set('holders', [])
        const holders = ref.get('holders')
        if (!holders.some(e => e.node === nodeHolder.node)) {
            holders.push(nodeHolder)
        }
    } catch (error) {
        throw new Error(`[TemplateEngine] Error appending NodeHolder for "${fullKey}": ${error.message}`)
    }
}
