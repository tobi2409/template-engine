import TemplateEngine from '../../src/template-engine.js'

// Backing object for the computed accessor (kept outside data so makeReactive
// can assign the correct fullKey 'selectedPerson' on first getter access)
const _raw = { person: { name: 'Kai' } }

const data = TemplateEngine.reactive({
    person: { name: 'Anna', address: { city: 'Berlin' } },

    get selectedPerson() { return _raw.person },
    set selectedPerson(v) { _raw.person = v },

    persons: [{ name: 'Anna' }, { name: 'Ben' }],

    s1:  (e, d) => { d.person.name = 'Lisa' },
    s2a: (e, d) => { d.person.address.city = 'Hamburg' },
    s2b: (e, d) => { d.person.address = { city: 'Köln' }; },
    s2c: (e, d) => { d.person.address.city = 'Bonn' },
    s3a: (e, d) => { d.selectedPerson.name = 'Finn' },
    s3b: (e, d) => { d.selectedPerson = { name: 'Mia' }; },
    s3c: (e, d) => { d.selectedPerson.name = 'Luisa' },
    s4a: (e, d) => { d.persons[0].name = 'Clara' },
    s4b: (e, d) => { d.persons.push({ name: 'David' }) },
    s4c: (e, d) => { d.persons[d.persons.length - 1].name = 'Daniel' },
}, document.getElementById('tpl-use'))

data.checkRendered = function() {
    const msgs = []
    msgs.push(document.body.textContent.includes('David') ? 'David present' : 'David missing')
    msgs.push(document.body.textContent.includes('Clara') ? 'Clara present' : 'Clara missing')
    const ok = msgs.some(m => /present/.test(m))
    const msg = (ok ? 'Some checks passed:\n' : 'Checks failed:\n') + msgs.join('\n')
    console.log(msg)
    alert(msg)
}
