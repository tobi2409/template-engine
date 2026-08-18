import TemplateEngine from '../../src/template-engine.js'

const data = TemplateEngine.reactive({
    fruits: [
        { name: 'Apple' },
        { name: 'Banana' },
        { name: 'Cherry' }
    ],
    colors: [
        { name: 'Red' },
        { name: 'Green' },
        { name: 'Blue' }
    ],

    renameFruitFirst:  (e, d) => { d.fruits[0].name = 'Apple ✎' },
    renameFruitLast:   (e, d) => { d.fruits[d.fruits.length - 1].name = 'Last fruit ✎' },
    addFruit:          (e, d) => { d.fruits.push({ name: 'Grape' }) },
    removeFruitFirst:  (e, d) => { d.fruits.shift() },

    renameColorFirst:  (e, d) => { d.colors[0].name = 'Red ✎' },
    renameColorLast:   (e, d) => { d.colors[d.colors.length - 1].name = 'Last color ✎' },
    addColor:          (e, d) => { d.colors.push({ name: 'Yellow' }) },
    removeColorFirst:  (e, d) => { d.colors.shift() },
}, document.getElementById('tpl-use'))



