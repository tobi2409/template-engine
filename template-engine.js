const TemplateEngine = (function () {

    const nodeHoldersByKeys = new Map()

    nodeHoldersByKeys.appendToKey = function(fullKey, nodeHolder) {
        const segments = fullKey.split('.')

        let ref = nodeHoldersByKeys

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]

            const isIndex = /^\d+$/.test(segment)

            if (isIndex) {
                // Array-Index → behandle als array
                if (!Array.isArray(ref.items)) {
                    ref.items = []
                }

                if (!ref.items[segment]) {
                    ref.items[segment] = {}
                }
            
                ref = ref.items[segment]
            } else {
                // normales Objektfeld
                if (!ref[segment]) {
                    ref[segment] = {}
                }

                ref = ref[segment]
            }
        }

        // Am Ende: Liste erzeugen falls nicht existiert
        if (!ref.holders) {
            ref.holders = []
        }

        // Duplikate verhindern
        if (!ref.holders.some(e => e.node === nodeHolder.node)) {
            ref.holders.push(nodeHolder)
        }
    }

    nodeHoldersByKeys.get = function(fullKey) {
        const segments = fullKey.split('.')
        let ref = nodeHoldersByKeys

        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i]

            const isIndex = /^\d+$/.test(segment)

            if (isIndex) {
                // Index eines Arrays
                if (!ref.items) {
                    return undefined
                }

                ref = ref.items[segment]
                
                if (!ref) {
                    return undefined
                }
            } else {
                // norm. property
                ref = ref[segment]

                if (!ref) {
                    return undefined
                }
            }
        }

        return ref
    }

    function resolveKey(key, data) {
        const splitted = key.split('.')
        const rootKey = data
        const startIndex = 0
        
        let value = rootKey

        for (let i = startIndex ; i < splitted.length ; i++) {
            value = value[splitted[i]]
        }

        return value
    }

    function convertToFullKey(relativeKey, contextStack = new Map()) {
        const splitted = relativeKey.split('.')
        const isFirstContext = contextStack.has(splitted[0])

        if (!isFirstContext) {
            return relativeKey
        }

        return convertToFullKey(`${contextStack.get(splitted[0]).of}.${contextStack.get(`${splitted[0]}-index`)}${splitted.length > 1 ? '.':''}${splitted.slice(1).join('.')}`,
                                contextStack)
    }

    function mount(data, contextStack = new Map(), node, mountNode) {
        const cloned = node.cloneNode(false)
        mountNode.appendChild(cloned)
        return cloned
    }

    // textNode only contains text, nothing more
    function handleTextNode(data, contextStack = new Map(), textNode, mountNode) {
        mount(data, contextStack, textNode, mountNode)
    }

    // getNode only contains key, nothing more
    function handleGetNode(data, contextStack = new Map(), getNode, mountNode) {
        const key = getNode.innerText
        const fullKey = convertToFullKey(key, contextStack)

        const mountedNode = mount(data, contextStack, getNode, mountNode)
        mountedNode.innerText = fullKey
        mountedNode.hidden = true

        const resolvedTextSpan = document.createElement('span')
        resolvedTextSpan.classList.add('get-resolved')
        resolvedTextSpan.innerText = resolveKey(fullKey, data)
        mountNode.insertBefore(resolvedTextSpan, mountedNode)
        
        nodeHoldersByKeys.appendToKey(fullKey, { node: mountedNode, updateHandler: 'updateGet' })
    }

    function mountEachIterations(data, contextStack = new Map(), eachNode, mountNode) {
        const ofAttribute = eachNode.getAttribute('of')
        const asAttribute = eachNode.getAttribute('as')

        const fullOfAttribute = convertToFullKey(ofAttribute, contextStack)

        nodeHoldersByKeys.appendToKey(fullOfAttribute, { node: eachNode, mountNode: mountNode, updateHandler: 'setArray', contextStack: contextStack })

        const list = resolveKey(fullOfAttribute, data)

        if (list.constructor.name !== 'Array') {
            throw new Error('each-of must be an Array')
        }

        for (const [index, listElement] of list.entries()) {
            contextStack.set(asAttribute, { data: listElement, of: ofAttribute })
            contextStack.set(`${asAttribute}-index`, index)
            walk(data, contextStack, eachNode.childNodes, mountNode)
        }
    }

    function mountEachTemplate(data, contextStack = new Map(), eachNode, mountNode) {
        const mountedNode = mount(data, contextStack, eachNode, mountNode)
        walk(data, contextStack, eachNode.childNodes, mountedNode)
        return mountedNode
    }

    function handleEachNode(data, contextStack = new Map(), eachNode, mountNode) {
        mountEachIterations(data, contextStack, eachNode, mountNode)
        //mountEachTemplate(data, contextStack, eachNode, mountNode)
        //console.log(eachNode)
        console.log(nodeHoldersByKeys)
    }

    function handleDefaultNode(data, contextStack = new Map(), defaultNode, mountNode) {
        const mountedNode = mount(data, contextStack, defaultNode, mountNode)
        walk(data, contextStack, defaultNode.childNodes, mountedNode)
    }

    function walk(data, contextStack = new Map(), nodes, mountNode) {
        for (const node of nodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                handleTextNode(data, contextStack, node, mountNode)
                continue
            }

            switch (node.tagName) {
                case 'GET':
                    handleGetNode(data, contextStack, node, mountNode)
                    break
                case 'EACH':
                    handleEachNode(data, contextStack, node, mountNode)
                    break
                default:
                    handleDefaultNode(data, contextStack, node, mountNode)
                    break
            }
        }
    }

    function templateUse(data, contextStack = new Map(), templateUseNode) {
        const templateNode = document.getElementById(templateUseNode.attributes.getNamedItem('template-id').value)
        const mountNode = document.getElementById(templateUseNode.attributes.getNamedItem('mount-id').value)
        walk(data, contextStack, templateNode.content.children, mountNode)
    }

    function run(data, templateUseNode) {
        if (templateUseNode.tagName !== 'TEMPLATE-USE') {
            throw new Error('entry point must be template-use')
        }

        const contextStack = new Map()

        templateUse(data, contextStack, templateUseNode)
    }

    function refresh(data, change, app) {
        
        function createItemsNodes(items, contextStack, eachNode, mountNode) {
            //TODO: mountEachIterations mit custom Items anpassen
            mountEachIterations(items, contextStack, eachNode, mountNode)
        }

        function createItemHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.get(change.key)

            for (const node of linkedNodeHolders.holders) {
                const items = resolveKey(change.key, data)
                //TODO: man soll auch mehrere Elemente pushen können
                const pushedItem = items[items.length - 1] // beim Pushen braucht man das letzte Element der Liste
                createItemsNodes([pushedItem], node.contextStack, node.node, node.mountNode)
            }
        }

        function updateHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.get(change.key)

            function updateGet(node) {
                const getResolvedSpan = node.previousElementSibling

                if (!(getResolvedSpan.tagName === 'SPAN'
                    && getResolvedSpan.classList.contains('get-resolved'))) {
                        throw new Error("get isn't resolved")
                    }

                getResolvedSpan.innerText = resolveKey(change.key, data)
            }

            for (const nodeHolder of linkedNodeHolders.holders) {
                switch (nodeHolder.updateHandler) {
                    case 'updateGet':
                        updateGet(nodeHolder.node)
                        break
                }
            }
        }

        switch (change.action) {
            case 'createItem':
                createItemHandler()
                break
            case 'update':
                updateHandler()
                break
        }
    }

    return { run, refresh }

})()

export default TemplateEngine