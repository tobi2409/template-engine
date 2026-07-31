import TemplateEngine from '../../src/template-engine.js'

const data = TemplateEngine.reactive({
    name: 'Sarah Wilson',
    age: 28,
    persons: [{
        name: 'Alex Chen',
        role: 'Tech Lead',
        children: [{
            name: 'Maya Patel - Senior Developer',
            children: []
        }, {
            name: 'Jordan Kim - Frontend Developer',
            children: []
        }]
    }, {
        name: 'Chris Martinez',
        role: 'Product Manager',
        children: [{
            name: 'Taylor Brown - UX Designer',
            children: []
        }]
    }]
}, document.getElementById('app-template-use'))

// Demonstrate dynamic updates
data.persons[0].name = 'Alex Chen (updated)'
data.persons[0].children.push({ name: 'Sam Lee - Junior Developer', children: [] })
data.persons[0].children.splice(1, 0, { name: 'Jamie Torres - DevOps Engineer', children: [] })
data.persons.splice(1, 0, { name: 'Riley Cooper', role: 'QA Lead', children: [{ name: 'Casey Morgan - QA Engineer', children: [] }] })

console.log('Organization data:', data)


