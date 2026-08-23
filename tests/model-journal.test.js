import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import ModelJournal from '../src/model-journal.js'

describe('ModelJournal.reactive', () => {
    test('journals nested item changes and instruments inserted array items', () => {
        const entries = []
        const originalConsoleLog = console.log
        console.log = (entry) => entries.push(entry)

        try {
            const data = ModelJournal.reactive({
                persons: [{ personId: 'a', profile: { name: 'Alice' } }]
            }, 'personId')

            data.persons[0].profile.name = 'Alicia'
            data.persons.push({ personId: 'b', profile: { name: 'Bob' } })
            data.persons[1].profile.name = 'Bobby'
        } finally {
            console.log = originalConsoleLog
        }

        assert.deepEqual(entries, [
            {
                fullKey: 'persons.a.profile.name',
                change: { operation: 'set', value: 'Alicia' }
            },
            {
                fullKey: 'persons',
                change: {
                    fullKey: 'persons',
                    action: 'push',
                    items: [{ personId: 'b', profile: { name: 'Bobby' } }]
                }
            },
            {
                fullKey: 'persons.b.profile.name',
                change: { operation: 'set', value: 'Bobby' }
            }
        ])
    })
})