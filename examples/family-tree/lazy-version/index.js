import TemplateEngine from '../../../src/template-engine.js'
import ViewModelArray from '../../../src/viewmodel-array.js'
import { fakeServerData } from './fake-server-data.js'

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
            children: ViewModelArray.markRecursive(personModelItem.children.map(child => this.transform(child))),
            expanded: false,
            childrenLoaded: false,
            expand(_, viewModelParent) {
                if (!viewModelParent.childrenLoaded) {
                    viewModel.loadServerData(viewModelParent)
                    viewModelParent.childrenLoaded = true
                }

                viewModelParent.expanded = !viewModelParent.expanded
            }
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
        function clonePerson(person) {
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

        function findById(persons, id) {
            for (const person of persons) {
                if (person.id === id) {
                    return person
                }

                const nestedMatch = findById(person.children || [], id)
                
                if (nestedMatch) {
                    return nestedMatch
                }
            }

            return undefined
        }

        TemplateEngine.withoutModelSynchronization(() => {
            // Der ViewModel-Parent kommt aus dem geklickten UI-Knoten.
            // Über seine ID wird das zugehörige Objekt im lokalen Model gefunden.
            const modelParent = viewModelParent
                ? findById(model.persons, viewModelParent.id)
                : undefined

            // Der lokale Model-Parent liefert wiederum die ID, mit der der
            // passende Datensatz im Server-Modell gesucht wird.
            const serverParent = modelParent
                ? findById(fakeServerData, modelParent.id)
                : undefined

            // Ohne Parent werden die Datensätze der ersten Ebene geladen.
            // Mit Parent werden nur dessen direkte Kinder geladen.
            const serverPersons = serverParent ? serverParent.children || [] : fakeServerData

            // Die Server-Datensätze werden flach geklont; ihre children bleiben
            // leer und können später durch einen eigenen Expand-Klick geladen werden.
            const nextPersons = serverPersons.map(clonePerson)

            // Aktualisiere das Model-Array: Root-Daten landen in model.persons,
            // untergeordnete Daten im children-Array des Model-Parents.
            const targetPersons = modelParent ? modelParent.children : model.persons

            // Aktualisiere parallel das ViewModel-Array, damit die neuen Daten
            // unmittelbar in der rekursiven UL/LI-Struktur dargestellt werden.
            const targetViewModelPersons = viewModelParent ? viewModelParent.children : viewModel.persons

            targetPersons.splice(0, targetPersons.length, ...nextPersons)
            targetViewModelPersons.splice(
                0,
                targetViewModelPersons.length,
                ...targetPersons.map((person) => viewModel.transform(person))
            )
        })
    },

    demoUpdates() { 
        runDemoUpdates(viewModel, model)
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

viewModel.loadServerData()