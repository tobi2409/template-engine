import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { findMatchingDependencies } from '../../../src/components/utils/notifier.js'

const deps = {
    'firstName': ['fullName'],
    'lastName': ['fullName'],
    'wage': ['showWage', 'fullInfo'],
    'fullName': ['fullInfo'],
    'model.rawPersonData': ['beautifiedPersonData']
}

describe('findMatchingDependencies', () => {
    test('returns direct dependency match', () => {
        const result = findMatchingDependencies('firstName', deps)
        assert.ok(result.includes('fullName'))
    })

    test('returns multiple direct matches', () => {
        const result = findMatchingDependencies('wage', deps)
        assert.ok(result.includes('showWage'))
        assert.ok(result.includes('fullInfo'))
    })

    test('resolves transitive dependencies (A → B → C)', () => {
        // firstName → fullName → fullInfo
        const result = findMatchingDependencies('firstName', deps)
        assert.ok(result.includes('fullName'))
        assert.ok(result.includes('fullInfo'))
    })

    test('resolves subpath match with suffix appended', () => {
        // 'model.rawPersonData.0.name' should match 'model.rawPersonData'
        // and produce 'beautifiedPersonData.0.name'
        const result = findMatchingDependencies('model.rawPersonData.0.name', deps)
        assert.ok(result.includes('beautifiedPersonData.0.name'))
    })

    test('returns empty array when no dependencies match', () => {
        const result = findMatchingDependencies('unknownKey', deps)
        assert.deepEqual(result, [])
    })

    test('returns no duplicates', () => {
        // wage → fullInfo (direct) and wage → showWage (direct), no duplicates
        const result = findMatchingDependencies('wage', deps)
        const unique = [...new Set(result)]
        assert.deepEqual(result, unique)
    })

    test('prevents infinite loop on circular dependencies', () => {
        const circularDeps = {
            'a': ['b'],
            'b': ['a']
        }
        assert.doesNotThrow(() => findMatchingDependencies('a', circularDeps))
    })

    test('returns empty array for empty dependencies', () => {
        const result = findMatchingDependencies('firstName', {})
        assert.deepEqual(result, [])
    })
})
