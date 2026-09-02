import JournalControl from './components/reactivity-helpers/journal-control.js'

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

        //TODO: Error Handling
        
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
        transformItem = (item) => item,
        append = false
    ) {
        //TODO: Error Handling

        return JournalControl.withoutJournaling(() => {
            if (append) {
                modelArray.push(...nextData)
                viewModelArrayData.push(...nextData.map((item) => transformItem(item)))
                return viewModelArrayData
            }

            modelArray.splice(0, modelArray.length, ...nextData)

            viewModelArrayData.splice(
                0,
                viewModelArrayData.length,
                ...modelArray.map((item) => transformItem(item))
            )

            return viewModelArrayData
        })
    }

    function expand(
        nextData,
        viewModelItem,
        modelItem,
        rootViewModelArray,
        rootModelArray,
        transformItem = (item) => item,
        options = undefined,
        append = false
    ) {
        const { viewModelArray, modelArray } = getExpandTargets(
            viewModelItem,
            modelItem,
            rootViewModelArray,
            rootModelArray,
            options
        )

        return expandNextData(
            nextData,
            viewModelArray?.data,
            modelArray,
            transformItem,
            append
        )
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
        expand,
        createExpandHandler
    }
})()

export default ModelViewModelExpander