import TemplateEngine from '../../src/template-engine.js'
import { createMappedArray } from '../../src/mapped-array.js'

const model = {
    user: 'Joe Doe',
    persons: [{
        id: 1,
        name: 'Max Mustermann',
        wage: 10,
        birthyear: 1990,
        children: [{
            id: 2,
            name: 'Max Jr.',
            wage: 5,
            birthyear: 2010,
            children: [{
                id: 3,
                name: 'Max III',
                wage: 2,
                birthyear: 2020,
                children: []
            }, {
                id: 4,
                name: 'Maxi III',
                wage: 1,
                birthyear: 2022,
                children: []
            }]
        }]
    }, {
        id: 5,
        name: 'Erika Mustermann',
        wage: 12,
        birthyear: 1992,
        children: [{
            id: 6,
            name: 'Erika Jr.',
            wage: 6,
            birthyear: 2012,
            children: []
        }, {
            id: 7,
            name: 'Erik',
            wage: 3,
            birthyear: 2014,
            children: []
        }]
    }]
}

const viewModel = TemplateEngine.reactive({
    get user() {
        return model.user
    },

    set user(value) {
        model.user = value
    },

    reversePersonViewModelItem(personViewModelItem) {
        return {
            id: personViewModelItem.id,
            name: personViewModelItem.name,
            wage: personViewModelItem.wage.slice(0, -4),
            birthyear: new Date().getFullYear() - personViewModelItem.age,
            children: personViewModelItem.children.map(viewModelChild => this.reversePersonViewModelItem(viewModelChild))
        }
    },

    recursiveBeautifiedPersons(persons, layer = 1) {
        return createMappedArray(
            persons,
            (person) => ({
                id: person.id,
                name: person.name,
                wage: `${person.wage} USD`,
                age: new Date().getFullYear() - person.birthyear,
                children: this.recursiveBeautifiedPersons(person.children, layer + 1),
                layerDecoration: '»'.repeat(layer),
            }),
            { name: 'name', wage: 'wage', age: 'birthyear' },
            (personViewModelItem) => (this.reversePersonViewModelItem(personViewModelItem))
        )
    },

    get beautifiedPersons() {
        return this.recursiveBeautifiedPersons(model.persons)
    },

    newDemoChild_MaxJr() {
        const maxJr = viewModel.beautifiedPersons[0].children[0]

        const newChild = {
            id: 9,
            name: `Max III - New`,
            wage: '10 USD',
            age: 2,
            children: [{
                id: 10,
                name: `Max IV - New`,
                wage: '5 USD',
                age: 1,
                children: []
            }]
        }

        maxJr.children.push(newChild)
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

// Ensure getters are evaluated so returned view objects become reactive
void viewModel.beautifiedPersons