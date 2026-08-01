import TemplateEngine from '../../src/template-engine.js'

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

function assertSelectorHidden(selector, step) {
    const node = document.querySelector(selector)

    if (!node) {
        throw new Error(`Demo update not rendered (${step}): expected "${selector}" to exist and be hidden`)
    }

    const style = window.getComputedStyle(node)
    if (style.display !== 'none' && style.visibility !== 'hidden') {
        throw new Error(`Demo update not rendered (${step}): expected "${selector}" to be hidden`)
    }
}

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

        assertSelectorContains('#salary-row', 'Annual Salary', 'render salary row')

        assertSelectorCount('#team-list > li', 3, 'render all active team members count')
        assertSelectorCount('#team-list > li:nth-child(1) > div > ul > li', 4, 'render all reports for member 1 (including hidden)')
        assertSelectorCount('#team-list > li:nth-child(2) > div > ul > li', 1, 'render all reports for member 2')
        assertSelectorCount('#team-list > li:nth-child(3) > div > ul > li', 1, 'render all reports for member 3 (including hidden)')

        assertSelectorContains('#team-list > li:nth-child(1) > div', 'Sophie Turner (Team Lead)', 'render member 1')
        assertSelectorContains('#team-list > li:nth-child(1) > div > ul > li:nth-child(1) > div', 'Liam Chen', 'render member 1 report 1')
        assertSelectorContains('#team-list > li:nth-child(1) > div > ul > li:nth-child(2) > div', 'James Miller (Updated)', 'render member 1 report 2')
        assertSelectorContains('#team-list > li:nth-child(1) > div > ul > li:nth-child(4) > div', 'Ethan Brown', 'render member 1 report 4')
        assertSelectorContains('#team-list > li:nth-child(1) > div > ul > li:nth-child(4) > div > ul > li:nth-child(1) > div', 'Isabella Garcia', 'render nested report level 2')
        assertSelectorContains('#team-list > li:nth-child(1) > div > ul > li:nth-child(4) > div > ul > li:nth-child(1) > div > ul > li:nth-child(1) > div', 'Mason Lee', 'render nested report level 3')

        assertSelectorContains('#team-list > li:nth-child(2) > div', 'Charlotte Davis (New)', 'render member 2')
        assertSelectorContains('#team-list > li:nth-child(2) > div > ul > li:nth-child(1) > div', 'Benjamin Moore', 'render member 2 report 1')

        assertSelectorContains('#team-list > li:nth-child(3) > div', 'Noah Anderson', 'render member 3')
        assertSelectorHidden('#team-list > li:nth-child(3) > div > ul > li:nth-child(1)', 'hide inactive report for member 3')

        if (document.querySelector('#team-list').textContent.includes('Ava Johnson (Promoted)')) {
            throw new Error('Demo update not rendered (remove one report): expected Ava Johnson (Promoted) to be absent from #team-list')
        }

        if (document.querySelector('#team-list').textContent.includes('Olivia Martinez')) {
            throw new Error('Demo update not rendered (remove one report): expected Olivia Martinez to be absent from #team-list')
        }

        console.log('Dashboard data:', data)
    }
}, document.getElementById('app-template-use'))


