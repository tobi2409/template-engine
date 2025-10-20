// TODOs:
// nodeHolder.node muss bei einem Listenelement darstellen, ob etwas erstellt, geupdatet oder gelöscht wurde (bei Zuweisung eines neuen Arrays -> komplett neurendern)
// ifTag-Handler braucht noch context
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

function resolveRelativeKey(key, data, context = new Map()) {
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
    return isFirstContext ? `${context.get(splitted[0]).of}.${index}.${splitted.slice(1).join('.')}` : relativeKey
}

function interpolateText(node, data, context = new Map(), index = -1) {
    if (node.nodeType !== Node.TEXT_NODE
        && !(node.tagName === 'SPAN' && node.dataset.template)
    ) {
        return
    }

    const regex = /\{\{\s*([\w.-]+)\s*\}\}/g

    // im Falle dass es ein Span ist, ist sein textContent bereits interpoliert -> template-Sicherung verwenden
    // bei einem noch nicht gewrappten Text wird einfach sein textContent genommen, da dieser noch ein Template ist
    const template = node.nodeType === Node.TEXT_NODE ? node.textContent : node.dataset.template

    if (regex.test(template)) {
        // Text wird in ein Span gewrappt, damit dort im Dataset das Template gesichert werden kann
        // ist es bereits ein Span, wird das wiederverwendet und sein Text anhand seines Templates ersetzt

        let wrappedText = node

        if (wrappedText.tagName !== 'SPAN') {
            wrappedText = document.createElement('span')
            node.replaceWith(wrappedText)

            wrappedText.dataset.template = template
        }
        
        let key = ''
        wrappedText.innerText = template
                                .replace(/(\r\n|\n|\r)/gm, '')
                                .replace(regex, (_, key) => {
                                    const _context = new Map()
                                    
                                    // Kopie, sonst wird auf überschriebenen Context-Key zugegriffen
                                    for (const [key, value] of context.entries()) {
                                        _context.set(key, value)
                                    }

                                    nodeHoldersByKeys.appendToKey(convertToFullKey(key, _context, index), { node: wrappedText, context: _context })
                                    return resolveRelativeKey(key, data, _context)
                                })
    }
}

function handleIfTag(node, data) {
    if (!node.hasAttribute('test')) {
        console.error('if-Tag requires test-Attribute')
        return
    }

    // da if-Tag sowieso keinen Einfluss auf die Darstellung hat,
    // kann display im positiven Testfall auch leer bleiben
    const conditionKey = node.getAttribute('test')
    //console.log(conditionKey)
    nodeHoldersByKeys.appendToKey(conditionKey, { node: node, context: {} })

    const conditionValue = data[conditionKey]
    node.style.display = conditionValue ? '' : 'none'

    if (conditionValue) {
        render(data, node)
    }
}

function handleEachTag(node, data, context = new Map(), index = -1) {
    const ofAttribute = node.getAttribute('of')
    const asAttribute = node.getAttribute('as')

    node.style.display = 'none'

    const items = resolveRelativeKey(ofAttribute, data, context)

    if (!items instanceof Array) {
        console.error('each-of must be an Array')
        return
    }

    for (let i = 0 ; i < items.length ; i++) {
        d = items[i]
        
        context.set(asAttribute, { data: d, of: ofAttribute })

        for (const c of node.childNodes) {
            const cloned = c.cloneNode(true)
            render(data, cloned, context, i)
            node.parentNode.insertBefore(cloned, node)
        }
    }
}

function handleDefaultTag(node, data, context = new Map(), index = -1) {
    interpolateText(node, data, context, index)
    render(data, node, context, index)
}

function renderChildNodes(data, childNodes, context = new Map(), index = -1) {
    // childNodes beinhaltet im Gegensatz zu children auch Text-Nodes
    const _childNodes = Array.from(childNodes)

    for (const c of _childNodes) {
        //console.log(c)
        switch (c.tagName) {
            case 'IF':
                handleIfTag(c, data)
                break
            case 'EACH':
                handleEachTag(c, data, context, index)
                break
            default:
                handleDefaultTag(c, data, context, index)
                break
        }
    }
}

// für Root-Node
function render(data, node, context = new Map(), index = -1) {
    renderChildNodes(data, node.childNodes, context, index)
}

function refresh(data, changes) {
    for (const ch of changes) {
        const linkedNodeHolders = nodeHoldersByKeys.get(ch)

        for (const n of linkedNodeHolders) {
            //console.log(n.node)
            renderChildNodes(data, [n.node], n.context)
        }
    }
}