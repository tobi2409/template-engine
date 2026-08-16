import TemplateEngine from '../../src/template-engine.js'
import { runDemoUpdates } from './demo-updates.js'

const data = TemplateEngine.reactive({
    name: 'Morgan Davis',
    salary: 85000,
    showSalary: true,
    team: [{
        name: 'Sophie Turner',
        role: 'Senior Engineer',
        active: true,
        reports: [{
            name: 'Liam Chen',
            role: 'Mid-level Engineer',
            reports: [],
            active: true
        }, {
            name: 'Olivia Martinez',
            role: 'Junior Engineer',
            reports: [],
            active: true
        }]
    }, {
        name: 'Noah Anderson',
        role: 'Designer',
        active: true,
        reports: [{
            name: 'Emma Wilson',
            role: 'UI Designer',
            reports: [],
            active: false
        }]
    }],

    runDemoUpdates: function() {
        runDemoUpdates(data)
    }
}, document.getElementById('app-template-use'))


