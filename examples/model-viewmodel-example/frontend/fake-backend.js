/**
 * Fake Backend - Simulates REST API in Browser
 * No server needed, all data stored in memory
 */

class FakeBackend {
    constructor() {
        this.todos = [
            { id: 1, text: 'Learn Template Engine', completed: false, createdAt: new Date('2025-12-15T10:00:00') },
            { id: 2, text: 'Build Model-ViewModel example', completed: true, createdAt: new Date('2025-12-15T11:00:00') },
            { id: 3, text: 'Deploy to production', completed: false, createdAt: new Date('2025-12-15T12:00:00') }
        ]
        this.nextId = 4
    }

    // GET /api/todos
    getTodos() {
        console.log('FakeBackend: GET /api/todos', this.todos)
        return [...this.todos]
    }

    // POST /api/todos
    createTodo(data) {
        if (!data.text || !data.text.trim()) {
            throw new Error('Todo text is required')
        }

        const newTodo = {
            id: this.nextId++,
            text: data.text,
            completed: false,
            createdAt: new Date()
        }
        
        this.todos.push(newTodo)
        console.log('FakeBackend: POST /api/todos', newTodo)
        return { ...newTodo }
    }

    // PUT /api/todos/:id
    updateTodo(id, updates) {
        const todo = this.todos.find(t => t.id === id)
        if (!todo) {
            throw new Error('Todo not found')
        }

        if (updates.text !== undefined) {
            todo.text = updates.text
        }
        if (updates.completed !== undefined) {
            todo.completed = updates.completed
        }

        console.log('FakeBackend: PUT /api/todos/' + id, todo)
        return { ...todo }
    }

    // DELETE /api/todos/:id
    deleteTodo(id) {
        const index = this.todos.findIndex(t => t.id === id)
        if (index === -1) {
            throw new Error('Todo not found')
        }

        this.todos.splice(index, 1)
        console.log('FakeBackend: DELETE /api/todos/' + id)
        return { success: true }
    }
}

// Export singleton instance
export const fakeBackend = new FakeBackend()
