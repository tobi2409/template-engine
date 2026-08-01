import TemplateEngine from '../../src/template-engine.js'
import { removeByReference, getParentContext } from '../../src/array-helpers.js'

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

const data = TemplateEngine.reactive({
    name: 'Alex Johnson',
    folders: [{
        id: 1,
        name: 'projects',
        size: 2,
        editing: false,
        children: [{
            id: 11,
            name: 'website',
            size: 0,
            editing: false,
            children: []
        }, {
            id: 12,
            name: 'mobile-app',
            size: 0,
            editing: false,
            children: []
        }]
    }, {
        id: 2,
        name: 'documents',
        size: 1,
        editing: false,
        children: [{
            id: 21,
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
    },

    runDemoUpdates: () => {
        data.folders[0].name = 'projects (active)'
        data.folders[0].children.push({ id: 13, name: 'data-analysis', size: 0, editing: false, children: [] })
        data.folders[0].children.push({ id: 14, name: 'api-server', size: 1, editing: false, children: [ { id: 141, name: 'controllers', size: 1, editing: false, children: [ { id: 1411, name: 'auth', size: 0, editing: false, children: [] } ] } ] })
        data.folders[0].children.splice(1, 0, { id: 15, name: 'tools', size: 0, editing: false, children: [] })
        data.folders.splice(1, 0, { id: 3, name: 'downloads', size: 1, editing: false, children: [{ id: 31, name: 'archives', size: 0, editing: false, children: [] }] })
        data.folders[1].name = 'downloads (recent)'

        data.folders[0].children.splice(2, 1)

        data.folders.pop()

        data.folders[0].children[1].name = 'scripts'
        data.folders[0].children[2].name = 'data-science'

        assertSelectorCount('#folder-tree > li', 2, 'render all root folders count')
        assertSelectorCount('#folder-tree > li:nth-child(1) > ul > li', 4, 'render all children for root folder 1')
        assertSelectorCount('#folder-tree > li:nth-child(2) > ul > li', 1, 'render all children for root folder 2')
        assertSelectorCount('#folder-tree > li:nth-child(1) > ul > li:nth-child(4) > ul > li', 1, 'render all nested children for root folder 1 child 4')
        assertSelectorCount('#folder-tree > li:nth-child(1) > ul > li:nth-child(4) > ul > li:nth-child(1) > ul > li', 1, 'render all nested grandchildren for root folder 1 child 4')

        assertSelectorContains('#folder-tree > li:nth-child(1)', 'projects (active)', 'render root folder 1')
        assertSelectorContains('#folder-tree > li:nth-child(1) > ul > li:nth-child(1)', 'website', 'render root folder 1 child 1')
        assertSelectorContains('#folder-tree > li:nth-child(1) > ul > li:nth-child(2)', 'scripts', 'render root folder 1 child 2')
        assertSelectorContains('#folder-tree > li:nth-child(1) > ul > li:nth-child(3)', 'data-science', 'render root folder 1 child 3')
        assertSelectorContains('#folder-tree > li:nth-child(1) > ul > li:nth-child(4)', 'api-server', 'render root folder 1 child 4')
        assertSelectorContains('#folder-tree > li:nth-child(1) > ul > li:nth-child(4) > ul > li:nth-child(1)', 'controllers', 'render nested folder level 2')
        assertSelectorContains('#folder-tree > li:nth-child(1) > ul > li:nth-child(4) > ul > li:nth-child(1) > ul > li:nth-child(1)', 'auth', 'render nested folder level 3')

        assertSelectorContains('#folder-tree > li:nth-child(2)', 'downloads (recent)', 'render root folder 2')
        assertSelectorContains('#folder-tree > li:nth-child(2) > ul > li:nth-child(1)', 'archives', 'render root folder 2 child 1')

        const firstFolderChildren = document.querySelector('#folder-tree > li:nth-child(1) > ul')
        if (firstFolderChildren && firstFolderChildren.textContent.includes('mobile-app')) {
            throw new Error('Demo update not rendered (remove child folder): expected mobile-app to be absent in first folder children list')
        }

        const folderTree = document.querySelector('#folder-tree')
        if (folderTree && folderTree.textContent.includes('documents')) {
            throw new Error('Demo update not rendered (pop last folder): expected documents to be absent from #folder-tree')
        }

        console.log('File system data:', data)
    }
}, document.getElementById('app-template-use'))


