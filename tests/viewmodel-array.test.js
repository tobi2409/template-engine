import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import ViewModelArray from '../src/viewmodel-array.js'

describe('ViewModelArray.get', () => {
    test('maps source items with transform', () => {
        const source = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
        const arr = ViewModelArray.get(source, (item) => ({ label: item.name.toUpperCase() }))

        assert.equal(arr[0].label, 'ALICE')
        assert.equal(arr[1].label, 'BOB')
    })

    test('returns same viewModelArray instance for same source array', () => {
        const source = [{ id: 1, name: 'Alice' }]

        const arr1 = ViewModelArray.get(source, (item) => ({ label: item.name }))
        const arr2 = ViewModelArray.get(source, (item) => ({ label: `other-${item.name}` }))

        assert.strictEqual(arr1, arr2)
    })

    test('returns same mapped item instance for same source item', () => {
        const source = [{ id: 1, name: 'Alice' }]

        const arr1 = ViewModelArray.get(source, (item) => ({ label: item.name }))
        const arr2 = ViewModelArray.get(source, (item) => ({ label: item.name }))

        assert.strictEqual(arr1[0], arr2[0])
    })

    test('stores model array and reverse transform on mapped array', () => {
        const source = [{ id: 1, name: 'Alice' }]
        const reverseTransform = (viewModelItem) => ({ name: viewModelItem.label })

        const arr = ViewModelArray.get(source, (item) => ({ label: item.name }), reverseTransform)

        assert.strictEqual(arr.__modelArray__, source)
        assert.strictEqual(arr.__reverseTransform__, reverseTransform)
    })

    test('throws for non-array modelArray', () => {
        assert.throws(
            () => ViewModelArray.get(null, () => ({})),
            /expected "modelArray" to be an array/
        )
    })

    test('throws for non-function transform', () => {
        assert.throws(
            () => ViewModelArray.get([], null),
            /expected "transform" to be a function/
        )
    })

    test('throws for non-function reverseTransform', () => {
        assert.throws(
            () => ViewModelArray.get([], () => ({}), null),
            /expected "reverseTransform" to be a function/
        )
    })
})

describe('ViewModelArray.markRecursive', () => {
    test('returns cloned array with recursive marker', () => {
        const original = [{ id: 1 }]
        const recursive = ViewModelArray.markRecursive(original)

        assert.notStrictEqual(recursive, original)
        assert.equal(recursive.length, 1)
        assert.strictEqual(recursive[0], original[0])
        assert.equal(recursive.__recursive__, true)
    })

    test('throws for non-array input', () => {
        assert.throws(
            () => ViewModelArray.markRecursive(undefined),
            /expected "viewModelArray" to be an array/
        )
    })
})
