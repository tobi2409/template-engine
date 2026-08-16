function assertSelectorContains(selector, expectedText, step) {
    const node = document.querySelector(selector)

    if (!node || !node.textContent.includes(expectedText)) {
        throw new Error(`Demo update not rendered (${step}): expected "${expectedText}" in "${selector}"`)
    }
}

function assertSelectorCount(selector, expectedCount, step) {
    const nodes = document.querySelectorAll(selector)

    if (nodes.length !== expectedCount) {
        throw new Error(`Demo update not rendered (${step}): expected ${expectedCount} matches for "${selector}", got ${nodes.length}`)
    }
}

export function runDemoUpdates(data) {
    data.persons[0].name = 'Alex Chen (updated)'
    data.persons[0].children.push({ id: 103, name: 'Sam Lee - Junior Developer', children: [] })
    data.persons[0].children.splice(1, 0, { id: 104, name: 'Jamie Torres - DevOps Engineer', children: [] })
    data.persons.splice(1, 0, { id: 2, name: 'Riley Cooper', role: 'QA Lead', children: [{ id: 201, name: 'Casey Morgan - QA Engineer', children: [] }] })

    assertSelectorCount('#persons-list > li', 3, 'render all persons count')
    assertSelectorCount('#persons-list > li:nth-child(1) > ul > li', 4, 'render all children for person 1')
    assertSelectorCount('#persons-list > li:nth-child(2) > ul > li', 1, 'render all children for person 2')
    assertSelectorCount('#persons-list > li:nth-child(3) > ul > li', 1, 'render all children for person 3')

    assertSelectorContains('#persons-list > li:nth-child(1) > strong', 'Alex Chen (updated)', 'render person 1')
    assertSelectorContains('#persons-list > li:nth-child(1) > ul > li:nth-child(1)', 'Maya Patel - Senior Developer', 'render person 1 child 1')
    assertSelectorContains('#persons-list > li:nth-child(1) > ul > li:nth-child(2)', 'Jamie Torres - DevOps Engineer', 'render person 1 child 2')
    assertSelectorContains('#persons-list > li:nth-child(1) > ul > li:nth-child(3)', 'Jordan Kim - Frontend Developer', 'render person 1 child 3')
    assertSelectorContains('#persons-list > li:nth-child(1) > ul > li:nth-child(4)', 'Sam Lee - Junior Developer', 'render person 1 child 4')

    assertSelectorContains('#persons-list > li:nth-child(2) > strong', 'Riley Cooper', 'render person 2')
    assertSelectorContains('#persons-list > li:nth-child(2) > ul > li:nth-child(1)', 'Casey Morgan - QA Engineer', 'render person 2 child 1')

    assertSelectorContains('#persons-list > li:nth-child(3) > strong', 'Chris Martinez', 'render person 3')
    assertSelectorContains('#persons-list > li:nth-child(3) > ul > li:nth-child(1)', 'Taylor Brown - UX Designer', 'render person 3 child 1')

    console.log('Organization data:', data)
}
