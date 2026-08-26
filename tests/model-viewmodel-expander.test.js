import test from 'node:test'
import assert from 'node:assert/strict'

import ModelViewModelExpander from '../src/model-viewmodel-expander.js'
import JournalControl from '../src/components/reactivity-helpers/journal-control.js'

test('getExpandTargets returns root arrays when no parent item exists', () => {
    const rootModelArray = [{ id: 1, children: [] }]
    const rootViewModelArray = [{ id: 1, children: [] }]

    const result = ModelViewModelExpander.getExpandTargets(undefined, undefined, rootViewModelArray, rootModelArray)

    assert.equal(result.viewModelArray, rootViewModelArray)
    assert.equal(result.modelItem, undefined)
    assert.equal(result.modelArray, rootModelArray)
})

test('getExpandTargets resolves nested child arrays using the model parent', () => {
    const rootModelArray = [{ id: 1, children: [] }]
    const rootViewModelArray = [{ id: 1, children: [] }]
    const parent = { id: 7, children: [{ id: 9, children: [] }] }
    const result = ModelViewModelExpander.getExpandTargets(parent, parent, rootViewModelArray, rootModelArray)

    assert.deepEqual(result.modelItem, { id: 7, children: [{ id: 9, children: [] }] })
    assert.deepEqual(result.modelArray, [{ id: 9, children: [] }])
    assert.deepEqual(result.viewModelArray, [{ id: 9, children: [] }])
})

test('expandNextData replaces model and view model arrays', () => {
    const modelArray = [{ id: 1, name: 'old' }]
    const viewModelArray = [{ id: 1, name: 'OLD' }]
    const nextData = [{ id: 2, name: 'beta' }, { id: 3, name: 'gamma' }]

    const result = ModelViewModelExpander.expandNextData(
        nextData,
        viewModelArray,
        modelArray,
        (item) => {
            assert.equal(JournalControl.isJournalingDisabled(), true)
            return { id: item.id, name: item.name.toUpperCase() }
        }
    )

    assert.deepEqual(modelArray, nextData)
    assert.deepEqual(viewModelArray, [
        { id: 2, name: 'BETA' },
        { id: 3, name: 'GAMMA' }
    ])
    assert.equal(result, viewModelArray)
    assert.equal(JournalControl.isJournalingDisabled(), false)
})

test('createExpandHandler loads children once and toggles expansion', () => {
    // Captures calls to the loader passed into the handler factory.
    const viewModelArray = []
    const expand = ModelViewModelExpander.createExpandHandler((viewModelParent) => viewModelArray.push(viewModelParent))
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

test('createExpandHandler supports custom expand options', () => {
    let loadCount = 0
    const expand = ModelViewModelExpander.createExpandHandler(() => loadCount++, {
        expandedAttribute: 'isExpanded',
        childrenLoadedAttribute: 'hasLoadedChildren'
    })
    const viewModelParent = { isExpanded: false, hasLoadedChildren: false }

    expand(undefined, viewModelParent)
    expand(undefined, viewModelParent)

    assert.equal(loadCount, 1)
    assert.deepEqual(viewModelParent, { isExpanded: false, hasLoadedChildren: true })
})