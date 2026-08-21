import TemplateEngine from '../../../src/template-engine.js'
import ViewModelArray from '../../../src/viewmodel-array.js'
import ModelViewModelExpander from '../../../src/model-viewmodel-expander.js'
import { getPersons } from './fake-server-data.js'

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
            children: ViewModelArray.get(
                personModelItem.children,
                (childModelItem) => this.transform(childModelItem),
                (childViewModelItem) => this.reverseTransform(childViewModelItem),
                { age: 'birthyear' },
                { newPerson: { name: 'Neuer Name ...' } },
                true
            ), /*{ data: [], state: { newPerson: { name: 'Neuer Name ...' } } },*/
            expanded: false,
            childrenLoaded: false,
            expand: ModelViewModelExpander.createExpandHandler((viewModelParent) => viewModel.loadServerData(viewModelParent, personModelItem)),
            cacheName: (_, viewItem) => {
                console.log(viewItem.id, viewItem.name) // TODO: cache id, name for later use in saveToDatabase
            }
        }
    },

    reverseTransform(personViewModelItem, modelItem) {
        return {
            id: () => personViewModelItem.id,
            name: () => personViewModelItem.name,
            wage: () => personViewModelItem.wage.slice(0, -4), // TODO: Input validation, Convert to number
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
            (personViewModelItem) => (this.reverseTransform(personViewModelItem)),
            { age: 'birthyear' },
            { newPerson: { name: 'Neuer Name ...' } }
        )
    },

    loadServerData(viewModelParent = undefined, modelParent = undefined) {
        TemplateEngine.withoutModelSynchronization(() => {
            const nextPersons = getPersons(viewModelParent?.id)

            const { viewModelArray, modelArray } = ModelViewModelExpander.getExpandTargets(
                viewModelParent,
                modelParent,
                viewModel.persons,
                model.persons
            )

            ModelViewModelExpander.expandNextData(
                nextPersons,
                viewModelArray?.data,
                modelArray,
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