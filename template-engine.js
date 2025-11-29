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

    function convertToFullKey(relativeKey, contextStack = new Map()) {
        const splitted = relativeKey.split('.')
        const isFirstContext = contextStack.has(splitted[0])

        if (!(isFirstContext && contextStack.get(splitted[0]).of)) {
            return relativeKey
        }

        return convertToFullKey(`${contextStack.get(splitted[0]).of}.${contextStack.get(splitted[0]).index}${splitted.length > 1 ? '.':''}${splitted.slice(1).join('.')}`,
                                contextStack)
    }

    function resolve(key, data, contextStack = new Map()) {
        const splitted = key.split('.')
        let value = data

        for (const s of splitted) {
            if (contextStack.has(s)) {
                value = contextStack.get(s)
                continue
            }

            value = value[s]
        }

        return value
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

        const resolvedTextSpan = document.createElement('span')
        resolvedTextSpan.classList.add('get-resolved')
        resolvedTextSpan.innerText = resolve(fullKey, data, contextStack)
        mountNode.appendChild(resolvedTextSpan)
        
        nodeHoldersByKeys.appendToKey(fullKey, { node: resolvedTextSpan, updateHandler: 'updateGet' })
    }

    function handleEachNode(data, contextStack = new Map(), eachNode, mountNode, refreshMode = false, startAfterExisting = 0) {
        const ofAttribute = eachNode.getAttribute('of')
        const fullOfAttribute = convertToFullKey(ofAttribute, contextStack)

        const asAttribute = eachNode.getAttribute('as')

        if (!refreshMode) {
            nodeHoldersByKeys.appendToKey(fullOfAttribute, { node: eachNode, mountNode: mountNode, updateHandler: 'setArray', contextStack: new Map(contextStack) })
        }

        const list = resolve(fullOfAttribute, data)

        if (list.constructor.name !== 'Array') {
            throw new Error('each-of must be an Array')
        }

        const startIndex = refreshMode ? list.length - startAfterExisting : 0

        for (let index = startIndex ; index < list.length ; index++) {
            const listElement = list[index]
            const childContextStack = new Map(contextStack)
            childContextStack.set(asAttribute, { data: listElement, of: ofAttribute, index: index })
            walk(data, childContextStack, eachNode.childNodes, mountNode)
        }
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
        const params = Object.assign({}, templateUseNode.dataset)
        
        for (const key in templateUseNode.dataset) {
            contextStack.set(key, templateUseNode.dataset[key])
        }

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

        console.log(nodeHoldersByKeys)
    }

    function refresh(data, change, app) {
        
        function createItemsNodes(contextStack, eachNode, mountNode) {
            handleEachNode(data, contextStack, eachNode, mountNode, true, 1)
        }

        function createItemHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.get(change.key)

            for (const node of linkedNodeHolders.holders) {
                //TODO: man soll auch mehrere Elemente pushen können
                createItemsNodes(node.contextStack, node.node, node.mountNode)
            }
        }

        function updateHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.get(change.key)

            function updateGet(node) {
                if (!(node.tagName === 'SPAN'
                    && node.classList.contains('get-resolved'))) {
                        throw new Error("get wasn't resolved correctly")
                    }

                node.innerText = resolve(change.key, data)
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