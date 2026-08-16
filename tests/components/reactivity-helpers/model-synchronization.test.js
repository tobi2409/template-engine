import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import ModelSynchronization from '../../../src/components/reactivity-helpers/model-synchronization.js'

describe('ModelSynchronization', () => {
    test('updates model item with defined reverseTransform fields', () => {
        const modelItem = { id: 1, name: 'Alice', age: 20 }
        const viewModelItem = { id: 1, name: 'Bob', age: undefined }

        const viewModelItemConfig = {
            viewModelItem,
            modelItem,
            reverseTransform: (item) => ({
                name: item.name,
                age: item.age
            })
        }

        ModelSynchronization.updateModelItemByViewModelItem(viewModelItemConfig, ['name'])

        assert.equal(modelItem.name, 'Bob')
        assert.equal(modelItem.age, 20)
    })

    test('suppresses model item update inside withoutModelSynchronization scope', async () => {
        const modelItem = { id: 1, name: 'Alice' }
        const viewModelItem = { id: 1, name: 'Bob' }

        const viewModelItemConfig = {
            viewModelItem,
            modelItem,
            reverseTransform: (item) => ({ name: item.name })
        }

        await ModelSynchronization.withoutModelSynchronization(() => {
            ModelSynchronization.updateModelItemByViewModelItem(viewModelItemConfig, ['name'])
        })

        assert.equal(modelItem.name, 'Alice')
    })

    test('suppresses array operations inside withoutModelSynchronization scope', async () => {
        const modelArray = [{ id: 1, name: 'Alice' }]
        const viewModelArrayConfig = {
            viewModelArray: [{ label: 'Alice' }],
            modelArray,
            reverseTransform: (item) => ({ name: item.label })
        }

        await ModelSynchronization.withoutModelSynchronization(() => {
            ModelSynchronization.updateModelArrayByViewModelArrayOperation(viewModelArrayConfig, 'push', {
                action: 'push',
                fullKey: 'persons',
                items: [{ label: 'Bob' }]
            })
        })

        assert.equal(modelArray.length, 1)
        assert.equal(modelArray[0].name, 'Alice')
    })

    test('keeps synchronization disabled for nested scopes until outer scope ends', async () => {
        assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), false)

        await ModelSynchronization.withoutModelSynchronization(async () => {
            assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), true)

            await ModelSynchronization.withoutModelSynchronization(async () => {
                assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), true)
            })

            assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), true)
        })

        assert.equal(ModelSynchronization.isModelSynchronizationDisabled(), false)
    })
})
