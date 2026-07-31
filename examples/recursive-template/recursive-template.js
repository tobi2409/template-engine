import TemplateEngine from '../../src/template-engine.js'
import { removeByReference, getParentContext } from '../../src/array-helpers.js'

const data = TemplateEngine.reactive({
    name: 'Alex Johnson',
    folders: [{
        name: 'projects',
        size: 2,
        editing: false,
        children: [{
            name: 'website',
            size: 0,
            editing: false,
            children: []
        }, {
            name: 'mobile-app',
            size: 0,
            editing: false,
            children: []
        }]
    }, {
        name: 'documents',
        size: 1,
        editing: false,
        children: [{
            name: 'reports',
            size: 0,
            editing: false,
            children: []
        }]
    }],
    toggleEdit: (e, dataElement) => {
        dataElement.editing = !dataElement.editing
    },
    delete: (e, dataElement, _, contextStack) => {
        const parentChildren = getParentContext(contextStack)?.data?.children ?? data.folders
        removeByReference(parentChildren, dataElement)
    }
}, document.getElementById('app-template-use'))

// Demonstrate deep nesting and dynamic updates
data.folders[0].name = 'projects (active)'
data.folders[0].children.push({ name: 'data-analysis', size: 0, editing: false, children: [] })
data.folders[0].children.push({ name: 'api-server', size: 1, editing: false, children: [ { name: 'controllers', size: 1, editing: false, children: [ { name: 'auth', size: 0, editing: false, children: [] } ] } ] })
data.folders[0].children.splice(1, 0, { name: 'tools', size: 0, editing: false, children: [] })
data.folders.splice(1, 0, { name: 'downloads', size: 1, editing: false, children: [{ name: 'archives', size: 0, editing: false, children: [] }] })
data.folders[1].name = 'downloads (recent)'
data.folders[0].children.splice(2, 1)
data.folders.pop()
data.folders[0].children[1].name = 'scripts'
data.folders[0].children[2].name = 'data-science'

console.log('File system data:', data)


