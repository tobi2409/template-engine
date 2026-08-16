import TemplateEngine from '../../src/template-engine.js'
import { runDemoUpdates } from './demo-updates.js'

let data = TemplateEngine.reactive({
    userName: 'Sarah Miller',
    folders: [
        { 
            id: 1, 
            name: 'components', 
            hasChildren: true, 
            expanded: false, 
            expandIcon: '▶', 
            children: [
                { id: 11, name: 'Header.jsx', hasChildren: false, expanded: false, expandIcon: ' ', children: [] },
                { id: 12, name: 'Footer.jsx', hasChildren: false, expanded: false, expandIcon: ' ', children: [] },
                { id: 13, name: 'main', hasChildren: true, expanded: false, expandIcon: '▶', children: [
                    { id: 131, name: 'Dashboard.jsx', hasChildren: false, expanded: false, expandIcon: ' ', children: [] }
                ] }
            ]
        },
        { 
            id: 2, 
            name: 'documents', 
            hasChildren: true, 
            expanded: false, 
            expandIcon: '▶', 
            children: [
                { id: 21, name: 'report.pdf', hasChildren: false, expanded: false, expandIcon: ' ', children: [] },
                { id: 22, name: 'notes.txt', hasChildren: false, expanded: false, expandIcon: ' ', children: [] }
            ]
        }
    ],

    expand(e, dataElement) {
        dataElement.expanded = !dataElement.expanded
    },
    
    runDemoUpdates() {
        runDemoUpdates(data)
    }
}, document.getElementById('app-template-use'))