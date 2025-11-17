// TODOs:
// wenn eine Variable gelöscht wird, dann nodeHolder löschen
// bei slice, insert müssen NodeHolders nachgezogen werden
// Kommentare verbessern

// In dieser Map befinden sich
// TextNodes (mglw. im span umrahmt), if-Tags ,
// sodass die Childs dazu "kontrolliert" enthalten sind
// das jeweilige Node ist allerdings noch in einem Objekt gekapselt für weitere Informationen

const TemplateEngine = (function () {

    const nodeHoldersByKeys = new Map()

    nodeHoldersByKeys.appendToKey = function(key, nodeHolder) {
        if (!nodeHoldersByKeys.has(key)) {
            nodeHoldersByKeys.set(key, [])
        }

        const nodeHoldersByKey = nodeHoldersByKeys.get(key)

        if (!nodeHoldersByKey.some(e => e.node === nodeHolder.node)) {
            nodeHoldersByKey.push(nodeHolder)
            nodeRefs.appendToNode(nodeHolder.node, { key: key, nodeHolders: nodeHoldersByKeys.get(key), index: nodeHoldersByKeys.get(key).length - 1})
        }
    }

    const nodeRefs = new WeakMap()

    nodeRefs.appendToNode = function(node, infos) {
        if (!nodeRefs.has(node)) {
            nodeRefs.set(node, [])
        }

        const infosByNode = nodeRefs.get(node)
        infosByNode.push(infos)
    }

    function removeNode(n) {
        n.remove()

        const infosByNode = nodeRefs.get(n)
        
        if (!infosByNode) {
            return
        }
        
        for (const i of infosByNode) {
            const nodeHolders = i.nodeHolders
            delete nodeHolders[i.index] // delete ist ggü. splice zu bevorzugen, sonst verrutscht i.index
            //nodeHolders.splice(i.index, 1)
        }
        
        nodeRefs.delete(n)
    }

    const templates = new Map()

    function getPlaceHolderRegEx(global = true) {
        const pattern = /\{\{\s*([\w.\-*]+)\s*\}\}/
        return global ? new RegExp(pattern.source, 'g') : new RegExp(pattern.source)
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

    function resolveTemplate(template, data, context = new Map(), layer = 0) {
        const regex = getPlaceHolderRegEx()

        return template.replace(/(\r\n|\n|\r)/gm, '').replace(regex, (placeHolder, _) => {
            return resolvePlaceHolder(placeHolder, data, context, layer)
        })
    }

    function resolvePlaceHolder(placeHolder, data, context = new Map(), layer = 0) {
        // refKey: {{<RefKey>}}
        // z.B.: {{my-template.param1}} -> name
        function dereferencePlaceHolder(placeHolder, data, context = new Map(), layer = 0) {
            const regex = getPlaceHolderRegEx(false)

            if (!regex.test(placeHolder)) {
                return placeHolder
            }

            const unwrappedParamKey = placeHolder.match(regex)[1] // Index 1 ist 2. Gruppe des RegEx
            const paramValue = resolveKey(unwrappedParamKey, data, context, layer)

            return dereferencePlaceHolder(paramValue, data, context, layer)
        }

        return dereferencePlaceHolder(placeHolder, data, context, layer)
    }

    // ein Key kennt keine PlaceHolder, welche zu einem anderen Attribut weiterleiten
    // daher ist resolveKey nicht-rekursiv
    function resolveKey(key, data, context = new Map(), layer = 0) {
        const indexedKey = indexKey(key, layer)

        const splitted = indexedKey.split('.')
        const isFirstContext = context.has(splitted[0])
        const rootKey = isFirstContext ? context.get(splitted[0]).data : data
        const startIndex = isFirstContext ? 1 : 0
        
        let value = rootKey

        for (let i = startIndex ; i < splitted.length ; i++) {
            value = value[splitted[i]]
        }

        return value
    }

    function indexKey(key, layer = 0) {
        // wenn beim Dereferenzieren kein String rauskommen sollte
        if (typeof key !== 'string') {
            return key
        }

        const splitted = key.split('.')

        for (let i = 0 ; i < splitted.length ; i++) {
            if (splitted[i].slice(-1) === '*') {
                splitted[i] = `${splitted[i].slice(0, -1)}-${layer}`
            }
        }

        return splitted.join('.')
    }

    // toFullKeyTemplate nur innerhalb von each
    function interpolateText(node, data, context = new Map(), indexStack = [], toFullKeyTemplate = false, layer = 0) {
        if (node.nodeType !== Node.TEXT_NODE
            && !(node.tagName === 'SPAN' && node.dataset.template)
        ) {
            return
        }

        // im Falle dass es ein Span ist, ist sein textContent bereits interpoliert -> template-Sicherung verwenden
        // bei einem noch nicht gewrappten Text wird einfach sein textContent genommen, da dieser noch ein Template ist
        const template = node.nodeType === Node.TEXT_NODE ? node.textContent : node.dataset.template
        
        if (!getPlaceHolderRegEx().test(template)) {
            return
        }

        let fullKeyTemplate = template
        
        if (toFullKeyTemplate) {
            // wird nur beim ersten Rendern durchgeführt, weil danach bereits Full-Key im Template Bestand hat
            fullKeyTemplate = fullKeyTemplate.replace(getPlaceHolderRegEx(), (_, key) => {
                // template-use und each kümmern sich darum, dass ihre jeweiligen Attribute verarbeitet werden und lesbar sind
                // (siehe Parameter in Data hinzufügen, layer bei template-use; context und indexStack bei each)
                // also muss es interpolate u.a. mithilfe von indexKey und dem Bereitstellen eines gesicherten Templates auch für sich tun
                return `{{ ${convertToFullKey(indexKey(key, layer), context, indexStack)} }}`
            })
        }

        // alternativ könnte man auch indexKey(template) einsetzen
        const resolvedTemplate = resolveTemplate(fullKeyTemplate, data, context, layer)

        // Text wird in ein Span gewrappt, damit dort im Dataset das Template gesichert werden kann
        // ist es bereits ein Span, wird das wiederverwendet und sein Text anhand seines Templates ersetzt
        let wrappedText = node
        
        if (wrappedText.tagName !== 'SPAN') {
            wrappedText = document.createElement('span')
            node.replaceWith(wrappedText)
            wrappedText.dataset.template = fullKeyTemplate
        }

        wrappedText.innerText = resolvedTemplate

        const keyGroup = [... fullKeyTemplate.matchAll(getPlaceHolderRegEx())].map(m => m[1])
        for (const key of keyGroup) {
            nodeHoldersByKeys.appendToKey(key, { node: wrappedText, updateHandler: 'interpolate', context: context })
        }
    }

    function handleIfTag(node, data, context = new Map(), indexStack = [], toFullKeyTemplate = false, removeClonedNodes = false, layer = 0) {
        if (removeClonedNodes) {
            node.querySelectorAll(':scope .templateengine-cloned, :scope .templateengine-cloned *').forEach(e => {
                removeNode(e)
            })
        }

        //TODO: Code verschönern
        let _context = context
        let _indexStack = indexStack

        // beim Refreshen wird nicht render aufgerufen, sondern direkt handleEachTag (somit muss hier die Kopie erstellt werden)
        if (removeClonedNodes) {
            _context = new Map()

            for (const [key, value] of context.entries()) {
                _context.set(key, value)
            }

            _indexStack = Array.from(indexStack)
        }

        if (!node.hasAttribute('test')) {
            console.error('if-Tag requires test-Attribute')
            return
        }

        // da if-Tag sowieso keinen Einfluss auf die Darstellung hat,
        // kann display im positiven Testfall auch leer bleiben
        // die Idee ist, dass if-test immer auf ein Attribut zeigt
        // -> daher wird hier nur resolveKey und nicht resolvePlaceHolder angewandt
        // anders sieht es bei each-of aus, dort kann auch direkt eine Liste aus einem Attribut angegeben werden
        // TODO: das ist noch nicht so günstig, hier wird der PlaceHolder in die indexKey/convert-Methode übergeben (es funktioniert, ist aber unattraktiv)
        // anders bei interpolateText, dort wird über replace der key entnommen

        const conditionKey = node.getAttribute('test')

        const conditionFullKey = conditionKey.replace(getPlaceHolderRegEx(), (_, key) => {
            return `{{ ${convertToFullKey(indexKey(key, layer), _context, _indexStack)} }}`
        })

        if (!removeClonedNodes) { // Test-Fall soll nicht einfach abgeändert werden können
            // IndexStack ist für Refresh notwendig, sobald man each-Childs rendert

            const keyGroup = [... conditionFullKey.matchAll(getPlaceHolderRegEx())].map(m => m[1])
            for (const key of keyGroup) {
                nodeHoldersByKeys.appendToKey(key, { node: node, updateHandler: 'handleIfTag', context: _context, indexStack: _indexStack, layer: layer })
            }
        }

        const conditionValue = resolvePlaceHolder(conditionFullKey, data, _context, layer)

        node.style.display = conditionValue ? '' : 'none'

        if (conditionValue) {
            renderNodes(data, node.childNodes, _context, _indexStack, toFullKeyTemplate, layer)
        }
    }

    function handleEachTag(node, data, context = new Map(), indexStack = [], insertItemsMode = false, customItems = [], customStartIndex = 0, layer = 0) {
        //TODO: Code verschönern
        let _context = context
        let _indexStack = indexStack

        // beim Refreshen wird nicht render aufgerufen, sondern direkt handleEachTag (somit muss hier die Kopie erstellt werden)
        if (insertItemsMode) {
            _context = new Map()

            for (const [key, value] of context.entries()) {
                _context.set(key, value)
            }

            _indexStack = Array.from(indexStack)
        }

        // ofAttribute: bei bspw. "my-template.list" wird auf "friends" referenziert, nicht auf "{{ friends }}" (so wird das verlangt)
        // -> daher kann "friends" auch innerhalb von convertToFullKey verwendet werden
        const ofAttribute = indexKey(resolvePlaceHolder(node.getAttribute('of'), data, _context, layer - 1), layer - 1)
        const asAttribute = indexKey(node.getAttribute('as'), layer) // ist einfach nur eine einzelne Variable zum Indizieren

        node.style.display = 'none'

        // hier wird bspw. "friends" von vorhin auch aufgelöst (resolveKey ist nicht-rekursiv)
        const items = insertItemsMode ? customItems : resolveKey(ofAttribute, data, _context, layer)

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
        
        for (const [key, value] of _context.entries()) {
            oldContext.set(key, value)
        }
        
        const oldIndexStack = Array.from(_indexStack)
        
        _indexStack.push(insertItemsMode ? customStartIndex : 0)

        const fullKey = convertToFullKey(ofAttribute, oldContext, oldIndexStack) // siehe Zeile mit ofAttribute-Zuweisung
        
        for (let i = 0 ; i < items.length ; i++) {
            const d = items[i]
            
            _context.set(asAttribute, { data: d, of: ofAttribute })

            _indexStack.pop()

            const index = insertItemsMode ? customStartIndex + i : i
            _indexStack.push(index)

            for (const c of node.childNodes) {
                const cloned = c.cloneNode(true)
                render(data, cloned, _context, _indexStack, true, layer)

                if (cloned.classList) {
                    cloned.classList.add('templateengine-cloned')
                }

                node.parentNode.insertBefore(cloned, node)
                
                const newFullKey = `${fullKey}.${index}`
                const value = resolveKey(newFullKey, data, context, layer)

                if (typeof value !== 'string') {
                    nodeHoldersByKeys.appendToKey(newFullKey, { node: cloned, updateHandler: 'setObject' }) //TODO: setObject
                }
            }
        }

        // dieser NodeHolder-Eintrag ist für Listenaktionen relevant
        // man gibt den Context, IndexStack auf dem Stand vor der Iteration mit
        // vor der Iteration, weil der Child-Context nicht hier rein gehört
        // wenn man also ein Child c für eine Person p hinzufügen will,
        // dann muss man die jeweilige p kennen (Context)
        if (!insertItemsMode) {
            const templateParams = Object.fromEntries(Object.entries(data).filter(([key]) => key.slice(-7) == '-params'))
            //const templateParams = data.ke
            nodeHoldersByKeys.appendToKey(fullKey, { node: node, updateHandler: 'setArray', context: oldContext, indexStack: oldIndexStack, layer: layer, templateParams: templateParams })
        }
    }

    function handleTemplateTag(node) {
        templates[node.id] = node
    }

    function handleTemplateUseTag(node, data, context = new Map(), indexStack = [], toFullKeyTemplate = false, layer = 0) {
        const wrapper = document.createElement('div')

        const templateId = node.attributes.getNamedItem('template-id').value
        const template = templates[templateId]

        for (const c of template.content.childNodes) {
            const cloned = c.cloneNode(true)
            wrapper.append(cloned)
        }

        node.parentNode.insertBefore(wrapper, node)

        const paramsObject = {}

        for (const [p] of Object.entries(template.dataset)) {
            paramsObject[p] = resolvePlaceHolder(node.dataset[p], data, context, layer)
        }

        const merged = { ...data, ... { [`${templateId}-params`]: paramsObject } }
        //console.log(merged)
        render(merged, wrapper, context, indexStack, toFullKeyTemplate, layer + 1)
    }

    function handleDefaultTag(node, data, context = new Map(), indexStack = [], toFullKeyTemplate = false, layer = 0) {
        interpolateText(node, data, context, indexStack, toFullKeyTemplate, layer)
        renderNodes(data, node.childNodes, context, indexStack, toFullKeyTemplate, layer)
    }

    function renderNodes(data, nodes, context = new Map(), indexStack = [], toFullKeyTemplate = false, layer = 0) {
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
                    handleIfTag(n, data, _context, _indexStack, toFullKeyTemplate, false, layer)
                    break
                case 'EACH':
                    handleEachTag(n, data, _context, _indexStack, false, [], 0, layer)
                    break
                case 'TEMPLATE':
                    handleTemplateTag(n)
                    break
                case 'TEMPLATE-USE':
                    handleTemplateUseTag(n, data, _context, _indexStack, toFullKeyTemplate, layer)
                    break
                default:
                    handleDefaultTag(n, data, _context, _indexStack, toFullKeyTemplate, layer)
                    break
            }
        }
    }

    // für Root-Node
    function render(data, node, context = new Map(), indexStack = [], toFullKeyTemplate = false, layer = 0) {
        renderNodes(data, [node], context, indexStack, toFullKeyTemplate, layer)
    }

    // beim Refreshen kann der IndexStack leer sein,
    // weil beim ersten Rendern wurden schon die relativen Keys
    // innerhalb des Templates mithilfe des Indexstacks konvertiert
    // IndexStack ist dadurch also hier nicht mehr nötig
    // gleiches gilt für Context
    function refresh(data, change) {
        
        function createItemsNodes(items, eachTemplate, context, indexStack, startIndex, layer, templateParams) {
            const merged = { ... data, ... templateParams }
            //console.log(merged)
            handleEachTag(eachTemplate, merged, context, indexStack, true, items, startIndex, layer)
        }

        function createItemHandler(ch) {
            const linkedNodeHolders = nodeHoldersByKeys.get(ch.key)

            for (const n of linkedNodeHolders) {
                if (n) {
                    const items = resolveKey(ch.key, data)
                    //TODO: man soll auch mehrere Elemente pushen können
                    const pushedItem = items[items.length - 1] // beim Pushen braucht man das letzte Element der Liste

                    const eachTemplate = n.node

                    createItemsNodes([pushedItem], eachTemplate, n.context, n.indexStack, items.length - 1, n.layer, n.templateParams)
                }
            }
        }

        function updateHandler(ch) {

            function handleSetArray(n) {
                const items = resolveKey(ch.key, data)
                const eachTemplate = n.node

                eachTemplate.parentNode.querySelectorAll(':scope .templateengine-cloned, :scope .templateengine-cloned *').forEach(e => {
                    removeNode(e)
                    //console.log(e)
                })

                createItemsNodes(items, eachTemplate, n.context, n.indexStack, 0, n.layer, n.templateParams)
            }
//console.log(nodeHoldersByKeys.get(ch.key))
            const linkedNodeHolders = nodeHoldersByKeys.get(ch.key)

            for (const n of linkedNodeHolders) {
                if (n) {
                    switch (n.updateHandler) {
                        case 'interpolate':
                            interpolateText(n.node, data, new Map(), [], false) // kein Context/IndexStack nötig, weil templates schon Full-Key aufweisen
                            break
                        case 'handleIfTag':
                            handleIfTag(n.node, data, n.context, n.indexStack, true, true, n.layer)
                            break
                        case 'setArray':
                            handleSetArray(n)
                            break
                    }
                }
            }
        }

        function deleteHandler(ch) {
            const linkedNodeHolders = nodeHoldersByKeys.get(ch.key)

            for (const n of linkedNodeHolders) {
                if (n) {
                    n.node.remove() // remove() löscht nur vom DOM, nicht vom Speicher
                    //TODO: cleanup der NodeHolders
                    /*console.log(n.node)
                    console.log(nodeHoldersByKeys)*/
                }
            }
        }

        const action = change.action

        switch (action) {
            case 'createItem':
                createItemHandler(change)
                break
            case 'update':
                updateHandler(change)
                break
            case 'delete':
                deleteHandler(change)
                break
        }
    }

    return {
        reactive(data, node) {

            render(data, node)

            const topData = data

            function _reactive(data, fullKey = '') {

                let _fullKey = ''
                
                return new Proxy(data, {
                    get(target, prop) {
                        _fullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

                        const value = target[prop]
                        if (value && typeof value === 'object') {
                            return _reactive(value, _fullKey) // tiefes Wrappen des Proxys
                        }

                        return value
                    },

                    set(target, prop, value) {
                        if (prop !== 'length') {
                            _fullKey = fullKey ? `${fullKey}.${prop}` : String(prop)
                            
                            const isArrayPush = target.constructor.name == 'Array' && !isNaN(prop) && prop >= target.length

                            target[prop] = value
                            
                            let change = { key: _fullKey, action: 'update' }

                            if (isArrayPush) {
                                change = { key: fullKey, action: 'createItem' } // createItem wird noch auf Basis des Parents durchgeführt, deswegen nicht _fullKey
                            } 

                            refresh(topData, change)
                        }

                        return true
                    },

                    deleteProperty(target, prop) {
                        delete target[prop]

                        _fullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

                        const change = { key: _fullKey, action: 'delete' }
                        refresh(topData, change)

                        return true
                    }
                })
            }

            return _reactive(data)
        }
    }
})()

export default TemplateEngine