import TemplateEngine from '../../src/template-engine.js'
import ViewModelArray from '../../src/viewmodel-array.js'
import ModelViewModelExpander from '../../src/model-viewmodel-expander.js'
import ModelJournal from '../../src/model-journal.js'
import { getPersons } from './fake-server-data.js'

// durch Journal kann man die Änderungen im Model nachvollziehen und speichern
const model = ModelJournal.reactive({
    user: 'Joe Doe',
    persons: []
})

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
            children: this.getViewModelArray(personModelItem.children),
            expanded: false,
            childrenLoaded: false,
            expand: ModelViewModelExpander.createExpandHandler((viewModelParent) => viewModel.loadServerData(viewModelParent, personModelItem))
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

    // TODO: markRecursive
    getViewModelArray(modelArray) {
        return ViewModelArray.get(
            modelArray,
            (personModelItem) => this.transform(personModelItem),
            (personViewModelItem) => this.reverseTransform(personViewModelItem),
            { age: 'birthyear' },
            { get length() { console.log(modelArray); return modelArray[0] },
              newPerson: { name: '' },
              addNewPerson: (_, context) => {
                TemplateEngine.withoutModelSynchronization(() => {
                    // preparedViewItem ist nur nötig, wenn sich im View-Item komplexere State-Strukturen befinden
                    // ansonsten kann auch direkt das View-Item erstellt werden
                    const preparedPersonViewItem = {
                        id: `new-${Math.random().toString(36).substring(2, 9)}`,
                        name: context.children.state.newPerson.name,
                        wage: '10 USD',
                        age: 30,
                        address: { street: '', city: '' },
                        children: []
                    }

                    const { modelItem, viewModelItem } = ViewModelArray.prepareItem(
                        context.children.data,
                        preparedPersonViewItem
                    )

                    modelArray.push(modelItem)
                    context.children.data.push(viewModelItem)
                })

                context.children.state.newPerson.name = ''
              }
            }
        )
    },

    get persons() {
        // Singleton is provided by mappedViewModelArrayCache
        return this.getViewModelArray(model.persons)
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