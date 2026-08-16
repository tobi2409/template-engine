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

export function runDemoUpdates(data) {
    data.folders[0].expanded = true
    data.folders[1].expanded = true
    data.folders[0].children.splice(1, 1)
    data.folders[1].children.splice(1, 0, { id: 23, name: 'summary.docx', hasChildren: false, expanded: false, expandIcon: ' ', children: [] })

    assertSelectorCount('#lazy-folder-tree > li', 2, 'render all root folders count')
    assertSelectorCount('#lazy-folder-tree > li:nth-child(1) > li > ul > li', 2, 'render all children for folder 1')
    assertSelectorCount('#lazy-folder-tree > li:nth-child(2) > li > ul > li', 3, 'render all children for folder 2')

    assertSelectorContains('#lazy-folder-tree > li:nth-child(1) > .folder', 'components', 'render root folder 1')
    assertSelectorContains('#lazy-folder-tree > li:nth-child(1) > li > ul > li:nth-child(1) > .folder', 'Header.jsx', 'render folder 1 child 1')
    assertSelectorContains('#lazy-folder-tree > li:nth-child(1) > li > ul > li:nth-child(2) > .folder', 'main', 'render folder 1 child 2')

    assertSelectorContains('#lazy-folder-tree > li:nth-child(2) > .folder', 'documents', 'render root folder 2')
    assertSelectorContains('#lazy-folder-tree > li:nth-child(2) > li > ul > li:nth-child(1) > .folder', 'report.pdf', 'render folder 2 child 1')
    assertSelectorContains('#lazy-folder-tree > li:nth-child(2) > li > ul > li:nth-child(2) > .folder', 'summary.docx', 'render folder 2 child 2')
    assertSelectorContains('#lazy-folder-tree > li:nth-child(2) > li > ul > li:nth-child(3) > .folder', 'notes.txt', 'render folder 2 child 3')

    const firstFolderNode = document.querySelector('#lazy-folder-tree > li:nth-child(1)')
    if (firstFolderNode && firstFolderNode.textContent.includes('Footer.jsx')) {
        throw new Error('Demo update not rendered (remove child from first folder): expected Footer.jsx to be absent')
    }
}
