import TemplateEngine from '../../src/template-engine.js'
import { removeByReference, getParentContext } from '../../src/array-helpers.js'

const data = TemplateEngine.reactive({
    name: 'Alex Johnson',
    folders: [{
        name: 'projects',
        size: 2,
        editing: false,
        childs: [{
            name: 'website',
            size: 0,
            editing: false,
            childs: []
        }, {
            name: 'mobile-app',
            size: 0,
            editing: false,
            childs: []
        }]
    }, {
        name: 'documents',
        size: 1,
        editing: false,
        childs: [{
            name: 'reports',
            size: 0,
            editing: false,
            childs: []
        }]
    }],
    toggleEdit: (e, dataElement) => {
        dataElement.editing = !dataElement.editing
    },
    delete: (e, dataElement, _, contextStack) => {
        const parentChilds = getParentContext(contextStack)?.data?.childs ?? data.folders
        removeByReference(parentChilds, dataElement)
    }
}, document.getElementById('app-template-use'))

// Demonstrate deep nesting and dynamic updates
data.folders[0].name = 'projects (active)'
data.folders[0].childs.push({ name: 'data-analysis', size: 0, editing: false, childs: [] })
data.folders[0].childs.push({ name: 'api-server', size: 1, editing: false, childs: [ { name: 'controllers', size: 1, editing: false, childs: [ { name: 'auth', size: 0, editing: false, childs: [] } ] } ] })
data.folders[0].childs.splice(1, 0, { name: 'tools', size: 0, editing: false, childs: [] })
data.folders.splice(1, 0, { name: 'downloads', size: 1, editing: false, childs: [{ name: 'archives', size: 0, editing: false, childs: [] }] })
data.folders[1].name = 'downloads (recent)'
data.folders[0].childs.splice(2, 1)
data.folders.pop()
data.folders[0].childs[1].name = 'scripts'
data.folders[0].childs[2].name = 'data-science'

console.log('File system data:', data)

data.checkRendered = function() {
    const msgs = []
    msgs.push(document.body.textContent.includes('projects (active)') ? 'Projects name OK' : 'Projects name missing')
    msgs.push(document.body.textContent.includes('data-analysis') ? 'data-analysis present' : 'data-analysis missing')
    msgs.push(document.body.textContent.includes('tools') ? 'tools present' : 'tools missing')
    msgs.push(document.body.textContent.includes('downloads') ? 'downloads present' : 'downloads missing')
    msgs.push(document.body.textContent.includes('scripts') ? 'scripts present' : 'scripts missing')
    const ok = msgs.every(m => /present|OK/.test(m))
    const msg = (ok ? 'All checks passed:\n' : 'Some checks failed:\n') + msgs.join('\n')
    console.log(msg)
    alert(msg)
}
