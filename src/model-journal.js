import ReactivityFrame from './components/reactivity-helpers/reactivity-frame.js'

const ModelJournal = (function () {
    return {
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
                    console.log(journalizeChange(change.fullKey, change))
                },
                onDataPropertySet: ({ fullKey, newValue }) => {
                    console.log(journalizeChange(fullKey, { operation: 'set', value: newValue }))
                },
                onAccessorPropertySet: ({ fullKey, newValue }) => {
                    console.log(journalizeChange(fullKey, { operation: 'set', value: newValue }))
                }
            })

            return data
        }
    }
})()

export default ModelJournal
