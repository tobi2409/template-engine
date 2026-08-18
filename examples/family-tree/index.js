import TemplateEngine from '../../src/template-engine.js'
import ViewModelArray from '../../src/viewmodel-array.js'
import { fakeServerData } from './fake-server-data.js'
import { runDemoUpdates } from './demo-updates.js'

const model = {
    user: 'Joe Doe',
    persons: []
}

// in real world, this would be a SELECT query to the server, returning a person with children
function clonePersonDeep(person) {
    return {
        id: person.id,
        name: person.name,
        wage: person.wage,
        birthyear: person.birthyear,
        address: {
            street: person.address?.street || '',
            city: person.address?.city || ''
        },
        children: (person.children || []).map(clonePersonDeep)
    }
}

const viewModel = TemplateEngine.reactive({
    get user() {
        return model.user
    },

    set user(value) {
        model.user = value
    },

    transform(personModelItem) {
        return {
            id: personModelItem.id,
            name: personModelItem.name,
            wage: `${personModelItem.wage} USD`,
            age: new Date().getFullYear() - personModelItem.birthyear,
            address: {
                street: personModelItem.address?.street || '',
                city: personModelItem.address?.city || ''
            },
            children: ViewModelArray.markRecursive(personModelItem.children.map(child => this.transform(child)))
        }
    },

    reverseTransform(personViewModelItem, modelItem) {
        return {
            id: () => personViewModelItem.id,
            name: () => personViewModelItem.name,
            wage: () => personViewModelItem.wage.slice(0, -4),
            birthyear: () => new Date().getFullYear() - personViewModelItem.age,
            address: () => ({
                street: () => personViewModelItem.address?.street,
                city: () => personViewModelItem.address?.city,
            }),
            children: () => personViewModelItem.children.map(viewModelChild => this.reverseTransform(viewModelChild))
        }
    },

    get persons() {
        // Singleton is provided by mappedViewModelArrayCache
        return ViewModelArray.get(
            model.persons,
            (personModelItem) => (this.transform(personModelItem)),
            (personViewModelItem, prop, modelItem) => (this.reverseTransform(personViewModelItem, prop, modelItem)),
            { age: 'birthyear' }
        )
    },

    demoUpdates() { 
        runDemoUpdates(viewModel, model)
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

TemplateEngine.withoutModelSynchronization(() => {
    model.persons.splice(0, model.persons.length, ...fakeServerData.map(clonePersonDeep))

    viewModel.persons.splice(
        0,
        viewModel.persons.length,
        ...model.persons.map((person) => viewModel.transform(person))
    )
})