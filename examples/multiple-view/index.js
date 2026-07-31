import TemplateEngine from '../../src/template-engine.js'

const model = TemplateEngine.reactive({
    persons: [{
        name: 'Alice',
        age: 30
    }, {
        name: 'Bob',
        age: 25
    }, {
        name: 'Charlie',
        age: 35
    }],

    addPerson: function (a) {
        const newPerson = { name: 'New Person', age: 20 }
        model.persons.push(newPerson)
    }
}, document.getElementById('app-template-use'))