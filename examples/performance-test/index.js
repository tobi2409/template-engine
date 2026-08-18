import TemplateEngine from '../../src/template-engine.js'

const N = 100000
const UPDATE_COUNT = Math.floor(N / 2)
const ADD_COUNT = Math.floor(N / 2)
const INSERT_COUNT = Math.floor(N / 4)

const mount = document.getElementById('app-template-use')
let model

function createItems(count, startId = 1) {
    return Array.from({ length: count }, (_, i) => ({
        id: startId + i,
        name: 'Item ' + (startId + i),
        value: startId + i
    }))
}

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

model = TemplateEngine.reactive({
    items: [],
    benchmarkStarted: false,
    runBenchmark() {
        if (model.benchmarkStarted) {
            console.log('Benchmark already running or completed.')
            return
        }

        model.benchmarkStarted = true

        measureAfterCommit(`Initial Render (${N} Items)`, () => {
            model.items.push(...createItems(N, 1))
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
                const items = createItems(ADD_COUNT, model.items.length + 1)
                model.items.push(...items)
            })
        }, 4000)

        setTimeout(() => {
            measureAfterCommit(`Insert ${INSERT_COUNT} Items`, () => {
                const items = createItems(INSERT_COUNT, model.items.length + 1)
                model.items.splice(1000, 0, ...items)
            })
        }, 6000)
    }
}, mount)
