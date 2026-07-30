import TemplateEngine from '../../src/template-engine.js'
import { removeByReference } from '../../src/array-helpers.js'

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
    }
}, document.getElementById('app-template-use'))

data.todos.push({ id: 4, name: 'Plan team meeting', showEdit: false })
data.todos.splice(1, 1)

data.checkRendered = function() {
    const msgs = []
    msgs.push(document.body.textContent.includes('Plan team meeting') ? 'Plan team meeting present' : 'Plan team meeting missing')
    const liCount = document.querySelectorAll('ul > li').length
    msgs.push(`DOM todo count: ${liCount}, data.todos.length: ${data.todos.length}`)
    const ok = msgs[0].includes('present')
    const msg = (ok ? 'Check passed:\n' : 'Check failed:\n') + msgs.join('\n')
    console.log(msg)
    alert(msg)
}
