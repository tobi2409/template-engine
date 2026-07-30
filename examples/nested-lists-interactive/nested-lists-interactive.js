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
        childs: [{
            id: 1,
            name: 'Maya Patel - Senior Developer',
            editing: false,
            childs: []
        }, {
            id: 2,
            name: 'Jordan Kim - Frontend Developer',
            editing: false,
            childs: []
        }]
    }, {
        id: 3,
        name: 'Chris Martinez',
        role: 'Product Manager',
        editing: false,
        childs: [{
            id: 1,
            name: 'Taylor Brown - UX Designer',
            editing: false,
            childs: []
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
        
        if (parentData?.childs) {
            removeByReference(parentData.childs, dataElement)
        }
    }
}, document.getElementById('app-template-use'))

// Demonstrate dynamic updates
data.persons[0].name = 'Alex Chen (updated)'
data.persons[0].childs.push({ id: 3, name: 'Sam Lee - Junior Developer', editing: false, childs: [] })
data.persons[0].childs.splice(1, 0, { id: 4, name: 'Jamie Torres - DevOps Engineer', editing: false, childs: [] })
data.persons.splice(1, 0, { id: 2, name: 'Riley Cooper', role: 'QA Lead', editing: false,
                        childs: [{ id: 1, name: 'Casey Morgan - QA Engineer', editing: false, childs: [] }] })
data.persons[0].childs.splice(0, 1)
data.watermark = 'Top Secret'
data.persons[0].childs[1].name = 'Jordan Kim (Updated) - Frontend Developer'

console.log('Organization data:', data)

data.checkRendered = function() {
    const msgs = []
    msgs.push(document.body.textContent.includes('Alex Chen (updated)') ? 'Name updated OK' : 'Name update missing')
    msgs.push(document.body.textContent.includes('Sam Lee - Junior Developer') ? 'Sam Lee present' : 'Sam Lee missing')
    msgs.push(document.body.textContent.includes('Top Secret') ? 'Watermark OK' : 'Watermark missing')
    msgs.push(document.body.textContent.includes('Jordan Kim (Updated)') ? 'Jordan updated OK' : 'Jordan update missing')
    const ok = msgs.every(m => /present|OK/.test(m))
    const msg = (ok ? 'All checks passed:\n' : 'Some checks failed:\n') + msgs.join('\n')
    console.log(msg)
    alert(msg)
}
