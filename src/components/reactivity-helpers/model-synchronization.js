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
                reverseTransform: viewModelArray.__reverseTransform__
            } : undefined
    }

    function createViewModelItemConfig(viewModelArrayConfig, index) {
        return viewModelArrayConfig
                && viewModelArrayConfig.modelArray
                && viewModelArrayConfig.reverseTransform
                ? {
                    viewModelItem: viewModelArrayConfig.viewModelArray[index],
                    modelItem: viewModelArrayConfig.modelArray[index],
                    reverseTransform: viewModelArrayConfig.reverseTransform
                } : undefined
    }

    function updateModelItemByViewModelItem(viewModelItemConfig, reversedViewModelProps) {
        if (isModelSynchronizationDisabled()) {
            return
        }

        if (viewModelItemConfig) {
            const reverseTransformedItem = viewModelItemConfig.reverseTransform(viewModelItemConfig.viewModelItem, reversedViewModelProps,
                                                                                    viewModelItemConfig.modelItem/*, { operation: 'set', prop }*/)

            if (reverseTransformedItem && typeof reverseTransformedItem === 'object') {
                const existingModelItem = viewModelItemConfig.modelItem

                if (existingModelItem && typeof existingModelItem === 'object' && existingModelItem !== reverseTransformedItem) {
                    const definedEntries = Object.entries(reverseTransformedItem)
                        .filter(([, value]) => value !== undefined)

                    for (const [modelProp, modelValue] of definedEntries) {
                        existingModelItem[modelProp] = modelValue
                    }
                }
            }
        }
    }

    function updateModelArrayByViewModelArrayOperation(viewModelArrayConfig, method, change) {
        if (isModelSynchronizationDisabled()) {
            return
        }

        if (viewModelArrayConfig) {
            if (method === 'push') {
                const insertedModelItems = change.items.map((item) => viewModelArrayConfig.reverseTransform(item/*, { operation: 'push' }*/))
                viewModelArrayConfig.modelArray.push(...insertedModelItems)
            } else if (method === 'unshift') {
                const insertedModelItems = change.items.map((item) => viewModelArrayConfig.reverseTransform(item/*, { operation: 'unshift' }*/))
                viewModelArrayConfig.modelArray.unshift(...insertedModelItems)
            } else if (method === 'splice') {
                const insertedModelItems = change.items.map((item) => viewModelArrayConfig.reverseTransform(item/*,
                    { operation: 'splice', start: change.startIndex, deleteCount: change.deleteCount, insertCount: change.items.length }*/))

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