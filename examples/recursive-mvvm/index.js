import TemplateEngine from '../../src/template-engine.js'
import { createMappedArray } from '../../src/mapped-array.js'

const model = {
    user: 'Joe Doe',
    persons: [{
        id: 1,
        name: 'Max Mustermann',
        wage: 10,
        birthyear: 1990,
        childs: [{
            id: 2,
            name: 'Max Jr.',
            wage: 5,
            birthyear: 2010,
            childs: [{
                id: 3,
                name: 'Max III',
                wage: 2,
                birthyear: 2020,
                childs: []
            }, {
                id: 4,
                name: 'Maxi III',
                wage: 1,
                birthyear: 2022,
                childs: []
            }]
        }]
    }, {
        id: 5,
        name: 'Erika Mustermann',
        wage: 12,
        birthyear: 1992,
        childs: [{
            id: 6,
            name: 'Erika Jr.',
            wage: 6,
            birthyear: 2012,
            childs: []
        }, {
            id: 7,
            name: 'Erik',
            wage: 3,
            birthyear: 2014,
            childs: []
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

    recursiveBeautifiedPersons(persons, layer = 1) {
        return createMappedArray(
            persons,
            (person) => ({
                id: person.id,
                name: person.name,
                wage: `${person.wage} USD`,
                age: new Date().getFullYear() - person.birthyear,
                childs: this.recursiveBeautifiedPersons(person.childs, layer + 1),
                layerDecoration: '»'.repeat(layer),
            }),
            { name: 'name', wage: 'wage', age: 'birthyear' },
            (personViewModelItem, personItem) => ({
                id: personViewModelItem.id,
                name: personViewModelItem.name,
                wage: personViewModelItem.wage.slice(0, -4),
                birthyear: new Date().getFullYear() - personViewModelItem.age
            })
        )
    },

    get beautifiedPersons() {
        return this.recursiveBeautifiedPersons(model.persons)
    },

    newDemoChild_MaxJr() {
        const maxJr = viewModel.beautifiedPersons[0].childs[0]

        maxJr.childs.push({
            id: 10,
            name: `Max III - New`,
            wage: '10 USD',
            age: 2,
            childs: []
        })

        console.log(maxJr.childs)
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

// Ensure getters are evaluated so returned view objects become reactive
void viewModel.beautifiedPersons