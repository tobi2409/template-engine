export function runDemoUpdates(viewModel, loadServerData) {
    const currentYear = new Date().getFullYear()

    if (!viewModel.persons[0].childrenLoaded) {
        loadServerData(viewModel.persons[0])
        viewModel.persons[0].childrenLoaded = true
    }

    viewModel.persons[0].name = 'Max Mustermann - Updated'
    viewModel.persons[0].age = 100

    viewModel.persons[0].children[0].name = 'Max Jr. - Updated'
    viewModel.persons[0].children[0].age = 20
    viewModel.persons[0].children[0].address.street = 'Updated Street 3'

    viewModel.persons[0].children.push(viewModel.transform({
        id: 33,
        name: 'Max Jr. - Sibling',
        wage: 5,
        birthyear: currentYear - 14,
        address: {
            street: 'Main Street 3',
            city: 'Köln'
        },
        children: [{
            id: 5,
            name: 'Max III.',
            wage: 2,
            birthyear: currentYear - 1,
            address: {
                street: 'Main Street 5',
                city: 'Köln'
            },
            children: []
        }]
    }))

    viewModel.persons[1].age = 80
    viewModel.persons[1].address.city = 'Munich'

    viewModel.persons.push(viewModel.transform({
        id: 4,
        name: 'Max Mustermann - Sibling',
        wage: 5,
        birthyear: currentYear - 29,
        address: {
            street: 'Third Street 4',
            city: 'Frankfurt'
        },
        children: []
    }))

    viewModel.persons[2].age = 60
    viewModel.persons[2].address.street = 'Updated Street 2'
}
