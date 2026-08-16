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

export function runDemoUpdates(viewModel) {
    viewModel.firstName = 'Emily'
    viewModel.wage = 200
    viewModel.beautifiedPersonData.push({ id: 3, name: 'Sample', age: 40, showEdit: false })
    viewModel.beautifiedPersonData[0].name = 'Test Updated'
    viewModel.beautifiedPersonData.splice(1, 1)

    assertSelectorContains('#first-name-row', 'Emily', 'update firstName')
    assertSelectorNotContains('#wage-block', 'earns $200', 'hide wage block')
    assertSelectorContains('#person-list li[item-index="3"]', 'Sample', 'push person')
    assertSelectorContains('#person-list li[item-index="1"]', 'Test Updated', 'rename first person')

    if (document.querySelector('#person-list li[item-index="2"]')) {
        throw new Error('Demo update not rendered (splice remove second person): expected #person-list li[item-index="2"] to be removed')
    }
}
