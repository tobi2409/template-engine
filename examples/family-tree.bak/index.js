import TemplateEngine from '../../src/template-engine.js'
import { createMappedArray } from '../../src/mapped-array.js'

const fakeServerData = [{
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
            children: [{
                id: 8,
                name: 'Max IV',
                wage: 1,
                birthyear: 2024,
                children: []
            }]
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

function findById(persons, id) {
    for (const person of persons || []) {
        if (person.id === id) {
            return person
        }

        const nested = findById(person.children, id)

        if (nested) {
            return nested
        }
    }

    return null
}

const model = {
    user: 'Joe Doe',
    persons: []
}

const viewModel = TemplateEngine.reactive({
    get user() {
        return model.user
    },

    set user(value) {
        model.user = value
    },

    reversePersonViewTree(personViewItem) {
        return {
            id: personViewItem.id,
            name: personViewItem.name,
            wage: personViewItem.wage.slice(0, -4),
            birthyear: new Date().getFullYear() - personViewItem.age,
            children: (personViewItem.children || []).map(viewModelChild => this.reversePersonViewTree(viewModelChild))
        }
    },

    reversePersonViewItem(personViewItem, context = {}) {
        const shouldMapChildren = context.operation === 'push'
            || context.operation === 'unshift'
            || (context.operation === 'splice' && (context.insertCount || 0) > 0)

        return {
            id: personViewItem.id,
            name: personViewItem.name,
            wage: personViewItem.wage.slice(0, -4),
            birthyear: new Date().getFullYear() - personViewItem.age,
            children: shouldMapChildren
                ? (personViewItem.children || []).map(viewModelChild => this.reversePersonViewTree(viewModelChild))
                : []
        }
    },

    mapPersonsToViewPersons(persons, layer = 1, loadedChildren = true) {
        const mappedArray = createMappedArray(
            persons,
            (person) => ({
                id: person.id,
                name: person.name,
                wage: `${person.wage} USD`,
                age: new Date().getFullYear() - person.birthyear,
                children: [],/*loadedChildren ?
                    this.mapPersonsToViewPersons(person.children, layer + 1) :
                    [],*/
                layerDecoration: '»'.repeat(layer),
                expanded: false,
                expand: function(_, viewItem) {
                    viewModel.loadServerData(viewItem)
                    //void viewItem.children
                    console.log(viewItem)
                    viewItem.expanded = !viewItem.expanded
                }
            }),
            { name: 'name', wage: 'wage', age: 'birthyear' },
            (personViewItem, context) => (this.reversePersonViewItem(personViewItem, context))
        )

        return mappedArray
    },

    loadServerData(parentElement = null) {
        const serverParent = parentElement ? findById(fakeServerData, parentElement.id) : fakeServerData
        
        const mappedChildren = this.mapPersonsToViewPersons(serverParent?.children || serverParent, 1, false);
        (parentElement?.children || this.persons).push(... mappedChildren)
    },

    get persons() {
        return this.mapPersonsToViewPersons(model.persons)
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

viewModel.loadServerData()

// Ensure getters are evaluated so returned view objects become reactive
//void viewModel.persons_viewArray