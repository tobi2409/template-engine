import TemplateEngine from '../../src/template-engine.js'
import MappedArray from '../../src/mapped-array.js'

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
    persons: [{
        id: 1,
        name: 'Max Mustermann',
        wage: 10,
        birthyear: 1990,
        children: []
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
        return MappedArray.transformArray(
            persons,
            (person) => ({
                id: person.id,
                name: person.name,
                wage: `${person.wage} USD`,
                age: new Date().getFullYear() - person.birthyear,
                children: [],
                layerDecoration: '»'.repeat(layer),
                expanded: false,
                childrenLoaded: false,
                expand(_, viewItem) {
                    if (!viewItem.childrenLoaded) {
                        viewModel.loadServerData(viewItem)
                        viewItem.childrenLoaded = true
                    }

                    console.log(viewItem)
                    viewItem.expanded = !viewItem.expanded
                }
            }),
            (personView) => ({
                id: personView.id,
                name: personView.name,
                wage: personView.wage.slice(0, -4),
                birthyear: new Date().getFullYear() - personView.age,
                children: personView.children.map(viewModelChild => this.reversePersonViewModelItem(viewModelChild))
            })
        )
    },

    get beautifiedPersons() {
        return this.recursiveBeautifiedPersons(model.persons)
    },

    loadServerData(parentElement = null) {
        const serverParent = parentElement ? findById(fakeServerData, parentElement.id) : fakeServerData
        
        const mappedChildren = this.recursiveBeautifiedPersons(serverParent?.children || serverParent, 1);
        (parentElement?.children || this.beautifiedPersons).push(... mappedChildren)
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

//viewModel.loadServerData()
/*viewModel.beautifiedPersons[0].name = 'Max Mustermann - Updated'
viewModel.beautifiedPersons[0].children.push({
    id: 2,
    name: 'Max Jr. - Updated',
    wage: '5 USD',
    age: 14,
    children: []
})*/

//viewModel.beautifiedPersons[0].name = 'Max Mustermann - Updated'

// Ensure getters are evaluated so returned view objects become reactive
void viewModel.beautifiedPersons
viewModel.beautifiedPersons[0].name = 'Max Mustermann - Updated'