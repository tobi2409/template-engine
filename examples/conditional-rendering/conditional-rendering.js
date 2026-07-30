import TemplateEngine from '../../src/template-engine.js'

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
    }]
}, document.getElementById('app-template-use'))

// Dynamic updates
data.team[0].name = 'Sophie Turner (Team Lead)'
data.team[0].reports.push({ active: true, name: 'Ava Johnson', role: 'Intern', reports: [] })
data.team[0].reports.push({ active: true, name: 'Ethan Brown', role: 'Engineer', reports: [ { active: true, name: 'Isabella Garcia', role: 'Contractor', reports: [ { active: true, name: 'Mason Lee', role: 'Consultant', reports: [] } ] } ] })
data.team[0].reports.splice(1, 0, { active: true, name: 'James Miller', role: 'DevOps', reports: [] })
data.team.splice(1, 0, { active: true, name: 'Charlotte Davis', role: 'Product Manager', reports: [{ active: true, name: 'Benjamin Moore', role: 'Product Analyst', reports: [] }] })
data.team[1].name = 'Charlotte Davis (New)'
data.team[0].reports.splice(2, 1)
data.team[0].reports[1].name = 'James Miller (Updated)'
data.team[0].reports[2].name = 'Ava Johnson (Promoted)'
data.showSalary = false
data.showSalary = true
data.team[0].reports[2].active = false

console.log('Dashboard data:', data)

data.checkRendered = function() {
    const msgs = []
    msgs.push(document.body.textContent.includes('Sophie Turner (Team Lead)') ? 'Sophie rename OK' : 'Sophie rename missing')
    msgs.push(document.body.textContent.includes('Ava Johnson') ? 'Ava present' : 'Ava missing')
    msgs.push(document.body.textContent.includes('Charlotte Davis (New)') ? 'Charlotte present' : 'Charlotte missing')
    msgs.push(document.body.textContent.includes('Annual Salary') ? 'Salary visible' : 'Salary not visible')
    const ok = msgs.every(m => /present|OK|visible/.test(m))
    const msg = (ok ? 'All checks passed:\n' : 'Some checks failed:\n') + msgs.join('\n')
    console.log(msg)
    alert(msg)
}
