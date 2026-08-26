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

    test('suppresses journal entries inside withoutJournaling', () => {
        const entries = []
        const originalConsoleLog = console.log
        console.log = (entry) => entries.push(entry)

        try {
            const data = ModelJournal.reactive({ persons: [] })

            const result = ModelJournal.withoutJournaling(() => {
                assert.equal(ModelJournal.isJournalingDisabled(), true)
                data.persons.push({ id: 'a', name: 'Alice' })
                data.persons[0].name = 'Alicia'
                return data.persons
            })

            assert.strictEqual(result, data.persons)
            assert.equal(ModelJournal.isJournalingDisabled(), false)
            data.persons[0].name = 'Ally'
        } finally {
            console.log = originalConsoleLog
        }

        assert.deepEqual(entries, [{
            fullKey: 'persons.a.name',
            change: { operation: 'set', value: 'Ally' }
        }])
    })

    test('journals changes to items inserted into nested arrays', () => {
        const entries = []
        const originalConsoleLog = console.log
        console.log = (entry) => entries.push(entry)

        try {
            const data = ModelJournal.reactive({ persons: [] })
            data.persons.push({ id: 'a', children: [] })
            data.persons[0].children.push({ id: 'b', name: 'Bob', children: [] })
            data.persons[0].children[0].name = 'Bobby'
        } finally {
            console.log = originalConsoleLog
        }

        assert.deepEqual(entries.at(-1), {
            fullKey: 'persons.a.children.b.name',
            change: { operation: 'set', value: 'Bobby' }
        })
    })
})