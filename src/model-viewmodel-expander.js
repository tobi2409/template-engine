const ModelViewModelExpander = (function () {

    function getExpandTargets(
        viewModelItem,
        modelItem,
        rootViewModelArray,
        rootModelArray,
        options = {
            viewModelChildrenKey: 'children',
            modelChildrenKey: 'children'
        }
    ) {
        const { modelChildrenKey, viewModelChildrenKey } = options
        
        const modelArray = modelItem ? modelItem[modelChildrenKey] : rootModelArray
        const viewModelArray = viewModelItem ? viewModelItem[viewModelChildrenKey] : rootViewModelArray

        return {
            viewModelArray,
            modelItem,
            modelArray
        }
    }

    function expandNextData(
        nextData,
        viewModelArrayData,
        modelArray,
        transformItem = (item) => item
    ) {
        modelArray.splice(0, modelArray.length, ...nextData)

        viewModelArrayData.splice(
            0,
            viewModelArrayData.length,
            ...modelArray.map((item) => transformItem(item))
        )

        return viewModelArrayData
    }

    function createExpandHandler(loadServerData, options = {}) {
        return (_, viewModelParent) => {
            const { expandedAttribute = 'expanded', childrenLoadedAttribute = 'childrenLoaded' } = options

            if (!viewModelParent[childrenLoadedAttribute]) {
                loadServerData(viewModelParent)
                viewModelParent[childrenLoadedAttribute] = true
            }

            viewModelParent[expandedAttribute] = !viewModelParent[expandedAttribute]
        }
    }

    return {
        getExpandTargets,
        expandNextData,
        createExpandHandler
    }
})()

export default ModelViewModelExpander