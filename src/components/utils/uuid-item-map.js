const UuidItemMap = (function () {
    const uuidToItemMap = new Map()
    const itemToUuidMap = new WeakMap()

    function setItemByUuid(uuid, item) {
        try {
            uuidToItemMap.set(uuid, item)
        } catch (error) {
            throw new Error(`[TemplateEngine] Error setting item by UUID "${uuid}": ${error.message}`)
        }
    }

    function getItemByUuid(uuid) {
        try {
            return uuidToItemMap.get(uuid)
        } catch (error) {
            throw new Error(`[TemplateEngine] Error getting item by UUID "${uuid}": ${error.message}`)
        }
    }

    function setUuidByItem(item, uuid) {
        try {
            itemToUuidMap.set(item, uuid)
        } catch (error) {
            throw new Error(`[TemplateEngine] Error setting UUID by item: ${error.message}`)
        }
    }

    function getUuidByItem(item) {
        try {
            return itemToUuidMap.get(item)
        } catch (error) {
            throw new Error(`[TemplateEngine] Error getting UUID by item: ${error.message}`)
        }
    }

    function ensureUuidForItem(item) {
        try {
            if (!item || typeof item !== 'object') {
                return undefined
            }

            const uuid = getUuidByItem(item) || `__uuid__${crypto.randomUUID()}`
            setItemByUuid(uuid, item)
            setUuidByItem(item, uuid)
            return uuid
        } catch (error) {
            throw new Error(`[TemplateEngine] Error ensuring UUID for item: ${error.message}`)
        }
    }

    return {
        setItemByUuid,
        getItemByUuid,
        setUuidByItem,
        getUuidByItem,
        ensureUuidForItem
    }
})()

export default UuidItemMap