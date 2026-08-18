export const fakeServerData = [{
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
        children: [{
            id: 5,
            name: 'Max III',
            wage: 2,
            birthyear: 2035,
            address: {
                street: 'Main Street 5',
                city: 'Hamburg'
            },
            children: []
        }]
    }, {
        id: 6,
        name: 'Max Jr. 2',
        wage: 5,
        birthyear: 2012,
        address: {
            street: 'Main Street 6',
            city: 'Dresden'
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
    children: [{
        id: 4,
        name: 'Erika Jr.',
        wage: 6,
        birthyear: 2015,
        address: {
            street: 'Second Street 4',
            city: 'Munich'
        },
        children: []
    }]
}]
