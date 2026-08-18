function assertSelectorCount(selector, expectedCount, step) {
    const nodes = document.querySelectorAll(selector)

    if (nodes.length !== expectedCount) {
        throw new Error(`Demo update not rendered (${step}): expected ${expectedCount} matches for "${selector}", got ${nodes.length}`)
    }
}

function assertInputValue(selector, expectedValue, step) {
    const input = document.querySelector(selector)

    if (!input) {
        throw new Error(`Demo update not rendered (${step}): expected input "${selector}" to exist`)
    }

    if (input.value !== String(expectedValue)) {
        throw new Error(`Demo update not rendered (${step}): expected value "${expectedValue}" in "${selector}", got "${input.value}"`)
    }
}

function assertValue(actualValue, expectedValue, step) {
    if (actualValue !== expectedValue) {
        throw new Error(`Demo update not synchronized to model (${step}): expected "${expectedValue}", got "${actualValue}"`)
    }
}

export function runDemoUpdates(viewModel, model) {
    const currentYear = new Date().getFullYear()

    viewModel.persons[0].name = 'Max Mustermann - Updated'
    viewModel.persons[0].age = 100

    viewModel.persons[0].children[0].name = 'Max Jr. - Updated'
    viewModel.persons[0].children[0].age = 20
    viewModel.persons[0].children[0].address.street = 'Updated Street 3'

    viewModel.persons[0].children.push({
        id: 33,
        name: 'Max Jr. - Sibling',
        wage: '5 USD',
        age: 14,
        address: {
            street: 'Main Street 3',
            city: 'Köln'
        },
        children: [{
            id: 5,
            name: 'Max III.',
            wage: '2 USD',
            age: 1,
            address: {
                street: 'Main Street 5',
                city: 'Köln'
            },
            children: []
        }]
    })

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
        children: []
    })

    viewModel.persons[2].age = 60
    viewModel.persons[2].address.street = 'Updated Street 2'

    assertSelectorCount('#app > ul > li', 3, 'render all root persons count')
    assertSelectorCount('#app > ul > li:nth-child(1) > ul > li', 2, 'render all children for root person 1')
    assertSelectorCount('#app > ul > li:nth-child(1) > ul > li:nth-child(2) > ul > li', 1, 'render nested grandchild for root person 1 child 2')
    assertSelectorCount('#app > ul > li:nth-child(2) > ul > li', 0, 'render empty children list for root person 2')
    assertSelectorCount('#app > ul > li:nth-child(3) > ul > li', 0, 'render empty children list for root person 3')

    assertInputValue('#app > ul > li:nth-child(1) > input:nth-of-type(1)', 'Max Mustermann - Updated', 'update root person 1 name')
    assertInputValue('#app > ul > li:nth-child(1) > input:nth-of-type(3)', 100, 'update root person 1 age')

    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(1) > input:nth-of-type(1)', 'Max Jr. - Updated', 'update child 1 name')
    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(1) > input:nth-of-type(3)', 20, 'update child 1 age')
    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(1) > input:nth-of-type(4)', 'Updated Street 3', 'update child 1 street')

    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(2) > input:nth-of-type(1)', 'Max Jr. - Sibling', 'push child 2 name')
    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(2) > input:nth-of-type(3)', 14, 'push child 2 age')
    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(2) > input:nth-of-type(4)', 'Main Street 3', 'push child 2 street')
    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(2) > input:nth-of-type(5)', 'Köln', 'push child 2 city')
    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(2) > ul > li:nth-child(1) > input:nth-of-type(1)', 'Max III.', 'render grandchild name')
    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(2) > ul > li:nth-child(1) > input:nth-of-type(4)', 'Main Street 5', 'render grandchild street')
    assertInputValue('#app > ul > li:nth-child(1) > ul > li:nth-child(2) > ul > li:nth-child(1) > input:nth-of-type(5)', 'Köln', 'render grandchild city')

    assertInputValue('#app > ul > li:nth-child(2) > input:nth-of-type(3)', 80, 'update root person 2 age')
    assertInputValue('#app > ul > li:nth-child(2) > input:nth-of-type(5)', 'Munich', 'update root person 2 city')

    assertInputValue('#app > ul > li:nth-child(3) > input:nth-of-type(1)', 'Max Mustermann - Sibling', 'push root person 3 name')
    assertInputValue('#app > ul > li:nth-child(3) > input:nth-of-type(3)', 60, 'update root person 3 age')
    assertInputValue('#app > ul > li:nth-child(3) > input:nth-of-type(4)', 'Updated Street 2', 'update root person 3 street')

    assertValue(model.persons.length, 3, 'model root persons count')
    assertValue(model.persons[0].name, 'Max Mustermann - Updated', 'model root person 1 name')
    assertValue(model.persons[0].birthyear, currentYear - 100, 'model root person 1 birthyear')

    assertValue(model.persons[0].children.length, 2, 'model root person 1 children count')
    assertValue(model.persons[0].children[0].name, 'Max Jr. - Updated', 'model child 1 name')
    assertValue(model.persons[0].children[0].birthyear, currentYear - 20, 'model child 1 birthyear')
    assertValue(model.persons[0].children[0].address.street, 'Updated Street 3', 'model child 1 street')

    assertValue(model.persons[0].children[1].name, 'Max Jr. - Sibling', 'model child 2 name')
    assertValue(model.persons[0].children[1].wage, '5', 'model child 2 wage')
    assertValue(model.persons[0].children[1].birthyear, currentYear - 14, 'model child 2 birthyear')
    assertValue(model.persons[0].children[1].address.street, 'Main Street 3', 'model child 2 street')
    assertValue(model.persons[0].children[1].address.city, 'Köln', 'model child 2 city')
    assertValue(model.persons[0].children[1].children.length, 1, 'model grandchild count')
    assertValue(model.persons[0].children[1].children[0].name, 'Max III.', 'model grandchild name')
    assertValue(model.persons[0].children[1].children[0].address.street, 'Main Street 5', 'model grandchild street')
    assertValue(model.persons[0].children[1].children[0].address.city, 'Köln', 'model grandchild city')

    assertValue(model.persons[1].birthyear, currentYear - 80, 'model root person 2 birthyear')
    assertValue(model.persons[1].address.city, 'Munich', 'model root person 2 city')

    assertValue(model.persons[2].name, 'Max Mustermann - Sibling', 'model root person 3 name')
    assertValue(model.persons[2].birthyear, currentYear - 60, 'model root person 3 birthyear')
    assertValue(model.persons[2].address.street, 'Updated Street 2', 'model root person 3 street')
}
