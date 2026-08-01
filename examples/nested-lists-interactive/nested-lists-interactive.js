import TemplateEngine from '../../src/template-engine.js'
import { removeByReference } from '../../src/array-helpers.js'

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

const data = TemplateEngine.reactive({
    name: 'Sarah Wilson',
    age: 28,
    watermark: 'Confidential',
    persons: [{
        id: 1,
        name: 'Alex Chen',
        role: 'Tech Lead',
        editing: false,
        children: [{
            id: 101,
            name: 'Maya Patel - Senior Developer',
            editing: false,
            children: []
        }, {
            id: 102,
            name: 'Jordan Kim - Frontend Developer',
            editing: false,
            children: []
        }]
    }, {
        id: 3,
        name: 'Chris Martinez',
        role: 'Product Manager',
        editing: false,
        children: [{
            id: 301,
            name: 'Taylor Brown - UX Designer',
            editing: false,
            children: []
        }]
    }],
    toggleEdit: (e, dataElement) => {
        dataElement.editing = !dataElement.editing
    },
    
    delete: (e, dataElement) => {
        removeByReference(data.persons, dataElement)
    },

    toggleChildEdit: (e, dataElement) => {
        dataElement.editing = !dataElement.editing
    },

    deleteChild: (e, dataElement, dataElementUuid, contextStack) => {
        const parentData = contextStack.get('p')?.data
        
        if (parentData?.children) {
            removeByReference(parentData.children, dataElement)
        }
    },

    runDemoUpdates: () => {
        data.watermark = 'Top Secret'
        data.persons[0].name = 'Alex Chen (updated)'
        data.persons[0].children.push({ id: 103, name: 'Sam Lee - Junior Developer', editing: false, children: [] })
        data.persons[0].children.splice(1, 0, { id: 104, name: 'Jamie Torres - DevOps Engineer', editing: false, children: [] })
        data.persons.splice(1, 0, { id: 2, name: 'Riley Cooper', role: 'QA Lead', editing: false,
            children: [{ id: 201, name: 'Casey Morgan - QA Engineer', editing: false, children: [] }] })

        data.persons[0].children.splice(0, 1)
        data.persons[0].children[1].name = 'Jordan Kim (Updated) - Frontend Developer'

        assertSelectorCount('#persons-list-interactive > li', 3, 'render all persons count')
        assertSelectorCount('#persons-list-interactive > li:nth-child(1) > ul > li', 3, 'render all children for person 1')
        assertSelectorCount('#persons-list-interactive > li:nth-child(2) > ul > li', 1, 'render all children for person 2')
        assertSelectorCount('#persons-list-interactive > li:nth-child(3) > ul > li', 1, 'render all children for person 3')
        assertSelectorCount('#persons-list-interactive > li > ul > li > b', 5, 'render watermark for all children')

        assertSelectorContains('#persons-list-interactive > li:nth-child(1) > strong', 'Alex Chen (updated)', 'render person 1')
        assertSelectorContains('#persons-list-interactive > li:nth-child(1) > ul > li:nth-child(1) > b', 'Top Secret', 'render watermark person 1 child 1')
        assertSelectorContains('#persons-list-interactive > li:nth-child(1) > ul > li:nth-child(2) > b', 'Top Secret', 'render watermark person 1 child 2')
        assertSelectorContains('#persons-list-interactive > li:nth-child(1) > ul > li:nth-child(3) > b', 'Top Secret', 'render watermark person 1 child 3')
        assertSelectorContains('#persons-list-interactive > li:nth-child(1) > ul > li:nth-child(1)', 'Jamie Torres - DevOps Engineer', 'render person 1 child 1')
        assertSelectorContains('#persons-list-interactive > li:nth-child(1) > ul > li:nth-child(2)', 'Jordan Kim (Updated) - Frontend Developer', 'render person 1 child 2')
        assertSelectorContains('#persons-list-interactive > li:nth-child(1) > ul > li:nth-child(3)', 'Sam Lee - Junior Developer', 'render person 1 child 3')

        assertSelectorContains('#persons-list-interactive > li:nth-child(2) > strong', 'Riley Cooper', 'render person 2')
        assertSelectorContains('#persons-list-interactive > li:nth-child(2) > ul > li:nth-child(1) > b', 'Top Secret', 'render watermark person 2 child 1')
        assertSelectorContains('#persons-list-interactive > li:nth-child(2) > ul > li:nth-child(1)', 'Casey Morgan - QA Engineer', 'render person 2 child 1')

        assertSelectorContains('#persons-list-interactive > li:nth-child(3) > strong', 'Chris Martinez', 'render person 3')
        assertSelectorContains('#persons-list-interactive > li:nth-child(3) > ul > li:nth-child(1) > b', 'Top Secret', 'render watermark person 3 child 1')
        assertSelectorContains('#persons-list-interactive > li:nth-child(3) > ul > li:nth-child(1)', 'Taylor Brown - UX Designer', 'render person 3 child 1')

        const firstChildrenList = document.querySelector('#persons-list-interactive > li:nth-child(1) > ul')
        if (firstChildrenList && firstChildrenList.textContent.includes('Maya Patel - Senior Developer')) {
            throw new Error('Demo update not rendered (remove first child): expected Maya Patel - Senior Developer to be absent in first child list')
        }

        console.log('Organization data:', data)
    }
}, document.getElementById('app-template-use'))


