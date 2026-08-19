import TemplateEngine from '../../../src/template-engine.js'
import ViewModelArray from '../../../src/viewmodel-array.js'
import DataExpander from '../../../src/data-expander.js'
import { getPersons } from './fake-server-data.js'

const model = {
    user: 'Joe Doe',
    persons: []
}

const modelPersonsById = DataExpander.createModelIndex()

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
            expand: DataExpander.createExpandHandler((viewModelParent) => viewModel.loadServerData(viewModelParent))
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

    loadServerData(viewModelParent = undefined) {
        TemplateEngine.withoutModelSynchronization(() => {
            const nextPersons = getPersons(viewModelParent?.id)

            const { modelArray, viewModelArray } = DataExpander.getExpandTargets(
                viewModelParent,
                model.persons,
                viewModel.persons,
                modelPersonsById
            )

            DataExpander.expandNextData(
                nextPersons,
                modelArray,
                viewModelArray,
                modelPersonsById,
                (personModelItem) => this.transform(personModelItem)
            )
        })
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

viewModel.loadServerData()