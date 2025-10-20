// TODOs:
// nodeHolder.node muss bei einem Listenelement darstellen, ob etwas erstellt, geupdatet oder gelöscht wurde (bei Zuweisung eines neuen Arrays -> komplett neurendern)
// bei nodeHoldersByKeys liegen noch Keys mit Kontext drin
// ifTag-Handler braucht noch context
// if im each funktioniert nicht
// beim Refresh könnten bei einem each innerhalb eines if Probleme auftreten
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

function convertToFullKey(relativeKey, context, index) {
    const splitted = relativeKey.split('.')
    const isFirstContext = context.has(splitted[0])

    if (!isFirstContext) {
        return relativeKey
    }

    const r = convertToFullKey(`${context.get(splitted[0]).of}.${index}${splitted.length > 1 ? '.':''}${splitted.slice(1).join('.')}`, context, index)
    return r
}

function interpolateText(node, data, context = new Map(), index = -1, toFullKeyTemplate = false) {
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
            template = template.replace(regex, (_, key) => {
                return `{{ ${convertToFullKey(key, context, index)} }}`
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

function handleIfTag(node, data, context = new Map(), index = -1, toFullKeyTemplate = false, refreshMode = false) {
    if (!node.hasAttribute('test')) {
        console.error('if-Tag requires test-Attribute')
        return
    }

    // da if-Tag sowieso keinen Einfluss auf die Darstellung hat,
    // kann display im positiven Testfall auch leer bleiben
    const conditionKey = node.getAttribute('test')
    //console.log(conditionKey)

    /*const _context = new Map()

    for (const [key, value] of context.entries()) {
        _context.set(key, value)
    }*/

    nodeHoldersByKeys.appendToKey(conditionKey, { node: node, context: context })

    const conditionValue = data[conditionKey]
    node.style.display = conditionValue ? '' : 'none'

    if (conditionValue) {
        renderNodes(data, node.childNodes, context, index, toFullKeyTemplate, refreshMode)
    }
}

function handleEachTag(node, data, context = new Map(), index = -1, toFullKeyTemplate = false, refreshMode = false) {
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

    for (let i = 0 ; i < items.length ; i++) {
        d = items[i]
        
        context.set(asAttribute, { data: d, of: ofAttribute })

        for (const c of node.childNodes) {
            const cloned = c.cloneNode(true)
            render(data, cloned, context, i, true, refreshMode)
            node.parentNode.insertBefore(cloned, node)
        }
    }

    // bei each findet keine Aufführung in nodeHoldersByKeys statt,
    // da beim Refresh auf die zuvor bereits gerenderten each-Child-Elemente zurückgegriffen wird
}

function handleDefaultTag(node, data, context = new Map(), index = -1, toFullKeyTemplate = false, refreshMode = false) {
    interpolateText(node, data, context, index, toFullKeyTemplate)
    renderNodes(data, node.childNodes, context, index, toFullKeyTemplate, refreshMode)
}

function renderNodes(data, nodes, context = new Map(), index = -1, toFullKeyTemplate = false, refreshMode = false) {
    // childNodes beinhaltet im Gegensatz zu children auch Text-Nodes
    const _nodes = Array.from(nodes)

    const _context = new Map()

    for (const [key, value] of context.entries()) {
        _context.set(key, value)
    }

    for (const n of _nodes) {
        //console.log(c)
        switch (n.tagName) {
            case 'IF':
                handleIfTag(n, data, _context, index, toFullKeyTemplate, refreshMode)
                break
            case 'EACH':
                handleEachTag(n, data, _context, index, toFullKeyTemplate, refreshMode)
                break
            default:
                handleDefaultTag(n, data, _context, index, toFullKeyTemplate, refreshMode)
                break
        }
    }
}

// für Root-Node
function render(data, node, context = new Map(), index = -1, toFullKeyTemplate = false, refreshMode = false) {
    renderNodes(data, [node], context, index, toFullKeyTemplate, refreshMode)
}

function refresh(data, changes) {
    for (const ch of changes) {
        const linkedNodeHolders = nodeHoldersByKeys.get(ch)

        for (const n of linkedNodeHolders) {
            //console.log(n.node)
            renderNodes(data, [n.node], n.context, -1, false, true)
        }
    }
}