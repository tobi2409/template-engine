function assertSelectorContains(selector, expectedText, step) {
    const node = document.querySelector(selector)

    if (!node || !node.textContent.includes(expectedText)) {
        throw new Error(`Demo update not rendered (${step}): expected "${expectedText}" in "${selector}"`)
    }
}

function assertSelectorNotContains(selector, unexpectedText, step) {
    const node = document.querySelector(selector)

    if (node && node.textContent.includes(unexpectedText)) {
        throw new Error(`Demo update not rendered (${step}): expected "${unexpectedText}" to be removed from "${selector}"`)
    }
}

function assertValue(actualValue, expectedValue, step) {
    if (actualValue !== expectedValue) {
        throw new Error(`Demo update not synchronized to model (${step}): expected "${expectedValue}", got "${actualValue}"`)
    }
}

export function runDemoUpdates(viewModel, model) {
    viewModel.firstName = 'Emily'
    viewModel.wage = 200
    viewModel.beautifiedPersonData.data.push({ id: 3, name: 'Sample', age: 40, showEdit: false })
    viewModel.beautifiedPersonData.data[0].name = 'Test Updated'
    viewModel.beautifiedPersonData.data.splice(1, 1)

    assertSelectorContains('#first-name-row', 'Emily', 'update firstName')
    assertSelectorNotContains('#wage-block', 'earns $200', 'hide wage block')
    assertSelectorContains('#person-list li[item-index="3"]', 'Sample', 'push person')
    assertSelectorContains('#person-list li[item-index="1"]', 'Test Updated', 'rename first person')

    if (document.querySelector('#person-list li[item-index="2"]')) {
        throw new Error('Demo update not rendered (splice remove second person): expected #person-list li[item-index="2"] to be removed')
    }

    assertValue(model.firstName, 'Emily', 'model firstName')
    assertValue(model.wage, 200, 'model wage')
    assertValue(model.rawPersonData.length, 2, 'model person count after push and splice')
    assertValue(model.rawPersonData[0].name, 'Test Updated', 'model first person name')
    assertValue(model.rawPersonData[1].id, 3, 'model pushed person id')
    assertValue(model.rawPersonData[1].name, 'Sample', 'model pushed person name')
    assertValue(model.rawPersonData[1].birthyear, new Date().getFullYear() - 40, 'model pushed person birthyear')
}
