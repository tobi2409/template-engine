const ModelSynchronization = (function () {

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

    function updateModelItemByViewModelItem(viewModelItemConfig = undefined) {
        if (viewModelItemConfig) {
            const reverseTransformedItem = viewModelItemConfig.reverseTransform(viewModelItemConfig.viewModelItem,
                                                                                /*{ operation: 'set', prop }*/)

            if (reverseTransformedItem && typeof reverseTransformedItem === 'object') {
                const existingModelItem = viewModelItemConfig.modelItem

                if (existingModelItem && typeof existingModelItem === 'object' && existingModelItem !== reverseTransformedItem) {
                    const oldKeys = Object.keys(existingModelItem)
                    const newKeys = Object.keys(reverseTransformedItem)

                    for (const oldKey of oldKeys) {
                        if (!newKeys.includes(oldKey)) {
                            delete existingModelItem[oldKey]
                        }
                    }

                    for (const [modelProp, modelValue] of Object.entries(reverseTransformedItem)) {
                        existingModelItem[modelProp] = modelValue
                    }
                }
            }
        }
    }

    function updateModelArrayByViewModelArrayOperation(viewModelArrayConfig, method, change) {
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

    return { createViewModelArrayConfig, createViewModelItemConfig, updateModelItemByViewModelItem, updateModelArrayByViewModelArrayOperation }

})()

export default ModelSynchronization