import TemplateEngine from '../../src/template-engine.js'
import { runDemoUpdates } from './demo-updates.js'

const data = TemplateEngine.reactive({
    name: 'Sarah Wilson',
    age: 28,
    persons: [{
        id: 1,
        name: 'Alex Chen',
        role: 'Tech Lead',
        children: [{
            id: 101,
            name: 'Maya Patel - Senior Developer',
            children: []
        }, {
            id: 102,
            name: 'Jordan Kim - Frontend Developer',
            children: []
        }]
    }, {
        id: 3,
        name: 'Chris Martinez',
        role: 'Product Manager',
        children: [{
            id: 301,
            name: 'Taylor Brown - UX Designer',
            children: []
        }]
    }],

    runDemoUpdates: function() {
        runDemoUpdates(data)
    }
}, document.getElementById('app-template-use'))


