// DOM Utilities: Mounting and DOM operations

const DomUtils = (function () {
    function mount(node, mountNode, insertBeforeAnchor = undefined) {
        try {
            if (insertBeforeAnchor) {
                mountNode.insertBefore(node, insertBeforeAnchor)
            } else {
                mountNode.appendChild(node)
            }
        } catch (error) {
            throw new Error(`[TemplateEngine] Error mounting node: ${error.message}`)
        }
    }

    return {
        mount
    }
})()

export default DomUtils
