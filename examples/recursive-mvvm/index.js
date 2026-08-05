import TemplateEngine from '../../src/template-engine.js'
import ViewModelArray from '../../src/viewmodel-array.js'

const model = {
    user: 'Joe Doe',
    persons: [{
        id: 1,
        name: 'Max Mustermann',
        wage: 10,
        birthyear: 1990,
        address: {
            street: 'Main Street 1',
            city: 'Berlin'
        },
        children: [{
            id: 3,
            name: 'Max Jr.',
            wage: 5,
            birthyear: 2010,
            address: {
                street: 'Main Street 3',
                city: 'Bremen'
            },
            children: []
        }]
    }, {
        id: 2,
        name: 'Erika Mustermann',
        wage: 12,
        birthyear: 1992,
        address: {
            street: 'Second Street 2',
            city: 'Hamburg'
        },
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

    reverseTransform(personViewModelItem) {
        return {
            id: personViewModelItem.id,
            name: personViewModelItem.name,
            wage: personViewModelItem.wage.slice(0, -4),
            birthyear: new Date().getFullYear() - personViewModelItem.age,
            address: {
                street: personViewModelItem.address?.street || '',
                city: personViewModelItem.address?.city || ''
            },
            children: personViewModelItem.children.map(viewModelChild => this.reverseTransform(viewModelChild))
        }
    },

    get persons() {
        return ViewModelArray.get(
            model.persons,
            (personModelItem) => (this.transform(personModelItem)),
            (personViewModelItem) => (this.reverseTransform(personViewModelItem))
        )
    },

    demoUpdates() {
        viewModel.persons[0].name = 'Max Mustermann - Updated'
        viewModel.persons[0].age = 100

        viewModel.persons[0].children[0].name = 'Max Jr. - Updated'
        viewModel.persons[0].children[0].age = 20
        viewModel.persons[0].children[0].address.street = 'Updated Street 3'

        viewModel.persons[1].age = 80
        viewModel.persons[1].address.city = 'Munich'

        viewModel.persons.push({
            id: 4,
            name: 'Max Mustermann - Sibling',
            wage: '5 USD',
            age: 29,
            address: {
                street: 'Third Street 4',
                city: 'Frankfurt'
            },
            children: [] // ViewModelArray.markRecursive([])
        })

        viewModel.persons[2].age = 60
        viewModel.persons[2].address.street = 'Updated Street 2'

        viewModel.persons[0].children.push({
            id: 3,
            name: 'Max Jr. - Sibling',
            wage: '5 USD',
            age: 14,
            address: {
                street: 'Main Street 3',
                city: 'Köln'
            },
            children: [] // { __recursive__: true, data: [] }
        })
    },

    logModels() {
        console.log('ViewModel:', viewModel)
        console.log('Model:', model)
    }
}, document.getElementById('app-template-use'))

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