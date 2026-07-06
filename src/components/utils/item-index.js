// Item index tracking: weakly associated array indices for rendered items

// WeakMap key = Array-Item (Objekt/Funktion), value = aktueller Index
// Vorteil: keine Mutation am Item selbst (kein __item_index__ Property nötig)
const itemIndexByItem = new WeakMap()

export function setItemIndex(item, index) {
    try {
        // WeakMap erlaubt nur Referenztypen als Schlüssel:
        // - typeof obj === 'object'
        // - typeof fn === 'function'
        if (item && (typeof item === 'object' || typeof item === 'function')) {
            itemIndexByItem.set(item, index)
        }
    } catch (error) {
        throw new Error(`[TemplateEngine] Error setting item index: ${error.message}`)
    }
}

export function getItemIndex(item) {
    try {
        // Für primitive Werte (string/number/boolean/...) gibt es keinen WeakMap-Eintrag
        if (item && (typeof item === 'object' || typeof item === 'function')) {
            return itemIndexByItem.get(item)
        }

        return undefined
    } catch (error) {
        throw new Error(`[TemplateEngine] Error getting item index: ${error.message}`)
    }
}
