import TemplateEngine from '../../src/template-engine.js'
import { createMappedArray } from '../../src/mapped-array.js'

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

    checkRendered: function() {
        const msgs = []
        msgs.push(document.body.textContent.includes('Sample') ? 'Sample present' : 'Sample missing')
        msgs.push(document.body.textContent.includes('Test Updated') ? 'Test Updated present' : 'Test Updated missing')
        const ok = msgs.every(m => /present/.test(m))
        const msg = (ok ? 'All checks passed:\n' : 'Some checks failed:\n') + msgs.join('\n')
        console.log(msg)
        alert(msg)
    }
}, document.getElementById('app-template-use'), {
    'firstName': ['fullName'],
    'lastName': ['fullName'],
    'wage': ['showWage', 'fullInfo'],
    'fullName': ['fullInfo']
})

viewModel.firstName = 'Emily'
viewModel.wage = 200
viewModel.beautifiedPersonData.push({ id: 3, name: 'Sample', birthyear: 1985 })
viewModel.beautifiedPersonData[0].name = 'Test Updated'
viewModel.beautifiedPersonData.splice(1, 1)
        
console.log(viewModel.beautifiedPersonData)
console.log(model.rawPersonData)
