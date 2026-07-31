import TemplateEngine from '../../src/template-engine.js'

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

    
}, document.getElementById('app-template-use'))

// Demo dynamic updates
data.categories[0].name = 'Electronics & Accessories'
data.categories[0].products.push({ id: 103, name: 'USB-C Cable', stockStatus: 'in-stock' })
data.categories[0].products.splice(1, 0, { id: 104, name: 'Laptop Stand', stockStatus: 'pre-order' })
data.categories.splice(1, 0, { id: 3, name: 'Home & Garden', itemCount: 1, products: [{ id: 301, name: 'LED Desk Lamp', stockStatus: 'in-stock' }] })
data.categories[0].products[2].stockStatus = 'out-of-stock'
data.themeColor = '#dc2626'

console.log('Catalog data:', data)
