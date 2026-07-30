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

    checkRendered: function() {
        const messages = []

        const catStrong = document.querySelector('li[category-id="1"] strong')
        if (catStrong && catStrong.textContent.trim() === 'Electronics & Accessories') {
            messages.push('Category name OK')
        } else {
            messages.push('Category name incorrect or missing: ' + (catStrong ? catStrong.textContent.trim() : '<missing>'))
        }

        const prod103 = document.querySelector('li[product-id="103"]')
        messages.push(prod103 ? 'Product 103 present' : 'Product 103 missing')

        const prod104 = document.querySelector('li[product-id="104"]')
        messages.push(prod104 ? 'Product 104 present' : 'Product 104 missing')

        const prod103Node = prod103
        const stock = prod103Node ? prod103Node.getAttribute('stock-status') : null
        messages.push(stock === 'out-of-stock' ? 'Stock status updated OK' : `Stock status not updated: ${stock}`)

        const colorDiv = Array.from(document.querySelectorAll('div')).find(d => d.getAttribute('style') && d.getAttribute('style').includes('#dc2626'))
        messages.push(colorDiv ? 'Theme color OK' : 'Theme color not applied')

        const ok = messages.every(m => m.includes('OK') || m.includes('present'))
        const msg = (ok ? 'All checks passed:\n' : 'Some checks failed:\n') + messages.join('\n')
        console.log(msg)
        alert(msg)
    }
}, document.getElementById('app-template-use'))

// Demo dynamic updates
data.categories[0].name = 'Electronics & Accessories'
data.categories[0].products.push({ id: 103, name: 'USB-C Cable', stockStatus: 'in-stock' })
data.categories[0].products.splice(1, 0, { id: 104, name: 'Laptop Stand', stockStatus: 'pre-order' })
data.categories.splice(1, 0, { id: 3, name: 'Home & Garden', itemCount: 1, products: [{ id: 301, name: 'LED Desk Lamp', stockStatus: 'in-stock' }] })
data.categories[0].products[2].stockStatus = 'out-of-stock'
data.themeColor = '#dc2626'

console.log('Catalog data:', data)
