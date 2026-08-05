import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { createMappedArray } from '../src/viewmodel-array.js'

describe('createMappedArray', () => {
    test('maps source items with transform', () => {
        const source = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
        const arr = createMappedArray(source, (item) => ({ label: item.name.toUpperCase() }))

        assert.equal(arr[0].label, 'ALICE')
        assert.equal(arr[1].label, 'BOB')
    })

    test('passes index to transform', () => {
        const source = [{ id: 1 }, { id: 2 }]
        const arr = createMappedArray(source, (item, index) => ({ index }))

        assert.equal(arr[0].index, 0)
        assert.equal(arr[1].index, 1)
    })

    test('returns same result object for same source item (singleton)', () => {
        const source = [{ id: 1, name: 'Alice' }]
        const arr1 = createMappedArray(source, (item) => ({ label: item.name }))
        const arr2 = createMappedArray(source, (item) => ({ label: item.name }))

        // mappedItemCache reuses one mapped object per source item (WeakMap),
        // therefore both calls return the same object reference.
        assert.strictEqual(arr1[0], arr2[0])
    })

    test('writableProps syncs value back to source via reverseTransform', () => {
        const source = [{ id: 1, name: 'Alice', birthyear: 2000 }]
        const arr = createMappedArray(
            source,
            (item) => ({ name: item.name, age: new Date().getFullYear() - item.birthyear }),
            { age: 'birthyear' },
            (result) => ({ birthyear: new Date().getFullYear() - result.age })
        )

        arr[0].age = 30
        assert.equal(source[0].birthyear, new Date().getFullYear() - 30)
    })

    test('writableProps get returns internal value', () => {
        const source = [{ id: 1, value: 10 }]
        const arr = createMappedArray(
            source,
            (item) => ({ value: item.value }),
            { value: 'value' },
            (result) => ({ value: result.value })
        )

        arr[0].value = 42
        assert.equal(arr[0].value, 42)
    })

    test('passes set operation context to reverseTransform on writable updates', () => {
        const source = [{ id: 1, name: 'Alice', birthyear: 2000 }]

        let receivedContext = null

        const arr = createMappedArray(
            source,
            (item) => ({ name: item.name, age: new Date().getFullYear() - item.birthyear }),
            { age: 'birthyear' },
            (viewModelItem, context) => {
                receivedContext = context
                return { birthyear: new Date().getFullYear() - viewModelItem.age }
            }
        )

        arr[0].age = 29

        assert.equal(receivedContext.operation, 'set')
        assert.equal(receivedContext.prop, 'age')
    })

    test('push delegates to source via reverseTransform', () => {
        const source = [{ id: 1, name: 'Alice' }]
        const arr = createMappedArray(
            source,
            (item) => ({ label: item.name }),
            {},
            (result) => ({ name: result.label })
        )

        const pushed = { label: 'Bob' }
        arr.push(pushed)
        assert.equal(source.length, 2)
        assert.equal(source[1].name, 'Bob')
        // view-array should contain a mapped view object for the pushed item
        assert.equal(arr[1].label, 'Bob')
        // the view entry must not be the same object that was pushed (it must be created by createMappedArray)
        assert.notStrictEqual(arr[1], pushed)
    })

    test('passes push operation context to reverseTransform', () => {
        const source = [{ id: 1, name: 'Alice' }]

        let receivedContext = null

        const arr = createMappedArray(
            source,
            (item) => ({ label: item.name }),
            {},
            (result, context) => {
                receivedContext = context
                return { name: result.label }
            }
        )

        arr.push({ label: 'Bob' })

        assert.equal(receivedContext.operation, 'push')
    })

    test('pop removes last item from source', () => {
        const source = [{ id: 1 }, { id: 2 }]
        const arr = createMappedArray(source, (item) => ({ id: item.id }))

        arr.pop()
        assert.equal(source.length, 1)
        assert.equal(arr.length, 1)
    })

    test('shift removes first item from source', () => {
        const source = [{ id: 1 }, { id: 2 }]
        const arr = createMappedArray(source, (item) => ({ id: item.id }))

        arr.shift()
        assert.equal(source.length, 1)
        assert.equal(source[0].id, 2)
        assert.equal(arr.length, 1)
        assert.equal(arr[0].id, 2)
    })

    test('unshift adds item at beginning of source via reverseTransform', () => {
        const source = [{ id: 2, name: 'Bob' }]

        const arr = createMappedArray(
            source,
            (item) => ({ label: item.name }),
            {},
            (result) => ({ name: result.label })
        )

        const unshifted = { label: 'Alice' }
        arr.unshift(unshifted)

        assert.equal(source.length, 2)
        assert.equal(source[0].name, 'Alice')
        assert.equal(arr[0].label, 'Alice')
        assert.notStrictEqual(arr[0], unshifted)
    })

    test('passes unshift operation context to reverseTransform', () => {
        const source = [{ id: 2, name: 'Bob' }]

        let receivedContext = null

        const arr = createMappedArray(
            source,
            (item) => ({ label: item.name }),
            {},
            (result, context) => {
                receivedContext = context
                return { name: result.label }
            }
        )

        arr.unshift({ label: 'Alice' })

        assert.equal(receivedContext.operation, 'unshift')
    })

    test('splice removes and inserts items in source via reverseTransform', () => {
        const source = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }]
        const arr = createMappedArray(
            source,
            (item) => ({ label: item.name }),
            {},
            (result) => ({ name: result.label })
        )

        const inserted = { label: 'Dave' }
        arr.splice(1, 1, inserted)
        assert.equal(source.length, 3)
        assert.equal(source[1].name, 'Dave')
        assert.equal(arr[1].label, 'Dave')
        assert.notStrictEqual(arr[1], inserted)
    })

    test('passes splice operation context with metadata to reverseTransform', () => {
        const source = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }, { id: 3, name: 'Carol' }]
        let receivedContext = null

        const arr = createMappedArray(
            source,
            (item) => ({ label: item.name }),
            {},
            (result, context) => {
                receivedContext = context
                return { name: result.label }
            }
        )

        arr.splice(1, 1, { label: 'Dave' })

        assert.equal(receivedContext.operation, 'splice')
        assert.equal(receivedContext.start, 1)
        assert.equal(receivedContext.deleteCount, 1)
        assert.equal(receivedContext.insertCount, 1)
    })
})