// Proxy Component: Reactivity through proxy-based data observation

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { run } from './render.js'
import { refresh } from './refresh.js'

const TemplateEngine = (function () {
    return {
        reactive(data, node) {
            try {
                run(data, node)
            } catch (error) {
                throw new Error(`[TemplateEngine] Error during initial render: ${error.message}`)
            }

            const topData = data

            function innerReactive(data, fullKey = '') {
                let isInArrayMethod = false
                
                const proxy = new Proxy(data, {
                    get(target, prop) {
                        const value = target[prop]
                        
                        // Handle non-array-method cases first
                        if (!Array.isArray(target) || typeof value !== 'function' || 
                            !['push', 'pop', 'shift', 'unshift', 'splice'].includes(prop)) {
                                
                            if (value && typeof value === 'object') {
                                const nextFullKey = fullKey ? `${fullKey}.${prop}` : String(prop)
                                return innerReactive(value, nextFullKey)
                            }

                            return value
                        }

                        // Intercept array methods
                        return function(...args) {
                            isInArrayMethod = true

                            let result

                            try {
                                result = value.apply(proxy, args)
                            } catch (error) {
                                throw new Error(`[TemplateEngine] Error executing ${prop} on "${fullKey}": ${error.message}`)
                            } finally {
                                isInArrayMethod = false
                            }
                            
                            const change = { fullKey, action: prop }
                            
                            if (prop === 'push' || prop === 'unshift') {
                                change.items = args
                            } else if (prop === 'splice') {
                                change.startIndex = args[0]
                                change.deleteCount = args[1] || 0
                                change.items = args.slice(2)
                            }
                            
                            try {
                                refresh(topData, change)
                            } catch (error) {
                                throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}" after "${prop}": ${error.message}`)
                            }

                            return result
                        }
                    },

                    set(target, prop, value) {
                        target[prop] = value

                        if (prop !== 'length' && !isInArrayMethod) {
                            const nextFullKey = fullKey ? `${fullKey}.${prop}` : String(prop)
                            
                            // Determine action based on registered NodeHolders
                            // [0] is sufficient since typically all holders for the same key have the same action
                            // (e.g., all <get>data.name</get> have 'updateGet', all <if test="data.flag"> have 'updateIf')
                            const linkedNodeHolders = nodeHoldersByKeys.getByKey(nextFullKey)

                            // Early return if no UI elements depend on this property
                            if (!linkedNodeHolders || linkedNodeHolders.get('holders')?.length === 0) {
                                return true
                            }

                            const action = linkedNodeHolders?.get('holders')?.[0].action || 'update'
                            const change = { fullKey: nextFullKey, action }
                            
                            try {
                                refresh(topData, change)
                            } catch (error) {
                                throw new Error(`[TemplateEngine] Error during refresh of "${nextFullKey}": ${error.message}`)
                            }
                        }

                        return true
                    }
                })
                
                return proxy
            }

            return innerReactive(data)
        }
    }
})()

export default TemplateEngine
