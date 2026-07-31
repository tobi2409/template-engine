import TemplateEngine from '../../src/template-engine.js'
import { removeByReference } from '../../src/array-helpers.js'

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
            id: 1,
            name: 'Maya Patel - Senior Developer',
            editing: false,
            children: []
        }, {
            id: 2,
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
            id: 1,
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
    }
}, document.getElementById('app-template-use'))

// Demonstrate dynamic updates
data.watermark = 'Top Secret'
data.persons[0].name = 'Alex Chen (updated)'
data.persons[0].children.push({ id: 3, name: 'Sam Lee - Junior Developer', editing: false, children: [] })
data.persons[0].children.splice(1, 0, { id: 4, name: 'Jamie Torres - DevOps Engineer', editing: false, children: [] })
data.persons.splice(1, 0, { id: 2, name: 'Riley Cooper', role: 'QA Lead', editing: false,
    children: [{ id: 1, name: 'Casey Morgan - QA Engineer', editing: false, children: [] }] })
    data.persons[0].children.splice(0, 1)
data.persons[0].children[1].name = 'Jordan Kim (Updated) - Frontend Developer'

console.log('Organization data:', data)


