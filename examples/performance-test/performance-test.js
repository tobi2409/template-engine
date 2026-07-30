import TemplateEngine from '../../src/template-engine.js'

const N = 100000
const UPDATE_COUNT = Math.floor(N / 2)
const ADD_COUNT = Math.floor(N / 2)
const INSERT_COUNT = Math.floor(N / 4)

const mount = document.getElementById('app-template-use')
let model

function measureAfterCommit(label, mutate) {
    const start = performance.now()
    mutate()
    queueMicrotask(() => {
        requestAnimationFrame(() => {
            const duration = performance.now() - start
            console.log(`${label}: ${duration.toFixed(2)} ms (commit + paint)`)
        })
    })
}

measureAfterCommit(`Initial Render (${N} Items)`, () => {
    const items = Array.from({ length: N }, (_, i) => ({
        id: i + 1,
        name: 'Item ' + (i + 1),
        value: i + 1
    }))

    model = TemplateEngine.reactive({ items }, mount)
})

document.getElementById('verify-rendered').addEventListener('click', () => {
    const domCount = document.querySelectorAll('.item').length
    const modelCount = model.items.length
    const msg = `DOM items: ${domCount} / model.items: ${modelCount}`
    console.log(msg)
    alert(msg)
})

setTimeout(() => {
    measureAfterCommit(`Update ${UPDATE_COUNT} Items`, () => {
        for (let i = 0; i < UPDATE_COUNT; i++) {
            const idx = Math.floor(Math.random() * N)
            model.items[idx].value = Math.floor(Math.random() * 1000)
        }
    })
}, 2000)

setTimeout(() => {
    measureAfterCommit(`Add ${ADD_COUNT} Items`, () => {
        const items = Array.from({ length: ADD_COUNT }, (_, i) => ({
            id: model.items.length + i + 1,
            name: 'Item ' + (model.items.length + i + 1),
            value: Math.floor(Math.random() * 1000)
        }))

        model.items.push(...items)
    })
}, 4000)

setTimeout(() => {
    measureAfterCommit(`Insert ${INSERT_COUNT} Items`, () => {
        const items = Array.from({ length: INSERT_COUNT }, (_, i) => ({
            id: model.items.length + i + 1,
            name: 'Item ' + (model.items.length + i + 1),
            value: Math.floor(Math.random() * 1000)
        }))

        model.items.splice(1000, 0, ...items)
    })
}, 6000)
