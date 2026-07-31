import TemplateEngine from '../../src/template-engine.js'

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
    }
}, document.getElementById('app-template-use'))

data.folders[0].children.splice(1, 1)
data.folders[1].children.splice(1, 0, { id: 23, name: 'summary.docx', hasChildren: false, expanded: false, expandIcon: ' ', children: [] })