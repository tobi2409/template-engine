import test from 'node:test'
import assert from 'node:assert/strict'

import DataExpander from '../src/data-expander.js'

test('createModelIndex creates an empty Map', () => {
    const modelIndex = DataExpander.createModelIndex()

    assert.ok(modelIndex instanceof Map)
    assert.equal(modelIndex.size, 0)
})

test('getExpandTargets returns root arrays when no parent item exists', () => {
    const rootModelArray = [{ id: 1, children: [] }]
    const rootViewModelArray = [{ id: 1, children: [] }]

    const result = DataExpander.getExpandTargets(undefined, rootModelArray, rootViewModelArray)

    assert.equal(result.modelParent, undefined)
    assert.equal(result.modelArray, rootModelArray)
    assert.equal(result.viewModelArray, rootViewModelArray)
})

test('getExpandTargets resolves nested child arrays using the model index', () => {
    const rootModelArray = [{ id: 1, children: [] }]
    const rootViewModelArray = [{ id: 1, children: [] }]
    const parent = { id: 7, children: [{ id: 9, children: [] }] }
    const modelIndex = new Map([[7, { id: 7, children: parent.children }]])

    const result = DataExpander.getExpandTargets(parent, rootModelArray, rootViewModelArray, modelIndex)

    assert.deepEqual(result.modelParent, { id: 7, children: [{ id: 9, children: [] }] })
    assert.deepEqual(result.modelArray, [{ id: 9, children: [] }])
    assert.deepEqual(result.viewModelArray, [{ id: 9, children: [] }])
})

test('expandNextData replaces model and view model arrays and tracks ids', () => {
    const modelArray = [{ id: 1, name: 'old' }]
    const viewModelArray = [{ id: 1, name: 'OLD' }]
    const modelIndex = new Map()
    const nextData = [{ id: 2, name: 'beta' }, { id: 3, name: 'gamma' }]

    const result = DataExpander.expandNextData(
        nextData,
        modelArray,
        viewModelArray,
        modelIndex,
        (item) => ({ id: item.id, name: item.name.toUpperCase() })
    )

    assert.deepEqual(modelArray, nextData)
    assert.equal(modelIndex.get(2), nextData[0])
    assert.equal(modelIndex.get(3), nextData[1])
    assert.deepEqual(viewModelArray, [
        { id: 2, name: 'BETA' },
        { id: 3, name: 'GAMMA' }
    ])
    assert.equal(result, viewModelArray)
})

test('createExpandHandler loads children once and toggles expansion', () => {
    // Captures calls to the loader passed into the handler factory.
    const viewModelArray = []
    const expand = DataExpander.createExpandHandler((viewModelParent) => viewModelArray.push(viewModelParent))
    const viewModelParent = { expanded: false, childrenLoaded: false }

    // The first expansion loads the children and marks the item as expanded.
    expand(undefined, viewModelParent)

    assert.deepEqual(viewModelArray, [viewModelParent])
    assert.deepEqual(viewModelParent, { expanded: true, childrenLoaded: true })

    // Later expansions only toggle visibility; they must not load again.
    expand(undefined, viewModelParent)

    assert.deepEqual(viewModelArray, [viewModelParent])
    assert.deepEqual(viewModelParent, { expanded: false, childrenLoaded: true })
})
