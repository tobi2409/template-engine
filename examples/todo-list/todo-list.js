import TemplateEngine from '../../src/template-engine.js'
import { removeByReference } from '../../src/array-helpers.js'

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
    todos: [
        { id: 1, name: 'Review pull requests', showEdit: false },
        { id: 2, name: 'Update documentation', showEdit: false },
        { id: 3, name: 'Fix responsive layout', showEdit: false }
    ],
    newTodo: '',
    
    add: function() {
        if (data.newTodo.trim()) {
            data.todos.push({ id: data.todos.length + 1, name: data.newTodo, showEdit: false })
            data.newTodo = ''
        }
    },

    edit: function(e, dataElement) {
        dataElement.showEdit = !dataElement.showEdit
    },

    deleteTodo: function(e, dataElement) {
        removeByReference(data.todos, dataElement)
    },

    runDemoUpdates: function() {
        data.todos.push({ id: 4, name: 'Plan team meeting', showEdit: false })
        data.todos.splice(1, 1)

        assertSelectorCount('#todo-list > li', 3, 'render all todos count')

        assertSelectorContains('#todo-list > li:nth-child(1)', 'Review pull requests', 'render todo 1')
        assertSelectorContains('#todo-list > li:nth-child(2)', 'Fix responsive layout', 'render todo 2')
        assertSelectorContains('#todo-list > li:nth-child(3)', 'Plan team meeting', 'render todo 3')

        const todoList = document.querySelector('#todo-list')
        if (todoList && todoList.textContent.includes('Update documentation')) {
            throw new Error('Demo update not rendered (remove second todo): expected Update documentation to be absent from #todo-list')
        }
    }
}, document.getElementById('app-template-use'))


