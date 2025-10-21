// TODOs:
// nodeHolder.node muss bei einem Listenelement darstellen, ob etwas erstellt, geupdatet oder gelöscht wurde (bei Zuweisung eines neuen Arrays -> komplett neurendern)
// Proxy

// in dieser Map befinden sich nur
// TextNodes (mglw. im span umrahmt) und if-Tags,
// sodass die Childs dazu "kontrolliert" enthalten sind
// das jeweilige Node ist allerdings noch in einem Objekt gekapselt für weitere Informationen
const nodeHoldersByKeys = new Map()

nodeHoldersByKeys.appendToKey = function(key, nodeHolder) {
    if (!nodeHoldersByKeys.has(key)) {
        nodeHoldersByKeys.set(key, [])
    }

    const nodeHoldersByKey = nodeHoldersByKeys.get(key)

    if (!nodeHoldersByKey.some(e => e.node === nodeHolder.node)) {
        nodeHoldersByKey.push(nodeHolder)
    }
}

function resolveKey(key, data, context = new Map()) {
    const splitted = key.split('.')
    const isFirstContext = context.has(splitted[0])
    const rootKey = isFirstContext ? context.get(splitted[0]).data : data
    const startIndex = isFirstContext ? 1 : 0
    
    let value = rootKey

    for (let i = startIndex ; i < splitted.length ; i++) {
        value = value[splitted[i]]
    }

    return value
}

function convertToFullKey(relativeKey, context, indexStack) {
    const splitted = relativeKey.split('.')
    const isFirstContext = context.has(splitted[0])

    if (!isFirstContext) {
        return relativeKey
    }

    return convertToFullKey(`${context.get(splitted[0]).of}.${indexStack[indexStack.length - 1]}${splitted.length > 1 ? '.':''}${splitted.slice(1).join('.')}`,
                            context, indexStack.slice(0, indexStack.length - 1))
}

function interpolateText(node, data, context = new Map(), indexStack = [], toFullKeyTemplate = false) {
    if (node.nodeType !== Node.TEXT_NODE
        && !(node.tagName === 'SPAN' && node.dataset.template)
    ) {
        return
    }

    const regex = /\{\{\s*([\w.-]+)\s*\}\}/g

    // im Falle dass es ein Span ist, ist sein textContent bereits interpoliert -> template-Sicherung verwenden
    // bei einem noch nicht gewrappten Text wird einfach sein textContent genommen, da dieser noch ein Template ist
    let template = node.nodeType === Node.TEXT_NODE ? node.textContent : node.dataset.template

    if (regex.test(template)) {
        if (toFullKeyTemplate) {
            // wird nur beim ersten Rendern durchgeführt, weil danach bereits Full-Key im Template Bestand hat
            template = template.replace(regex, (_, key) => {
                return `{{ ${convertToFullKey(key, context, indexStack)} }}`
            })
        }

        // Text wird in ein Span gewrappt, damit dort im Dataset das Template gesichert werden kann
        // ist es bereits ein Span, wird das wiederverwendet und sein Text anhand seines Templates ersetzt

        let wrappedText = node

        if (wrappedText.tagName !== 'SPAN') {
            wrappedText = document.createElement('span')
            node.replaceWith(wrappedText)

            wrappedText.dataset.template = template
        }
        
        wrappedText.innerText = template
                                .replace(/(\r\n|\n|\r)/gm, '')
                                .replace(regex, (_, key) => {
                                    nodeHoldersByKeys.appendToKey(key, { node: wrappedText, context: context })
                                    return resolveKey(key, data, context)
                                })
    }
}

function handleIfTag(node, data, context = new Map(), indexStack = [], toFullKeyTemplate = false, refreshMode = false) {
    if (!node.hasAttribute('test')) {
        console.error('if-Tag requires test-Attribute')
        return
    }

    // da if-Tag sowieso keinen Einfluss auf die Darstellung hat,
    // kann display im positiven Testfall auch leer bleiben
    const conditionKey = node.getAttribute('test')

    nodeHoldersByKeys.appendToKey(conditionKey, { node: node, context: context })

    const conditionValue = data[conditionKey]
    node.style.display = conditionValue ? '' : 'none'

    if (conditionValue) {
        renderNodes(data, node.childNodes, context, indexStack, toFullKeyTemplate, refreshMode)
    }
}

function handleEachTag(node, data, context = new Map(), indexStack = [], refreshMode = false) {
    if (refreshMode) {
        return
    }

    const ofAttribute = node.getAttribute('of')
    const asAttribute = node.getAttribute('as')

    node.style.display = 'none'

    const items = resolveKey(ofAttribute, data, context)

    if (!(items instanceof Array)) {
        console.error('each-of must be an Array')
        return
    }

    indexStack.push(0)

    for (let i = 0 ; i < items.length ; i++) {
        d = items[i]
        
        context.set(asAttribute, { data: d, of: ofAttribute })

        indexStack.pop()
        indexStack.push(i)

        for (const c of node.childNodes) {
            const cloned = c.cloneNode(true)
            render(data, cloned, context, indexStack, true, refreshMode)
            node.parentNode.insertBefore(cloned, node)
        }
    }

    // bei each findet keine Aufführung in nodeHoldersByKeys statt,
    // da beim Refresh auf die zuvor bereits gerenderten each-Child-Elemente zurückgegriffen wird
}

function handleDefaultTag(node, data, context = new Map(), indexStack = [], toFullKeyTemplate = false, refreshMode = false) {
    interpolateText(node, data, context, indexStack, toFullKeyTemplate)
    renderNodes(data, node.childNodes, context, indexStack, toFullKeyTemplate, refreshMode)
}

function renderNodes(data, nodes, context = new Map(), indexStack = [], toFullKeyTemplate = false, refreshMode = false) {
    // childNodes beinhaltet im Gegensatz zu children auch Text-Nodes
    const _nodes = Array.from(nodes)

    const _context = new Map()

    for (const [key, value] of context.entries()) {
        _context.set(key, value)
    }

    const _indexStack = Array.from(indexStack)

    for (const n of _nodes) {
        switch (n.tagName) {
            case 'IF':
                handleIfTag(n, data, _context, _indexStack, toFullKeyTemplate, refreshMode)
                break
            case 'EACH':
                handleEachTag(n, data, _context, _indexStack, refreshMode)
                break
            default:
                handleDefaultTag(n, data, _context, _indexStack, toFullKeyTemplate, refreshMode)
                break
        }
    }
}

// für Root-Node
function render(data, node, context = new Map(), indexStack = [], toFullKeyTemplate = false, refreshMode = false) {
    renderNodes(data, [node], context, indexStack, toFullKeyTemplate, refreshMode)
}

// beim Refreshen kann der IndexStack leer sein,
// weil beim ersten Rendern wurden schon die relativen Keys
// innerhalb des Templates mithilfe des Indexstacks konvertiert
// IndexStack ist dadurch also hier nicht mehr nötig
// gleiches gilt für Context
function refresh(data, changes) {
    for (const ch of changes) {
        const linkedNodeHolders = nodeHoldersByKeys.get(ch)

        for (const n of linkedNodeHolders) {
            renderNodes(data, [n.node], [], [], false, true)
        }
    }
}