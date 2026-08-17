import KeyResolver from "../utils/key-resolver.js"

const ModelSynchronization = (function () {

    let modelSynchronizationDisabledDepth = 0

    function isModelSynchronizationDisabled() {
        return modelSynchronizationDisabledDepth > 0
    }

    async function withoutModelSynchronization(callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('[ModelSynchronization] withoutModelSynchronization expected "callback" to be a function')
        }

        modelSynchronizationDisabledDepth++

        try {
            return await Promise.resolve(callback())
        } finally {
            modelSynchronizationDisabledDepth--
        }
    }

    function createViewModelArrayConfig(viewModelArray) {
        return viewModelArray.__modelArray__ && viewModelArray.__reverseTransform__ ?
            { 
                viewModelArray: viewModelArray,
                modelArray: viewModelArray.__modelArray__,
                reverseTransform: viewModelArray.__reverseTransform__,
                propertyMapping: viewModelArray.__propertyMapping__
            } : undefined
    }

    function createViewModelItemConfig(viewModelArrayConfig, index) {
        return viewModelArrayConfig
                && viewModelArrayConfig.modelArray
                && viewModelArrayConfig.reverseTransform
                ? {
                    viewModelItem: viewModelArrayConfig.viewModelArray[index],
                    modelItem: viewModelArrayConfig.modelArray[index],
                    reverseTransform: viewModelArrayConfig.reverseTransform,
                    propertyMapping: viewModelArrayConfig.propertyMapping
                } : undefined
    }

    function updateModelItemByViewModelItem(viewModelItemConfig, currentViewModelProps) {
        if (isModelSynchronizationDisabled()) {
            return
        }

        if (viewModelItemConfig) {
            const reverseTransformedItem = viewModelItemConfig.reverseTransform(viewModelItemConfig.viewModelItem, viewModelItemConfig.modelItem, 
                                                                                    currentViewModelProps /*, { operation: 'set', prop }*/)
                                                                        
            if (reverseTransformedItem && typeof reverseTransformedItem === 'object') {
                const propertyMapping = viewModelItemConfig.propertyMapping
                const existingModelItem = viewModelItemConfig.modelItem

                if (existingModelItem && typeof existingModelItem === 'object') {
                    const currentModelProps = currentViewModelProps.map
                            ((viewModelProp) => Object.keys(propertyMapping).includes(viewModelProp)
                            ? propertyMapping[viewModelProp] : viewModelProp)

                    for (const modelProp of currentModelProps) {
                        KeyResolver.setByPath(modelProp, existingModelItem, KeyResolver.resolve(modelProp, reverseTransformedItem, new Map(), true))
                    }
                }
            }
        }
    }

    function evaluateReverseTransformedValue(value) {
        if (typeof value === 'function') {
            return evaluateReverseTransformedValue(value())
        }

        if (Array.isArray(value)) {
            return value.map(evaluateReverseTransformedValue)
        }

        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.entries(value).map(([key, nestedValue]) =>
                [key, evaluateReverseTransformedValue(nestedValue)]))
        }

        return value
    }

    // viewModelProps isn't used here because we don't have partially updated items in array operations
    function updateModelArrayByViewModelArrayOperation(viewModelArrayConfig, method, change) {
        if (isModelSynchronizationDisabled()) {
            return
        }

        if (viewModelArrayConfig) {
            if (method === 'push') {
                const insertedModelItems = change.items.map((item) =>
                    evaluateReverseTransformedValue(viewModelArrayConfig.reverseTransform(item)))
                viewModelArrayConfig.modelArray.push(...insertedModelItems)
            } else if (method === 'unshift') {
                const insertedModelItems = change.items.map((item) =>
                    evaluateReverseTransformedValue(viewModelArrayConfig.reverseTransform(item)))
                viewModelArrayConfig.modelArray.unshift(...insertedModelItems)
            } else if (method === 'splice') {
                const insertedModelItems = change.items.map((item) =>
                    evaluateReverseTransformedValue(viewModelArrayConfig.reverseTransform(item)))
                viewModelArrayConfig.modelArray.splice(change.startIndex, change.deleteCount, ...insertedModelItems)
            } else if (method === 'pop') {
                viewModelArrayConfig.modelArray.pop()
            } else if (method === 'shift') {
                viewModelArrayConfig.modelArray.shift()
            }
        }
    }

    return {
        createViewModelArrayConfig,
        createViewModelItemConfig,
        updateModelItemByViewModelItem,
        updateModelArrayByViewModelArrayOperation,
        withoutModelSynchronization,
        isModelSynchronizationDisabled
    }

})()

export default ModelSynchronization