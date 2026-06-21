import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { resolve, resolveEx, convertToFullKey, setByPath } from '../../../src/components/utils/resolver.js'

describe('resolve', () => {
    test('resolves a simple top-level key', () => {
        const data = { name: 'Alice' }
        assert.equal(resolve('name', data), 'Alice')
    })

    test('resolves a nested key', () => {
        const data = { user: { address: { city: 'Berlin' } } }
        assert.equal(resolve('user.address.city', data), 'Berlin')
    })

    test('returns undefined for missing key', () => {
        const data = { name: 'Alice' }
        assert.equal(resolve('age', data), undefined)
    })

    test('resolves param over data if param matches first segment', () => {
        const data = { theme: 'light' }
        const params = new Map([['theme', 'dark']])
        assert.equal(resolve('theme', data, params), 'dark')
    })

    test('resolves array index', () => {
        const data = { items: ['a', 'b', 'c'] }
        assert.equal(resolve('items.1', data), 'b')
    })
})

describe('convertToFullKey', () => {
    test('returns key unchanged if no context matches', () => {
        const result = convertToFullKey('name', new Map())
        assert.equal(result, 'name')
    })

    test('converts relative key using context stack', () => {
        const contextStack = new Map([
            ['person', { fullKey: 'persons', data: { __item_index__: 2 } }]
        ])
        const result = convertToFullKey('person.name', contextStack)
        assert.equal(result, 'persons.2.name')
    })

    test('converts key with single-segment context (no sub-key)', () => {
        const contextStack = new Map([
            ['person', { fullKey: 'persons', data: { __item_index__: 0 } }]
        ])
        const result = convertToFullKey('person', contextStack)
        assert.equal(result, 'persons.0')
    })
})

describe('resolveEx', () => {
    test('returns fullKey and value for simple key', () => {
        const data = { name: 'Alice' }
        const result = resolveEx('name', data)

        assert.equal(result.fullKey, 'name')
        assert.equal(result.value, 'Alice')
    })

    test('resolves fullKey with context stack', () => {
        const data = { persons: [{ name: 'Alice' }] }
        const contextStack = new Map([
            ['person', { fullKey: 'persons', data: { __item_index__: 0 } }]
        ])
        const result = resolveEx('person.name', data, contextStack)

        assert.equal(result.fullKey, 'persons.0.name')
        assert.equal(result.value, 'Alice')
    })
})

describe('setByPath', () => {
    test('sets a top-level property', () => {
        const data = { name: 'Alice' }
        setByPath('name', data, 'Bob')
        assert.equal(data.name, 'Bob')
    })

    test('sets a nested property', () => {
        const data = { user: { city: 'Berlin' } }
        setByPath('user.city', data, 'Hamburg')
        assert.equal(data.user.city, 'Hamburg')
    })

    test('throws when intermediate path does not exist', () => {
        const data = {}
        assert.throws(
            () => setByPath('user.city', data, 'Hamburg'),
            /path does not exist/
        )
    })
})
