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

function mapModelToViewModel(model) {
    const obj = {
        id: model.id,
        name: model.name,
        wage: `${model.wage} USD`,
        age: new Date().getFullYear() - model.birthyear,
        layerDecoration: '»',
        collapsed: false,
        childs: []
    }

    obj.collapse = () => {
        obj.collapsed = !obj.collapsed

        if (obj.collapsed) {
            obj.childs = createMappedArray(
                model.childs,
                mapModelToViewModel,
                { name: 'name', wage: 'wage', age: 'birthyear' },
                (childViewModelItem, childModelItem) => ({
                    id: childViewModelItem.id,
                    name: childViewModelItem.name,
                    wage: parseFloat(childViewModelItem.wage),
                    birthyear: new Date().getFullYear() - childViewModelItem.age,
                    childs: []
                })
            )

            void obj.childs
        } else {
            // Collapse: remove child view objects to free memory; model already synced
            obj.childs = []
        }
    }

    return obj
}

function mapViewModelToModel(viewModel, model) {
    return {
        id: viewModel.id,
        name: viewModel.name,
        wage: viewModel.wage.slice(0, -4),
        birthyear: new Date().getFullYear() - viewModel.age,
        childs: mapModelToViewModel(model.childs)
    }
}

const viewModel = TemplateEngine.reactive({
    get user() {
        return model.user
    },

    set user(value) {
        model.user = value
    },

    get beautifiedPersons() {
        return createMappedArray(
            model.persons,
            (person) => {
                return mapModelToViewModel(person)
            },
            { name: 'name', wage: 'wage', age: 'birthyear' },
            (personViewModelItem, personModelItem) => {
                return mapViewModelToModel(personViewModelItem, personModelItem)
            }
        )
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    },

    testMaxJr() {
        const maxJr = viewModel.beautifiedPersons[0].childs[0]
        maxJr.name = 'Max Jr. Edited'
        maxJr.wage = '7 USD'
        maxJr.age = 4

        maxJr.childs.push({
            id: 8,
            name: 'Maxina III',
            wage: '1 USD',
            age: 2,
            childs: []
        })
    },

    testMaxIII() {
    }
}, document.getElementById('app-template-use'))

// Erzwinge Auswertung von `viewModel.beautifiedPersons`, damit die
// zurückgegebenen View‑Objekte sofort reaktiv gepatcht werden.
// Ohne das sind lokale Toggles (z. B. `collapse`) nicht mit den
// Engine-Notifies verbunden und lösen keinen UI‑Refresh aus.
void viewModel.beautifiedPersons

// Hinweis: Die `bind-*` Inputs funktionieren sofort, weil die Bind-Handler
// (siehe TemplateEngine) beim UI→Data-Update `KeyResolver.setByPath(...)` nutzen
// und anschließend `RefreshDelegator`/`Notifier` anstoßen. Dadurch wird das
// Model gezielt geschrieben und die Engine führt sofort einen UI-Refresh aus.