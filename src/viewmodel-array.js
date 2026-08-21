// ViewModelArray Utility: Transform an array of model items into an array of view model items
// and holds reverseTransform function for calling when view model items are updated to synchronize back to the model array.

// Keep one mapped result object per source item (singleton per item).
// This preserves object identity across repeated createMappedArray() calls,
// which is required so context references/index tracking stay consistent
// after array operations like splice/reindex.

const mappedViewModelArrayCache = new WeakMap()
const mappedViewModelItemCache = new WeakMap()

const ViewModelArray = (function () {

    function get(modelArray, transform, reverseTransform = (viewModelItem) => viewModelItem, propertyMapping = {}, state = {}/*, recursive = false*/) {
        if (!Array.isArray(modelArray)) {
            throw new TypeError(`transformArray expected "modelArray" to be an array, got ${modelArray === null ? 'null' : typeof modelArray}`)
        }
        
        if (typeof transform !== 'function') {
            throw new TypeError(`transformArray expected "transform" to be a function, got ${typeof transform}`)
        }

        if (typeof reverseTransform !== 'function') {
            throw new TypeError(`transformArray expected "reverseTransform" to be a function, got ${typeof reverseTransform}`)
        }

        if (propertyMapping === null || typeof propertyMapping !== 'object' || Array.isArray(propertyMapping)) {
            throw new TypeError(`transformArray expected "propertyMapping" to be an object, got ${propertyMapping === null ? 'null' : Array.isArray(propertyMapping) ? 'array' : typeof propertyMapping}`)
        }

        if (state === null || typeof state !== 'object') {
            throw new TypeError('transformArray expected "state" to be an object, got ' + (state === null ? 'null' : typeof state))
        }

        let viewModelArray = mappedViewModelArrayCache.get(modelArray)

        if (!viewModelArray) {
            viewModelArray = modelArray.map((item, index) => {
                let result = mappedViewModelItemCache.get(item)

                if (!result) {
                    result = transform(item, index)
                    mappedViewModelItemCache.set(item, result)
                }

                return result
            })
            
            viewModelArray.__modelArray__ = modelArray
            viewModelArray.__reverseTransform__ = reverseTransform
            viewModelArray.__propertyMapping__ = propertyMapping

            /*if (recursive) {
                viewModelArray.__recursive__ = true
            }*/

            mappedViewModelArrayCache.set(modelArray, viewModelArray)
        }

        return { data: viewModelArray, state }
    }

    return { get }
})()

export default ViewModelArray