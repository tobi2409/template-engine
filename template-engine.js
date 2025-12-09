const TemplateEngine = (function () {

    const nodeHoldersByKeys = new Map()

    nodeHoldersByKeys.getByKey = function(fullKey, create = false) {
        const segments = fullKey.split('.')
        let ref = nodeHoldersByKeys
        
        for (const segment of segments) {
            if (!ref.has(segment)) {
                if (!create) return undefined
                ref.set(segment, new Map())
            }
            ref = ref.get(segment)
        }
        
        return ref
    }

    nodeHoldersByKeys.appendToKey = function(fullKey, nodeHolder) {
        const ref = this.getByKey(fullKey, true)
        
        if (!ref.has('holders')) ref.set('holders', [])
        const holders = ref.get('holders')
        if (!holders.some(e => e.node === nodeHolder.node)) {
            holders.push(nodeHolder)
        }
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

    function dereferenceKey(key, data, params = new Map()) {
        if (key.startsWith('*')) {
            const indirectKey = key.slice(1)
            return resolve(indirectKey, data, params)
        }

        return key
    }

    function resolve(key, data, params = new Map()) {
        const splitted = key.split('.')
        let value = data

        for (const [index, segment] of splitted.entries()) {
            if (index === 0 && params.has(segment)) {
                // a paramname (eg. param1) is always represented by a single-key
                return params.get(segment)
            }

            value = value[segment]
        }

        return value
    }

    function resolveEx(key, data, contextStack = new Map(), params = new Map()) {
        // only a paramname is supported for dereferencing
        const dereferencedKey = key.startsWith('*') && params.has(key.slice(1)) ? dereferenceKey(key, data, params) : key
        const fullKey = convertToFullKey(dereferencedKey, contextStack)
        return { fullKey: fullKey, value: resolve(fullKey, data, params) }
    }

    function mount(node, mountNode, insertBeforeAnchor = undefined) {
        if (insertBeforeAnchor) {
            mountNode.insertBefore(node, insertBeforeAnchor)
        } else {
            mountNode.appendChild(node)
        }
    }

    // textNode only contains text, nothing more -> no walk anymore
    function handleTextNode(textNode, mountNode, insertBeforeAnchor = undefined) {
        const cloned = textNode.cloneNode(false)
        mount(cloned, mountNode, insertBeforeAnchor)
    }

    // getNode only contains key, nothing more -> no walk anymore
    function handleGetNode(data, contextStack = new Map(), params = new Map(), getNode, mountNode, insertBeforeAnchor = undefined) {
        const key = getNode.innerText
        const resolved = resolveEx(key, data, contextStack, params)

        const resolvedTextSpan = document.createElement('span')
        resolvedTextSpan.classList.add('get-resolved')
        resolvedTextSpan.innerText = resolved.value
        mount(resolvedTextSpan, mountNode, insertBeforeAnchor)
        
        nodeHoldersByKeys.appendToKey(resolved.fullKey, { node: resolvedTextSpan, updateHandler: 'updateGet' })
    }

    function handleEachNode(data, contextStack = new Map(), params = new Map(), eachNode, mountNode, refreshMode = false, startIndex = 0, endIndex = undefined) {
        const ofAttribute = eachNode.getAttribute('of')
        const resolvedOf = resolveEx(ofAttribute, data, contextStack, params)

        const asAttribute = eachNode.getAttribute('as')

        if (!refreshMode) {
            nodeHoldersByKeys.appendToKey(resolvedOf.fullKey,
                { node: eachNode, mountNode: mountNode, updateHandler: 'setArray', contextStack: new Map(contextStack), params: params })
        }

        const list = resolvedOf.value

        if (list.constructor.name !== 'Array') {
            throw new Error('each-of must be an Array')
        }

        const defaultPushStartIndex = list.length + startIndex
        const _startIndex = startIndex < 0 ? defaultPushStartIndex : startIndex
        const _endIndex = endIndex !== undefined ? endIndex : list.length - 1

        const insertBeforeAnchor = refreshMode ? mountNode.children[_startIndex] : undefined

        for (let index = _startIndex ; index <= _endIndex ; index++) {
            const listElement = list[index]
            const childContextStack = new Map(contextStack)
            childContextStack.set(asAttribute, { isEachContext: true, data: listElement, of: resolvedOf.fullKey, index: index })
            
            // insertBeforeAnchor is passed down only one recursion level.
            // The insertion position matters only within the current container.
            // Nested containers are positioned based on their parent container's position.
            walk(data, childContextStack, params, eachNode.childNodes, mountNode, insertBeforeAnchor)
        }
    }

    function handleTemplateUse(data, contextStack = new Map(), params = new Map(), templateUseNode, mountNode) {
        const childParams = new Map(params) // Inherit parent params
        
        for (const key in templateUseNode.dataset) {
            childParams.set(key, templateUseNode.dataset[key])
        }

        const templateNode = document.getElementById(templateUseNode.attributes.getNamedItem('template-id').value)
        walk(data, contextStack, childParams, templateNode.content.children, mountNode)
    }

    function handleDefaultNode(data, contextStack = new Map(), params = new Map(), defaultNode, mountNode, insertBeforeAnchor = undefined) {
        const cloned = defaultNode.cloneNode(false)
        mount(cloned, mountNode, insertBeforeAnchor)
        // What is with insertBeforeAnchor? see handleEachNode
        walk(data, contextStack, params, defaultNode.childNodes, cloned)
    }

    function walk(data, contextStack = new Map(), params = new Map(), nodes, mountNode, insertBeforeAnchor = undefined) {
        for (const node of nodes) {
            // What is with insertBeforeAnchor? see handleEachNode

            if (node.nodeType === Node.TEXT_NODE) {
                handleTextNode(node, mountNode, insertBeforeAnchor)
                continue
            }

            switch (node.tagName) {
                case 'GET':
                    handleGetNode(data, contextStack, params, node, mountNode, insertBeforeAnchor)
                    break
                case 'EACH':
                    handleEachNode(data, contextStack, params, node, mountNode)
                    break
                case 'TEMPLATE-USE':
                    handleTemplateUse(data, contextStack, params, node, mountNode)
                    break
                default:
                    handleDefaultNode(data, contextStack, params, node, mountNode, insertBeforeAnchor)
                    break
            }
        }
    }

    function initialTemplateUse(data, contextStack = new Map(), templateUseNode) {
        const params = new Map()
        const mountNode = document.getElementById(templateUseNode.attributes.getNamedItem('mount-id').value)
        handleTemplateUse(data, contextStack, params, templateUseNode, mountNode)
    }

    function run(data, templateUseNode) {
        if (templateUseNode.tagName !== 'TEMPLATE-USE') {
            throw new Error('entry point must be template-use')
        }

        const contextStack = new Map()

        initialTemplateUse(data, contextStack, templateUseNode)

        //console.log(nodeHoldersByKeys)
    }

    function refresh(data, change, app) {
        
        function createItemsNodes(contextStack, params, eachNode, mountNode, startIndex = 0, endIndex = undefined) {
            handleEachNode(data, contextStack, params, eachNode, mountNode, true, startIndex, endIndex)
        }

        function reindexArrayMap(arrayMap, startIndex, shift, maxIndex) {
            // Verschiebe Indices um 'shift' Positionen
            // shift > 0: von hinten nach vorne (um nicht zu überschreiben)
            // shift < 0: von vorne nach hinten
            if (shift === 0) return
            
            const start = shift > 0 ? maxIndex : startIndex
            const end = shift > 0 ? startIndex : maxIndex
            const step = shift > 0 ? -1 : 1
            
            for (let i = start; shift > 0 ? i >= end : i <= end; i += step) {
                const oldIndex = String(i)
                const newIndex = String(i + shift)
                if (arrayMap.has(oldIndex)) {
                    arrayMap.set(newIndex, arrayMap.get(oldIndex))
                    arrayMap.delete(oldIndex)
                }
            }
        }

        function pushHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.key)
            const list = resolve(change.key, data)
            
            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                const startIndex = list.length - change.items.length
                const endIndex = list.length - 1
                createItemsNodes(
                    nodeHolder.contextStack, 
                    nodeHolder.params, 
                    nodeHolder.node, 
                    nodeHolder.mountNode, 
                    startIndex, 
                    endIndex
                )
            }
        }

        function popHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.key)
            const list = resolve(change.key, data)
            const arrayMap = linkedNodeHolders
            
            // Cleanup: Entferne NodeHolders für das gelöschte Item
            const deletedIndex = list.length
            arrayMap.delete(String(deletedIndex))
            
            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                const lastChild = nodeHolder.mountNode.lastElementChild
                if (lastChild) {
                    nodeHolder.mountNode.removeChild(lastChild)
                }
            }
        }

        function shiftHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.key)
            const list = resolve(change.key, data)
            const arrayMap = linkedNodeHolders
            
            // Cleanup: Entferne Index 0
            arrayMap.delete('0')
            
            // Reindex: Verschiebe alle Indices um 1 nach unten
            reindexArrayMap(arrayMap, 1, -1, list.length)
            
            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                const firstChild = nodeHolder.mountNode.firstElementChild
                if (firstChild) {
                    nodeHolder.mountNode.removeChild(firstChild)
                }
            }
        }

        function unshiftHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.key)
            const list = resolve(change.key, data)
            const arrayMap = linkedNodeHolders
            
            // Reindex: Verschiebe alle Indices um items.length nach oben
            reindexArrayMap(arrayMap, 0, change.items.length, list.length - change.items.length - 1)
            
            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                const endIndex = change.items.length - 1
                createItemsNodes(
                    nodeHolder.contextStack, 
                    nodeHolder.params, 
                    nodeHolder.node, 
                    nodeHolder.mountNode, 
                    0, 
                    endIndex
                )
            }
        }

        function spliceHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.key)
            const list = resolve(change.key, data)
            const arrayMap = linkedNodeHolders
            
            const oldLength = list.length - change.items.length + change.deleteCount

            // 1. Cleanup: Lösche die zu entfernenden Elemente
            for (let i = 0; i < change.deleteCount; i++) {
                arrayMap.delete(String(change.startIndex + i))
            }

            // 2. Reindex: Verschiebe bestehende Elemente
            const shift = change.items.length - change.deleteCount
            if (shift !== 0) {
                reindexArrayMap(
                    arrayMap, 
                    change.startIndex + change.deleteCount, 
                    shift, 
                    oldLength - 1
                )
            }

            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                // Zuerst Elemente löschen
                if (change.deleteCount > 0) {
                    for (let i = 0; i < change.deleteCount; i++) {
                        const childToRemove = nodeHolder.mountNode.children[change.startIndex]
                        if (childToRemove) {
                            nodeHolder.mountNode.removeChild(childToRemove)
                        }
                    }
                }
                
                // Dann neue Elemente einfügen
                if (change.items.length > 0) {
                    const endIndex = change.startIndex + change.items.length - 1
                    createItemsNodes(
                        nodeHolder.contextStack, 
                        nodeHolder.params, 
                        nodeHolder.node, 
                        nodeHolder.mountNode, 
                        change.startIndex, 
                        endIndex
                    )
                }
            }
        }

        function updateHandler() {
            const linkedNodeHolders = nodeHoldersByKeys.getByKey(change.key)

            function updateGet(node) {
                if (!(node.tagName === 'SPAN'
                    && node.classList.contains('get-resolved'))) {
                        throw new Error("get wasn't resolved correctly")
                    }

                node.innerText = resolve(change.key, data) // change.key is already fullKey
            }

            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                switch (nodeHolder.updateHandler) {
                    case 'updateGet':
                        updateGet(nodeHolder.node)
                        break
                }
            }
        }

        switch (change.action) {
            case 'push':
                pushHandler()
                break
            case 'pop':
                popHandler()
                break
            case 'shift':
                shiftHandler()
                break
            case 'unshift':
                unshiftHandler()
                break
            case 'splice':
                spliceHandler()
                break
            case 'update':
                updateHandler()
                break
        }
    }

    return {
        reactive(data, node) {

            run(data, node)

            const topData = data

            function _reactive(data, fullKey = '') {

                let _fullKey = ''
                let isInArrayMethod = false
                let arrayMethodName = null
                
                const proxy = new Proxy(data, {
                    get(target, prop) {
                        _fullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

                        const value = target[prop]
                        
                        // Array-Methoden abfangen
                        if (Array.isArray(target) && typeof value === 'function') {
                            if (['push', 'pop', 'shift', 'unshift', 'splice'].includes(prop)) {
                                return function(...args) {
                                    isInArrayMethod = true
                                    arrayMethodName = prop
                                    
                                    const result = value.apply(proxy, args)
                                    
                                    isInArrayMethod = false
                                    
                                    let change
                                    
                                    if (prop === 'push') {
                                        change = { 
                                            key: fullKey, 
                                            action: 'push',
                                            items: args
                                        }
                                    } 
                                    else if (prop === 'pop') {
                                        change = { 
                                            key: fullKey, 
                                            action: 'pop'
                                        }
                                    } 
                                    else if (prop === 'shift') {
                                        change = { 
                                            key: fullKey, 
                                            action: 'shift'
                                        }
                                    } 
                                    else if (prop === 'unshift') {
                                        change = { 
                                            key: fullKey, 
                                            action: 'unshift',
                                            items: args
                                        }
                                    } 
                                    else if (prop === 'splice') {
                                        change = { 
                                            key: fullKey, 
                                            action: 'splice', 
                                            startIndex: args[0], 
                                            deleteCount: args[1] || 0, 
                                            items: args.slice(2)
                                        }
                                    }
                                    
                                    if (change) {
                                        refresh(topData, change)
                                    }
                                    
                                    arrayMethodName = null
                                    return result
                                }
                            }
                        }

                        if (value && typeof value === 'object') {
                            return _reactive(value, _fullKey) // tiefes Wrappen des Proxys
                        }

                        return value
                    },

                    set(target, prop, value) {
                        target[prop] = value

                        if (prop !== 'length' && !isInArrayMethod) {
                            _fullKey = fullKey ? `${fullKey}.${prop}` : String(prop)
                            let change = { key: _fullKey, action: 'update' }
                            refresh(topData, change)
                        }

                        return true
                    }/*,

                    deleteProperty(target, prop) {
                        delete target[prop]

                        _fullKey = fullKey ? `${fullKey}.${prop}` : String(prop)

                        const change = { key: _fullKey, action: 'delete' }
                        refresh(topData, change)

                        return true
                    }*/
                })
                
                return proxy
            }

            return _reactive(data)
        }
    }

})()

export default TemplateEngine