import ReactivityFrame from './components/reactivity-helpers/reactivity-frame.js'
import JournalControl from './components/reactivity-helpers/journal-control.js'

const ModelJournal = (function () {
    return {
        withoutJournaling(callback) {
            return JournalControl.withoutJournaling(callback)
        },

        isJournalingDisabled() {
            return JournalControl.isJournalingDisabled()
        },

        reactive(data, identifierProperty = 'id') {
            if (!data || typeof data !== 'object') {
                throw new TypeError(`[ModelJournal] reactive expected "data" to be an object, got ${data === null ? 'null' : typeof data}`)
            }

            function journalizeChange(fullKey, change) {
                return { fullKey, change }
            }

            ReactivityFrame.makeReactive(data, '', {
                marker: '__journal_reactive__',
                getArrayItemKey: (item) => item[identifierProperty],
                onArrayItemsChange: (change) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        console.log(journalizeChange(change.fullKey, change))
                    }
                },
                onDataPropertySet: ({ fullKey, newValue }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        console.log(journalizeChange(fullKey, { operation: 'set', value: newValue }))
                    }
                },
                onAccessorPropertySet: ({ fullKey, newValue }) => {
                    if (!JournalControl.isJournalingDisabled()) {
                        console.log(journalizeChange(fullKey, { operation: 'set', value: newValue }))
                    }
                }
            })

            return data
        }
    }
})()

export default ModelJournal
