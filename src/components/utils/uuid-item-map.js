const uuidToItemMap = new Map()

export function setItemByUuid(uuid, item) {
    try {
        uuidToItemMap.set(uuid, item)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error setting item by UUID "${uuid}": ${error.message}`)
    }
}

export function getItemByUuid(uuid) {
    try {
        return uuidToItemMap.get(uuid)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error getting item by UUID "${uuid}": ${error.message}`)
    }
}

const itemToUuidMap = new WeakMap()

export function setUuidByItem(item, uuid) {
    try {
        itemToUuidMap.set(item, uuid)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error setting UUID by item: ${error.message}`)
    }
}

export function getUuidByItem(item) {
    try {
        return itemToUuidMap.get(item)
    } catch (error) {
        throw new Error(`[TemplateEngine] Error getting UUID by item: ${error.message}`)
    }
}