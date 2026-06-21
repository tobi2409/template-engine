import { test, describe, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { nodeHoldersByKeys } from '../../../src/components/utils/node-holders.js'

// Clear all entries before each test to avoid cross-test interference (module-level singleton)
beforeEach(() => {
    nodeHoldersByKeys.clear()
})

describe('nodeHoldersByKeys.getByKey', () => {
    beforeEach(() => {
        nodeHoldersByKeys.appendToKey('items', { action: 'updateGet', node: { id: 'items-node' } })
        nodeHoldersByKeys.appendToKey('persons.0.name', { action: 'updateGet', node: { id: 'person-name-node' } })
    })

    test('returns undefined for non-existing key', () => {
        const result = nodeHoldersByKeys.getByKey('unknown')
        assert.equal(result, undefined)
    })

    test('returns existing top-level map from setup', () => {
        const result = nodeHoldersByKeys.getByKey('items')
        assert.ok(result instanceof Map)
        assert.equal(result.get('holders')[0].action, 'updateGet')
        assert.equal(result.get('holders')[0].node.id, 'items-node')
    })

    test('traverses nested key path from setup', () => {
        const result = nodeHoldersByKeys.getByKey('persons.0.name')
        assert.ok(result instanceof Map)
        assert.equal(result.get('holders')[0].action, 'updateGet')
        assert.equal(result.get('holders')[0].node.id, 'person-name-node')
    })

    test('returns same map for same key', () => {
        const a = nodeHoldersByKeys.getByKey('items')
        const b = nodeHoldersByKeys.getByKey('items')
        assert.strictEqual(a, b)
    })

    test('returns undefined for non-existing nested key without create', () => {
        const result = nodeHoldersByKeys.getByKey('persons.0.name')
        assert.ok(result instanceof Map)

        const missing = nodeHoldersByKeys.getByKey('persons.1.name')
        assert.equal(missing, undefined)
    })

    test('creates missing nested map when create=true', () => {
        const result = nodeHoldersByKeys.getByKey('new.path.value', true)
        assert.ok(result instanceof Map)
    })

    test('returns existing map with holders intact when create=true on existing key', () => {
        const result = nodeHoldersByKeys.getByKey('items', true)
        assert.ok(result instanceof Map)
    })
})

describe('nodeHoldersByKeys.appendToKey', () => {
    test('creates holders array and appends nodeHolder', () => {
        const node = {}
        nodeHoldersByKeys.appendToKey('name', { action: 'updateGet', node })
        const ref = nodeHoldersByKeys.getByKey('name')
        assert.ok(ref.has('holders'))
        assert.equal(ref.get('holders').length, 1)
        assert.equal(ref.get('holders')[0].action, 'updateGet')
        assert.strictEqual(ref.get('holders')[0].node, node)
    })

    test('appends multiple different holders', () => {
        const node1 = {}
        const node2 = {}
        nodeHoldersByKeys.appendToKey('title', { action: 'updateGet', node: node1 })
        nodeHoldersByKeys.appendToKey('title', { action: 'updateDefault', node: node2 })
        const holders = nodeHoldersByKeys.getByKey('title').get('holders')
        assert.equal(holders.length, 2)
        assert.equal(holders[0].action, 'updateGet')
        assert.equal(holders[1].action, 'updateDefault')
        assert.strictEqual(holders[0].node, node1)
        assert.strictEqual(holders[1].node, node2)
    })

    test('does not add duplicate node reference', () => {
        const node = {}
        nodeHoldersByKeys.appendToKey('label', { action: 'updateGet', node })
        nodeHoldersByKeys.appendToKey('label', { action: 'updateGet', node })
        const holders = nodeHoldersByKeys.getByKey('label').get('holders')
        assert.equal(holders.length, 1)
        assert.strictEqual(holders[0].node, node)
    })

    test('works with nested key path', () => {
        const node = {}
        nodeHoldersByKeys.appendToKey('persons.0.name', { action: 'updateGet', node })
        const ref = nodeHoldersByKeys.getByKey('persons.0.name')
        assert.equal(ref.get('holders').length, 1)
        assert.equal(ref.get('holders')[0].action, 'updateGet')
        assert.strictEqual(ref.get('holders')[0].node, node)
    })

})
