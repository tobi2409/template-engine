// Refresh Rendering Component: Updates for existing DOM nodes

import NodeHolders from './utils/node-holders.js'
import KeyResolver from './utils/key-resolver.js'
import DefaultNodeAttributes from './default-node-attributes.js'
import InitialRendering from './initial-rendering.js'

const RefreshRendering = (function () {
    function handleGetNodeRefresh(data, refreshInfo) {
        try {
            const value = refreshInfo.resolvedValue !== undefined
                ? refreshInfo.resolvedValue
                : KeyResolver.resolve(refreshInfo.fullKey, data)

            refreshInfo.existingNode.textContent = value
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in handleGetNodeRefresh: ${error.message}`)
        }
    }

    function handleEachNodeRefresh(data, refreshInfo) {
        try {
            const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(refreshInfo.fullKey)
            const { deleteStartIndex = 0, deleteCount = 0, insertStartIndex = 0, insertCount = 0 } = refreshInfo

            for (let i = 0; i < deleteCount; i++) {
                linkedNodeHolders.delete(String(deleteStartIndex + i))
            }

            for (const nodeHolder of linkedNodeHolders.get('holders')) {
                //sollte nodeHolder.mountNode ein DocumentFragment sein, dann wird nodeHolder.realParent verwendet
                //const mountNode = nodeHolder.mountNode instanceof DocumentFragment ? nodeHolder.realParent : nodeHolder.mountNode
                
                for (let i = 0; i < deleteCount; i++) {
                    const childToRemove = nodeHolder.mountNode.children[deleteStartIndex]
                    if (childToRemove) {
                        nodeHolder.mountNode.removeChild(childToRemove)
                    }
                }

                if (insertCount > 0) {
                    InitialRendering.handleEachNode(data, nodeHolder.contextStack, nodeHolder.params, nodeHolder.eachNode, nodeHolder.mountNode,
                        { startIndex: insertStartIndex, endIndex: insertStartIndex + insertCount - 1 })
                }
            }
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in handleEachNodeRefresh: ${error.message}`)
        }
    }

    function handleIfNodeRefresh(data, refreshInfo) {
        try {
            const wrapper = refreshInfo.wrapper

            if (!wrapper) {
                throw new Error('[TemplateEngine] wrapper element missing in IfNodeRefresh')
            }

            // Support optimized hiding: if justHideChildren is set we keep a saved
            // DocumentFragment to reattach instead of full re-render.
            const justHide = Boolean(refreshInfo.ifNode && refreshInfo.ifNode.attributes && refreshInfo.ifNode.attributes['justHideChildren'])

            const testValue = KeyResolver.resolve(refreshInfo.fullKey, data)

            if (justHide) {
                if (!testValue) {
                    if (!wrapper._savedFragment) {
                        const frag = document.createDocumentFragment()
                        // Move (don't clone because DOM Element can only have one parent)
                        // all children to a DocumentFragment to save them for later reattachment
                        while (wrapper.firstChild) {
                            frag.appendChild(wrapper.firstChild)
                        }
                        
                        wrapper._savedFragment = frag
                    }
                } else {
                    if (wrapper._savedFragment) {
                        wrapper.appendChild(wrapper._savedFragment)
                        delete wrapper._savedFragment
                    } else {
                        InitialRendering.walk(data, refreshInfo.contextStack, refreshInfo.params, refreshInfo.ifNode.childNodes, wrapper)
                    }
                }

                wrapper.style.display = testValue ? '' : 'none'
            } else {
                // default behavior: replace children and rebuild when true
                wrapper.replaceChildren()
                wrapper.style.display = 'none'

                if (testValue) {
                    wrapper.style.display = ''
                    InitialRendering.walk(data, refreshInfo.contextStack, refreshInfo.params, refreshInfo.ifNode.childNodes, wrapper)
                }
            }
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in handleIfNodeRefresh: ${error.message}`)
        }
    }

    function handleDefaultNodeRefresh(data, refreshInfo) {
        try {
            const value = refreshInfo.resolvedValue !== undefined
                ? refreshInfo.resolvedValue
                : KeyResolver.resolve(refreshInfo.fullKey, data)

            if (refreshInfo.type === 'bind') {
                refreshInfo.node[refreshInfo.property] = value
            } else if (refreshInfo.type === 'attribute') {
                DefaultNodeAttributes.applyAttribute(refreshInfo.node, refreshInfo.attributeName, value)
            }
        } catch (error) {
            throw new Error(`[TemplateEngine] Error in handleDefaultNodeRefresh: ${error.message}`)
        }
    }

    return {
        handleGetNodeRefresh,
        handleEachNodeRefresh,
        handleIfNodeRefresh,
        handleDefaultNodeRefresh
    }
})()

export default RefreshRendering