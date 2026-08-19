const DataExpander = (function () {
    function createModelIndex() {
        return new Map()
    }

    function getExpandTargets(
        parentItem,
        rootModelArray,
        rootViewModelArray,
        modelIndex = createModelIndex(),
        options = {
            modelChildrenKey: 'children',
            viewModelChildrenKey: 'children',
            identifier: 'id'
        }
    ) {
        const { modelChildrenKey, viewModelChildrenKey, identifier } = options
        const modelParent = parentItem ? modelIndex.get(parentItem[identifier]) : undefined
        const modelArray = modelParent ? modelParent[modelChildrenKey] : rootModelArray
        const viewModelArray = parentItem ? parentItem[viewModelChildrenKey] : rootViewModelArray

        return {
            modelParent,
            modelArray,
            viewModelArray
        }
    }

    function expandNextData(
        nextData,
        modelArray,
        viewModelArray,
        modelIndex = createModelIndex(),
        transformItem = (item) => item,
        identifier = 'id'
    ) {
        modelArray.splice(0, modelArray.length, ...nextData)
        nextData.forEach((item) => modelIndex.set(item[identifier], item))
        viewModelArray.splice(
            0,
            viewModelArray.length,
            ...modelArray.map((item) => transformItem(item))
        )

        return viewModelArray
    }

    function createExpandHandler(loadServerData) {
        return (_, viewModelParent) => {
            if (!viewModelParent.childrenLoaded) {
                loadServerData(viewModelParent)
                viewModelParent.childrenLoaded = true
            }

            viewModelParent.expanded = !viewModelParent.expanded
        }
    }

    return {
        createModelIndex,
        getExpandTargets,
        expandNextData,
        createExpandHandler
    }
})()

export default DataExpander
