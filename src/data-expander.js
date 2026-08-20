const DataExpander = (function () {
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
        viewModelArray,
        modelArray,
        transformItem = (item) => item
    ) {
        modelArray.splice(0, modelArray.length, ...nextData)
        
        viewModelArray.splice(
            0,
            viewModelArray.length,
            ...modelArray.map((item) => transformItem(item))
        )

        return viewModelArray
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

export default DataExpander
