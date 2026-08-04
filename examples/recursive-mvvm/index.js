import TemplateEngine from '../../src/template-engine.js'
import MappedArray from '../../src/mapped-array.js'

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

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

viewModel.beautifiedPersons[0].name = 'Max Mustermann - Updated'
/*viewModel.beautifiedPersons.push({
    id: 2,
    name: 'Max Mustermann - Sibling',
    wage: '8 USD',
    age: 34,
    children: []
})
viewModel.beautifiedPersons[0].children.push({
    id: 3,
    name: 'Max Jr. - Updated',
    wage: '5 USD',
    age: 14,
    children: []
})*/