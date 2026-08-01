import TemplateEngine from '../../src/template-engine.js'
import { createMappedArray } from '../../src/mapped-array.js'

function assertSelectorContains(selector, expectedText, step) {
    const node = document.querySelector(selector)

    if (!node || !node.textContent.includes(expectedText)) {
        throw new Error(`Demo update not rendered (${step}): expected "${expectedText}" in "${selector}"`)
    }
}

function assertSelectorNotContains(selector, unexpectedText, step) {
    const node = document.querySelector(selector)

    if (node && node.textContent.includes(unexpectedText)) {
        throw new Error(`Demo update not rendered (${step}): expected "${unexpectedText}" to be removed from "${selector}"`)
    }
}

const model = {
    firstName: 'Alex',
    lastName: 'Gonzales',
    wage: 800,
    rawPersonData: [{ id: 1, name: 'Test', birthyear: 1995 }, { id: 2, name: 'Demo', birthyear: 1990 }]
}

const viewModel = TemplateEngine.reactive({
    set firstName(value) {
        model.firstName = value
    },

    get firstName() {
        return model.firstName
    },

    set lastName(value) {
        model.lastName = value
    },

    get lastName() {
        return model.lastName
    },
    
    get fullName() {
        return `${this.firstName} ${this.lastName}`
    },

    set wage(value) {
        model.wage = value
    },

    get wage() {
        return model.wage
    },

    get showWage() {
        return this.wage > 600
    },

    get fullInfo() {
        return `${this.fullName} earns $${this.wage}`
    },

    get beautifiedPersonData() {
        return createMappedArray(
            model.rawPersonData,
            (p, index) => ({
                id: p.id,
                name: p.name,
                age: new Date().getFullYear() - p.birthyear,
                showEdit: false
            }),
            { name: 'name', age: 'birthyear' },
            (item) => ({
                id: item.id,
                name: item.name,
                birthyear: item.birthyear || (new Date().getFullYear() - item.age)
            })
        )
    },

    editPersonInfo: function(event) {
        const index = parseInt(event.target.parentElement.getAttribute('item-index'))
        const person = viewModel.beautifiedPersonData.find(p => p.id === index)
        person.showEdit = !person.showEdit
    },

    addPersonInfo: function() {
        const nextId = (model.rawPersonData.reduce((max, p) => Math.max(max, p.id), 0) || 0) + 1
        viewModel.beautifiedPersonData.push({
            id: nextId,
            name: `Person ${nextId}`,
            age: 30,
            showEdit: false
        })
    },

    logModels: function() {
        console.log('Model:', model)
        console.log('ViewModel:', viewModel)
    },

    runDemoUpdates: function() {
        viewModel.firstName = 'Emily'
        viewModel.wage = 200
        viewModel.beautifiedPersonData.push({ id: 3, name: 'Sample', birthyear: 1985 })
        viewModel.beautifiedPersonData[0].name = 'Test Updated'
        viewModel.beautifiedPersonData.splice(1, 1)

        assertSelectorContains('#first-name-row', 'Emily', 'update firstName')
        assertSelectorNotContains('#wage-block', 'earns $200', 'hide wage block')
        assertSelectorContains('#person-list li[item-index="3"]', 'Sample', 'push person')
        assertSelectorContains('#person-list li[item-index="1"]', 'Test Updated', 'rename first person')

        if (document.querySelector('#person-list li[item-index="2"]')) {
            throw new Error('Demo update not rendered (splice remove second person): expected #person-list li[item-index="2"] to be removed')
        }
    }
}, document.getElementById('app-template-use'), {
    'firstName': ['fullName'],
    'lastName': ['fullName'],
    'wage': ['showWage', 'fullInfo'],
    'fullName': ['fullInfo']
})