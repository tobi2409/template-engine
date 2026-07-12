import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import KeyResolver from '../../../src/components/utils/key-resolver.js'
import UuidItemMap from '../../../src/components/utils/uuid-item-map.js'

const { resolve, resolveEx, convertToFullKey, setByPath } = KeyResolver
const { ensureUuidForItem, getUuidByItem } = UuidItemMap

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
        const item = { name: 'Alice' }
        ensureUuidForItem(item)
        const uuid = getUuidByItem(item)

        const contextStack = new Map([
            ['person', { fullKey: 'persons', data: item }]
        ])
        const result = convertToFullKey('person.name', contextStack)
        assert.equal(result, `persons.${uuid}.name`)
    })

    test('converts key with single-segment context (no sub-key)', () => {
        const item = { name: 'Bob' }
        ensureUuidForItem(item)
        const uuid = getUuidByItem(item)

        const contextStack = new Map([
            ['person', { fullKey: 'persons', data: item }]
        ])
        const result = convertToFullKey('person', contextStack)
        assert.equal(result, `persons.${uuid}`)
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
        const item = { name: 'Alice' }
        const data = { persons: [item] }
        ensureUuidForItem(item)
        const uuid = getUuidByItem(item)

        const contextStack = new Map([
            ['person', { fullKey: 'persons', data: item }]
        ])
        const result = resolveEx('person.name', data, contextStack)

        assert.equal(result.fullKey, `persons.${uuid}.name`)
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
