// Proxy-Komponente: Reaktivität durch Proxy-basierte Datenüberwachung

import { nodeHoldersByKeys } from './utils/node-holders.js'
import { run } from './render.js'
import { refresh } from './refresh.js'

const TemplateEngine = (function () {
    return {
        reactive(data, node) {
            run(data, node)

            const topData = data

            function innerReactive(data, fullKey = '') {
                let isInArrayMethod = false
                
                const proxy = new Proxy(data, {
                    get(target, prop) {
                        const value = target[prop]
                        
                        // Array-Methoden abfangen
                        if (Array.isArray(target) && typeof value === 'function' && 
                            ['push', 'pop', 'shift', 'unshift', 'splice'].includes(prop)) {
                            return function(...args) {
                                isInArrayMethod = true
                                const result = value.apply(proxy, args)
                                isInArrayMethod = false
                                
                                const change = { fullKey, action: prop }
                                
                                if (prop === 'push' || prop === 'unshift') {
                                    change.items = args
                                } else if (prop === 'splice') {
                                    change.startIndex = args[0]
                                    change.deleteCount = args[1] || 0
                                    change.items = args.slice(2)
                                }
                                
                                refresh(topData, change)
                                return result
                            }
                        }

                        if (value && typeof value === 'object') {
                            const nextFullKey = fullKey ? `${fullKey}.${prop}` : String(prop)
                            return innerReactive(value, nextFullKey)
                        }

                        return value
                    },

                    set(target, prop, value) {
                        target[prop] = value

                        if (prop !== 'length' && !isInArrayMethod) {
                            const nextFullKey = fullKey ? `${fullKey}.${prop}` : String(prop)
                            
                            // Ermittle Action basierend auf registrierten NodeHolders
                            // [0] reicht aus, da normalerweise alle holders für denselben Key die gleiche Action haben
                            // (z.B. alle <get>data.name</get> haben 'updateGet', alle <if test="data.flag"> haben 'updateIf')
                            const linkedNodeHolders = nodeHoldersByKeys.getByKey(nextFullKey)
                            const action = linkedNodeHolders?.get('holders')?.[0]?.action || 'update'
                            
                            const change = { fullKey: nextFullKey, action }
                            refresh(topData, change)
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
