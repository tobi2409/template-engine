import TemplateEngine from '../../src/template-engine.js'

const model = TemplateEngine.reactive({
    items: [
        { id: 1, name: 'Alpha', value: 10 },
        { id: 2, name: 'Beta', value: 20 }
    ],

    lastAddedItemId: 2,
    lastInsertedItemId: 0,

    addItem() {
        const nextId = model.lastAddedItemId + 1
        model.items.push({ id: nextId, name: `Item ${nextId}`, value: nextId * 5 })
        model.lastAddedItemId = nextId
    },

    insertItem() {
        const nextId = model.lastInsertedItemId + 1
        model.items.splice(nextId, 0, { id: nextId, name: `Inserted ${nextId}`, value: nextId * 3 })
        model.lastInsertedItemId = nextId
    }
}, document.getElementById('page-use'))