import TemplateEngine from '../../src/template-engine.js'
import { runDemoUpdates } from './demo-updates.js'

const data = TemplateEngine.reactive({
    name: 'Emily Rodriguez',
    themeColor: '#2563eb',
    emphasisWeight: 'bold',
    categories: [{
        id: 1,
        name: 'Electronics',
        itemCount: 2,
        products: [{
            id: 101,
            name: 'Wireless Headphones',
            stockStatus: 'in-stock'
        }, {
            id: 102,
            name: 'Smart Watch',
            stockStatus: 'in-stock'
        }]
    }, {
        id: 2,
        name: 'Books',
        itemCount: 1,
        products: [{
            id: 201,
            name: 'JavaScript Essentials',
            stockStatus: 'low-stock'
        }]
    }],

    runDemoUpdates: function () {
        runDemoUpdates(data)
    },
}, document.getElementById('app-template-use'))
