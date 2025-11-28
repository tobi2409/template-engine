const TemplateEngine = (function () {

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

    function resolveKey(key, data, contextStack = new Map()) {
        const splitted = key.split('.')
        const isFirstContext = contextStack.has(splitted[0])
        const rootKey = isFirstContext ? contextStack.get(splitted[0]).data : data
        const startIndex = isFirstContext ? 1 : 0
        
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

        const resolvedText = document.createTextNode(resolveKey(fullKey, data, contextStack))
        mountNode.insertBefore(resolvedText, mountedNode)
        
        nodeHoldersByKeys.appendToKey(fullKey, { node: mountedNode, refreshHandler: 'interpolate' })
    }

    function mountEachIterations(data, contextStack = new Map(), eachNode, mountNode) {
        const ofAttribute = eachNode.getAttribute('of')
        const asAttribute = eachNode.getAttribute('as')

        const fullOfAttribute = convertToFullKey(ofAttribute, contextStack)

        nodeHoldersByKeys.appendToKey(fullOfAttribute, { node: eachNode, updateHandler: 'setArray', contextStack: contextStack })

        const list = resolveKey(fullOfAttribute, data, contextStack)

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
        //mountEachTemplate(data, eachNode, mountNode)
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

    return { run }

})()

export default TemplateEngine