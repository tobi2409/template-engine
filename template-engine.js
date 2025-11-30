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

        if (!isFirstContext) {
            return relativeKey
        }

        return convertToFullKey(`${contextStack.get(splitted[0]).of}.${contextStack.get(splitted[0]).index}${splitted.length > 1 ? '.':''}${splitted.slice(1).join('.')}`,
                                contextStack)
    }

    function resolve(key, data, params = new Map()) {
        if (params.has(key)) {
            return params.get(key) // a paramname (as param1) is always single
        }

        const splitted = key.split('.')
        let value = data

        for (const s of splitted) {
            value = value[s]
        }

        return value
    }

    function mount(node, mountNode, beforeNode = undefined) {
        const cloned = node.cloneNode(false)

        if (beforeNode) {
            mountNode.insertBefore(cloned, beforeNode)
        } else {
            mountNode.appendChild(cloned)
        }
        
        return cloned
    }

    // textNode only contains text, nothing more
    function handleTextNode(textNode, mountNode) {
        mount(textNode, mountNode)
    }

    // getNode only contains key, nothing more
    function handleGetNode(data, contextStack = new Map(), params = new Map(), getNode, mountNode) {
        const key = getNode.innerText
        const fullKey = convertToFullKey(key, contextStack)

        const resolvedTextSpan = document.createElement('span')
        resolvedTextSpan.classList.add('get-resolved')
        resolvedTextSpan.innerText = resolve(fullKey, data, params)
        mountNode.appendChild(resolvedTextSpan)
        
        nodeHoldersByKeys.appendToKey(fullKey, { node: resolvedTextSpan, updateHandler: 'updateGet' })
    }

    function handleEachNode(data, contextStack = new Map(), params = new Map(), eachNode, mountNode, refreshMode = false, startIndex = 0, endIndex = undefined) {
        const ofAttribute = eachNode.getAttribute('of')
        const fullOfAttribute = convertToFullKey(ofAttribute, contextStack)

        const asAttribute = eachNode.getAttribute('as')

        if (!refreshMode) {
            nodeHoldersByKeys.appendToKey(fullOfAttribute,
                { node: eachNode, mountNode: mountNode, updateHandler: 'setArray', contextStack: new Map(contextStack), params: params })
        }

        const list = resolve(fullOfAttribute, data, params)

        if (list.constructor.name !== 'Array') {
            throw new Error('each-of must be an Array')
        }

        const _startIndex = startIndex < 0 ? list.length + startIndex : startIndex
        const _endIndex = endIndex !== undefined ? endIndex : list.length - 1

        for (let index = _startIndex ; index <= _endIndex ; index++) {
            const listElement = list[index]
            const childContextStack = new Map(contextStack)
            childContextStack.set(asAttribute, { isEachContext: true, data: listElement, of: ofAttribute, index: index })
            walk(data, childContextStack, params, eachNode.childNodes, mountNode)
        }
    }

    function handleDefaultNode(data, contextStack = new Map(), params = new Map(), defaultNode, mountNode) {
        const mountedNode = mount(defaultNode, mountNode)
        walk(data, contextStack, params, defaultNode.childNodes, mountedNode)
    }

    function walk(data, contextStack = new Map(), params = new Map(), nodes, mountNode) {
        for (const node of nodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                handleTextNode(node, mountNode)
                continue
            }

            switch (node.tagName) {
                case 'GET':
                    handleGetNode(data, contextStack, params, node, mountNode)
                    break
                case 'EACH':
                    handleEachNode(data, contextStack, params, node, mountNode)
                    break
                default:
                    handleDefaultNode(data, contextStack, params, node, mountNode)
                    break
            }
        }
    }

    function templateUse(data, contextStack = new Map(), templateUseNode) {
        const params = new Map()
        
        for (const key in templateUseNode.dataset) {
            params.set(key, templateUseNode.dataset[key])
        }

        const templateNode = document.getElementById(templateUseNode.attributes.getNamedItem('template-id').value)
        const mountNode = document.getElementById(templateUseNode.attributes.getNamedItem('mount-id').value)
        walk(data, contextStack, params, templateNode.content.children, mountNode)
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
        
        function createItemsNodes(contextStack, params, eachNode, mountNode, startIndex = 0, endIndex = undefined) {
            handleEachNode(data, contextStack, params, eachNode, mountNode, true, startIndex, endIndex)
        }

        function pushItemHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.get(change.key)

            for (const nodeHolder of linkedNodeHolders.holders) {
                createItemsNodes(nodeHolder.contextStack, nodeHolder.params, nodeHolder.node, nodeHolder.mountNode, -1)
            }
        }

        function insertHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.get(change.key)

            for (const nodeHolder of linkedNodeHolders.holders) {
                createItemsNodes(nodeHolder.contextStack, nodeHolder.params, nodeHolder.node, nodeHolder.mountNode, change.startIndex, change.startIndex)
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
            case 'pushItem':
                pushItemHandler()
                break
            case 'insert':
                insertHandler()
                break
            case 'update':
                updateHandler()
                break
        }
    }

    return { run, refresh }

})()

export default TemplateEngine