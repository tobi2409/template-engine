const ModelSynchronization = (function () {

    function createViewModelItemConfig(mappedArrayConfig) {
        return (mappedArrayConfig
                    && typeof mappedArrayConfig === 'object'
                    && mappedArrayConfig.hasOwnProperty('source')
                    && mappedArrayConfig.hasOwnProperty('reverseTransform')
                    && Array.isArray(mappedArrayConfig.source)
                    && typeof mappedArrayConfig.reverseTransform === 'function')
                    ? {
                        viewModelArray: obj,
                        sourceItem: mappedArrayConfig.source[i],
                        reverseTransform: mappedArrayConfig.reverseTransform
                    }
                    : undefined
    }

    function updateModelArrayByViewModelItem(mappedArrayItemConfig = undefined) {
        if (mappedArrayItemConfig && typeof mappedArrayItemConfig === 'object'
            && typeof mappedArrayItemConfig.reverseTransform === 'function') {
            const transformedModelItem = mappedArrayItemConfig.reverseTransform(mappedArrayItemConfig.viewModelArray,
                                                                                /*{ operation: 'set', prop }*/)

            if (transformedModelItem && typeof transformedModelItem === 'object') {
                const existingSourceItem = mappedArrayItemConfig.sourceItem

                if (existingSourceItem && typeof existingSourceItem === 'object' && existingSourceItem !== obj) {
                    const oldKeys = Object.keys(existingSourceItem)
                    const newKeys = Object.keys(transformedModelItem)

                    for (const oldKey of oldKeys) {
                        if (!newKeys.includes(oldKey)) {
                            delete existingSourceItem[oldKey]
                        }
                    }

                    for (const [modelProp, modelValue] of Object.entries(transformedModelItem)) {
                        existingSourceItem[modelProp] = modelValue
                    }
                }
            }
        }
    }

    return { synchronizeViewModelItemWithModelArray: updateModelArrayByViewModelItem }

})()

export default ModelSynchronization