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
    data.categories[0].name = 'Electronics & Accessories'
    data.categories[0].products.push({ id: 103, name: 'USB-C Cable', stockStatus: 'in-stock' })
    data.categories[0].products.splice(1, 0, { id: 104, name: 'Laptop Stand', stockStatus: 'pre-order' })
    data.categories.splice(1, 0, { id: 3, name: 'Home & Garden', itemCount: 1, products: [{ id: 301, name: 'LED Desk Lamp', stockStatus: 'in-stock' }] })
    data.categories[0].products[2].stockStatus = 'out-of-stock'
    data.themeColor = '#dc2626'

    const themedNode = document.querySelector('#catalog-header')
    if (!themedNode || !themedNode.style.color || themedNode.style.color === 'rgb(37, 99, 235)') {
        throw new Error('Demo update not rendered (update themeColor): expected updated text color on catalog header block')
    }

    assertSelectorCount('#app > ul > li', 3, 'render all categories count')
    assertSelectorCount('#app > ul > li:nth-child(1) > ul > li', 4, 'render all products for category 1')
    assertSelectorCount('#app > ul > li:nth-child(2) > ul > li', 1, 'render all products for category 2')
    assertSelectorCount('#app > ul > li:nth-child(3) > ul > li', 1, 'render all products for category 3')

    assertSelectorContains('#app > ul > li:nth-child(1) > strong', 'Electronics & Accessories', 'render category 1')
    assertSelectorContains('#app > ul > li:nth-child(1) > ul > li:nth-child(1)', 'Wireless Headphones', 'render category 1 product 1')
    assertSelectorContains('#app > ul > li:nth-child(1) > ul > li:nth-child(2)', 'Laptop Stand', 'render category 1 product 2')
    assertSelectorContains('#app > ul > li:nth-child(1) > ul > li:nth-child(3)', 'Smart Watch', 'render category 1 product 3')
    assertSelectorContains('#app > ul > li:nth-child(1) > ul > li:nth-child(3)[stock-status="out-of-stock"]', 'Smart Watch', 'update stockStatus at categories.0.products.2')
    assertSelectorContains('#app > ul > li:nth-child(1) > ul > li:nth-child(4)', 'USB-C Cable', 'render category 1 product 4')

    assertSelectorContains('#app > ul > li:nth-child(2) > strong', 'Home & Garden', 'render category 2')
    assertSelectorContains('#app > ul > li:nth-child(2) > ul > li:nth-child(1)', 'LED Desk Lamp', 'render category 2 product 1')

    assertSelectorContains('#app > ul > li:nth-child(3) > strong', 'Books', 'render category 3')
    assertSelectorContains('#app > ul > li:nth-child(3) > ul > li:nth-child(1)', 'JavaScript Essentials', 'render category 3 product 1')

    console.log('Catalog data:', data)
}
