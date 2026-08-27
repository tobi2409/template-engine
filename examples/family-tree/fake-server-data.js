const database = new alasql.Database('family-tree')

database.exec('CREATE TABLE persons (id INT, parentId INT, name STRING, wage INT, birthyear INT, street STRING, city STRING)')

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

function insertPersons(persons, parentId = null) {
    for (const person of persons) {
        database.tables.persons.data.push({
            id: person.id,
            parentId,
            name: person.name,
            wage: person.wage,
            birthyear: person.birthyear,
            street: person.address?.street || '',
            city: person.address?.city || ''
        })
        
        insertPersons(person.children || [], person.id)
    }
}

insertPersons(fakeServerData)

export function getPersons(parentId = null) {
    const query = parentId === null
        ? 'SELECT id, name, wage, birthyear, street, city FROM persons WHERE parentId IS NULL'
        : 'SELECT id, name, wage, birthyear, street, city FROM persons WHERE parentId = ?'
    const parameters = parentId === null ? [] : [parentId]

    return database.exec(query, parameters).map((person) => ({
        id: person.id,
        name: person.name,
        wage: person.wage,
        birthyear: person.birthyear,
        address: {
            street: person.street,
            city: person.city
        },
        children: []
    }))
}
