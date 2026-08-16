import TemplateEngine from '../../src/template-engine.js'
import ViewModelArray from '../../src/viewmodel-array.js'
import ModelSynchronization from '../../src/components/reactivity-helpers/model-synchronization.js'
import { fakeServerData } from './fake-server-data.js'
import { runDemoUpdates } from './demo-updates.js'

const model = {
    user: 'Joe Doe',
    persons: []
}

function clonePersonWithEmptyChildren(person) {
    return {
        id: person.id,
        name: person.name,
        wage: person.wage,
        birthyear: person.birthyear,
        address: {
            street: person.address?.street || '',
            city: person.address?.city || ''
        },
        children: []
    }
}

function findPersonById(persons, id) {
    for (const person of persons) {
        if (person.id === id) {
            return person
        }

        const nestedMatch = findPersonById(person.children || [], id)
        if (nestedMatch) {
            return nestedMatch
        }
    }

    return undefined
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
            children: ViewModelArray.markRecursive(personModelItem.children.map(child => this.transform(child))),
            expanded: false,
            childrenLoaded: false,
            expand(_, viewItem) {
                if (!viewItem.childrenLoaded) {
                    viewModel.loadServerData(viewItem)
                    viewItem.childrenLoaded = true
                }

                viewItem.expanded = !viewItem.expanded
            }
        }
    },

    reverseTransform(personViewModelItem, reversedViewModelProps = ['id', 'name', 'wage', 'age', 'street', 'city', 'children'], modelItem) {
        return {
            id: reversedViewModelProps.includes('id') ? personViewModelItem.id : undefined,
            name: reversedViewModelProps.includes('name') ? personViewModelItem.name : undefined,
            wage: reversedViewModelProps.includes('wage') ? personViewModelItem.wage.slice(0, -4) : undefined,
            birthyear: reversedViewModelProps.includes('age') ? new Date().getFullYear() - personViewModelItem.age : undefined,
            address: ['street', 'city'].some(prop => reversedViewModelProps.includes(prop)) ? {
                street: reversedViewModelProps.includes('street') ? personViewModelItem.address?.street || '' : modelItem?.address?.street || '',
                city: reversedViewModelProps.includes('city') ? personViewModelItem.address?.city || '' : modelItem?.address?.city || ''
            } : undefined,
            children: reversedViewModelProps.includes('children') ? personViewModelItem.children.map(viewModelChild => this.reverseTransform(viewModelChild)) : undefined
        }
    },

    get persons() {
        // Singleton is provided by mappedViewModelArrayCache
        return ViewModelArray.get(
            model.persons,
            (personModelItem) => (this.transform(personModelItem)),
            (personViewModelItem, prop, modelItem) => (this.reverseTransform(personViewModelItem, prop, modelItem))
        )
    },

    loadServerData(viewItem) {
        const serverItem = findPersonById(fakeServerData, viewItem.id)
        const nextServerChildren = (serverItem?.children || []).map(clonePersonWithEmptyChildren)

        ModelSynchronization.withoutModelSynchronization(() => {
            const modelItem = findPersonById(model.persons, viewItem.id)

            if (!modelItem) {
                return
            }

            modelItem.children.splice(0, modelItem.children.length, ...nextServerChildren)

            viewItem.children.splice(
                0,
                viewItem.children.length,
                ...modelItem.children.map(child => viewModel.transform(child))
            )
        })
    },

    demoUpdates() {
        runDemoUpdates(viewModel, (viewItem) => viewModel.loadServerData(viewItem))
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

ModelSynchronization.withoutModelSynchronization(() => {
    model.persons.splice(0, model.persons.length, ...fakeServerData.map(clonePersonWithEmptyChildren))

    viewModel.persons.splice(
        0,
        viewModel.persons.length,
        ...model.persons.map((person) => viewModel.transform(person))
    )
})