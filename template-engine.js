// TODOs:
// nodeHolder.node muss bei einem Listenelement darstellen, ob etwas erstellt, geupdatet oder gelöscht wurde (bei Zuweisung eines neuen Arrays -> komplett neurendern)
// ifHandler braucht noch Full-Key
// Proxy
// Kommentare verbessern

// In dieser Map befinden sich
// TextNodes (mglw. im span umrahmt), if-Tags ,
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

function convertToFullKey(relativeKey, context = new Map(), indexStack = []) {
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
                                    //TODO: überprüfen, ob key ein Array ist (wenn nein, dann nodeHolder)
                                    const interpolatedText = resolveKey(key, data, context)

                                    //console.log(interpolatedText)
                                    //if (interpolatedText instanceof String) {
                                        nodeHoldersByKeys.appendToKey(key, { node: wrappedText, updateHandler: 'interpolate', context: context })
                                    //}

                                    return interpolatedText
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

    nodeHoldersByKeys.appendToKey(conditionKey, { node: node, updateHandler: 'handleIfTag', context: context })

    const conditionValue = data[conditionKey]
    node.style.display = conditionValue ? '' : 'none'

    if (conditionValue) {
        renderNodes(data, node.childNodes, context, indexStack, toFullKeyTemplate, refreshMode)
    }
}

function handleEachTag(node, data, context = new Map(), indexStack = [], refreshMode = false, pushMode = false, customItems = [], customStartIndex = 0) {
    if (refreshMode && !(pushMode)) {
        return
    }

    const ofAttribute = node.getAttribute('of')
    const asAttribute = node.getAttribute('as')

    node.style.display = 'none'

    const items = pushMode ? customItems : resolveKey(ofAttribute, data, context)

    if (items.constructor.name !== 'Array') {
        console.error('each-of must be an Array')
        return
    }

    // oldContext und oldIndexStack werden für den NodeHolder gesetzt
    // dieser NodeHolder gilt für das Array
    // oldContext und oldIndexStack stellen den Stand vor dem Child-Iterieren dar
    // sodass ein array.push beim Refresh eine Orientierung hat,
    // in welchem Parent das Push erfolgen soll
    const oldContext = new Map()
    
    for (const [key, value] of context.entries()) {
        oldContext.set(key, value)
    }
    
    const oldIndexStack = Array.from(indexStack)
    
    indexStack.push(pushMode ? customStartIndex : 0)

    const fullKey = convertToFullKey(ofAttribute, oldContext, oldIndexStack)
    
    for (let i = 0 ; i < items.length ; i++) {
        d = items[i]
        
        context.set(asAttribute, { data: d, of: ofAttribute })

        indexStack.pop()

        const index = pushMode ? customStartIndex + i : i
        indexStack.push(index)

        for (const c of node.childNodes) {
            const cloned = c.cloneNode(true)
            render(data, cloned, context, indexStack, true, refreshMode)
            node.parentNode.insertBefore(cloned, node)
            
            const value = resolveKey(`${fullKey}.${index}`, data, context)
            if (typeof value !== 'string') {
                nodeHoldersByKeys.appendToKey(`${fullKey}.${index}`, { node: cloned, updateHandler: 'set' }) //TODO
            }
        }
    }

    // dieser NodeHolder-Eintrag ist für Listenaktionen relevant
    // man gibt den Context, IndexStack auf dem Stand vor der Iteration mit
    // vor der Iteration, weil der Child-Context nicht hier rein gehört
    // wenn man also ein Child c für eine Person p hinzufügen will,
    // dann muss man die jeweilige p kennen (Context)
    if (!pushMode) {
        nodeHoldersByKeys.appendToKey(fullKey, { node: node, updateHandler: 'set', context: oldContext, indexStack: oldIndexStack })
    }
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

    function createItem(ch) {
        const linkedNodeHolders = nodeHoldersByKeys.get(ch.key)

        for (const n of linkedNodeHolders) {
            const items = resolveKey(ch.key, data)
            //TODO: man kann auch mehrere Elemente pushen
            const pushedItem = items[items.length - 1] // beim Pushen braucht man das letzte Element der Liste

            const eachTemplate = n.node

            handleEachTag(eachTemplate, data, n.context, n.indexStack, false, true, [pushedItem], items.length - 1)
        }
    }

    function updateHandler(ch) {
        const linkedNodeHolders = nodeHoldersByKeys.get(ch.key)

        for (const n of linkedNodeHolders) {
            switch (n.updateHandler) {
                case 'interpolate':
                    interpolateText(n.node, data, new Map(), [], false)
                    break
                case 'handleIfTag':
                    handleIfTag(n.node, data, new Map(), [], false, true)
                    break
                case 'set':
                    break
                /*case 'listAction':
                    handleListAction(ch.key, ch.listAction, n.node, n.context, n.indexStack)
                    break*/
            }
        }
    }

    function deleteHandler(ch) {
        const linkedNodeHolders = nodeHoldersByKeys.get(ch.key)

        for (const n of linkedNodeHolders) {
            n.node.remove()
        }
    }

    for (const ch of changes) {
        const action = ch.action

        switch (action) {
            case 'createItem':
                createItem(ch)
                break
            case 'update':
                updateHandler(ch)
                break
            case 'delete':
                deleteHandler(ch)
                break
        }
    }
}

function reactive(data, fullKey = '') {

    let _fullKey = ''
    
    return new Proxy(data, {
        get(target, prop) {
            _fullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

            const value = target[prop]
            if (value && typeof value === 'object') {
                return reactive(value, _fullKey) // tiefes Wrappen des Proxys
            }

            return value
        },

        set(target, prop, value) {
            if (prop !== 'length') {
                
                if (target.constructor.name == 'Array' && !isNaN(prop) && prop >= target.length) {
                    console.log('PUSH')
                }
                
                _fullKey = fullKey ? `${fullKey}.${prop}` : String(prop)
                console.log(_fullKey)
            }
            
            target[prop] = value

            return true
        },

        deleteProperty(target, prop) {
            _fullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

            console.log(_fullKey)
        }
    })
}