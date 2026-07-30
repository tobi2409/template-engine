import TemplateEngine from '../../src/template-engine.js'

const data = TemplateEngine.reactive({
    name: 'Sarah Wilson',
    age: 28,
    persons: [{
        name: 'Alex Chen',
        role: 'Tech Lead',
        childs: [{
            name: 'Maya Patel - Senior Developer',
            childs: []
        }, {
            name: 'Jordan Kim - Frontend Developer',
            childs: []
        }]
    }, {
        name: 'Chris Martinez',
        role: 'Product Manager',
        childs: [{
            name: 'Taylor Brown - UX Designer',
            childs: []
        }]
    }]
}, document.getElementById('app-template-use'))

// Demonstrate dynamic updates
data.persons[0].name = 'Alex Chen (updated)'
data.persons[0].childs.push({ name: 'Sam Lee - Junior Developer', childs: [] })
data.persons[0].childs.splice(1, 0, { name: 'Jamie Torres - DevOps Engineer', childs: [] })
data.persons.splice(1, 0, { name: 'Riley Cooper', role: 'QA Lead', childs: [{ name: 'Casey Morgan - QA Engineer', childs: [] }] })

console.log('Organization data:', data)

data.checkRendered = function() {
    const msgs = []
    msgs.push(document.body.textContent.includes('Alex Chen (updated)') ? 'Name updated OK' : 'Name update missing')
    msgs.push(document.body.textContent.includes('Sam Lee - Junior Developer') ? 'Sam Lee present' : 'Sam Lee missing')
    msgs.push(document.body.textContent.includes('Jamie Torres - DevOps Engineer') ? 'Jamie Torres present' : 'Jamie Torres missing')
    msgs.push(document.body.textContent.includes('Riley Cooper') ? 'Riley Cooper present' : 'Riley Cooper missing')
    const ok = msgs.every(m => /present|OK/.test(m))
    const msg = (ok ? 'All checks passed:\n' : 'Some checks failed:\n') + msgs.join('\n')
    console.log(msg)
    alert(msg)
}
