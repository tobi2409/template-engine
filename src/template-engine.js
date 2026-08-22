// Reactive Component: Reactivity through Object.defineProperty-based data observation

import RenderEngine from './components/render-engine.js'
import Notifier from './components/reactivity-helpers/notifier.js'
import ReactivityFrame from './components/reactivity-helpers/reactivity-frame.js'
import UuidItemMap from './components/utils/uuid-item-map.js'
import ModelSynchronization from './components/reactivity-helpers/model-synchronization.js'

const TemplateEngine = (function () {
    return {
        withoutModelSynchronization(callback) {
            return ModelSynchronization.withoutModelSynchronization(callback)
        },

        reactive(data, node, dependencies = {}) {
            if (!data || typeof data !== 'object') {
                throw new TypeError(`[TemplateEngine] reactive expected "data" to be an object, got ${data === null ? 'null' : typeof data}`)
            }

            if (!node || typeof node !== 'object' || node.nodeType !== Node.ELEMENT_NODE || node.tagName !== 'TEMPLATE-USE') {
                throw new TypeError('[TemplateEngine] reactive expected "node" to be a <template-use> element')
            }

            if (!dependencies || typeof dependencies !== 'object') {
                throw new TypeError(`[TemplateEngine] reactive expected "dependencies" to be an object, got ${dependencies === null ? 'null' : typeof dependencies}`)
            }

            const topData = data

            const frameParams = {
                marker: '__reactive__',
                getArrayItemKey: (item) => UuidItemMap.ensureUuidForItem(item),
                getArrayItemExtraParams: (item, index, extraParams) => {
                    const viewModelArrayConfig = extraParams.viewModelArrayConfig
                    return {
                        viewModelArrayConfig,
                        objectSegments: viewModelArrayConfig
                            ? undefined
                            : extraParams.objectSegments,
                        viewModelItemConfig: viewModelArrayConfig
                            ? ModelSynchronization.createViewModelItemConfig(viewModelArrayConfig, index)
                            : undefined
                    }
                },
                getNestedExtraParams: (value, fullKey, extraParams) => {
                    const isArray = Array.isArray(value)
                    const isViewModelArrayContainer = !isArray
                        && Array.isArray(value?.data)
                        && ModelSynchronization.createViewModelArrayConfig(value.data) !== undefined

                    return {
                        viewModelArrayConfig: isArray
                            ? ModelSynchronization.createViewModelArrayConfig(value)
                            : isViewModelArrayContainer
                                ? undefined
                                : extraParams.viewModelArrayConfig,
                        viewModelItemConfig: isArray || isViewModelArrayContainer
                            ? undefined
                            : extraParams.viewModelItemConfig
                    }
                },
                onArrayChange: (change, array, extraParams) => {
                    const viewModelArrayConfig = extraParams.viewModelArrayConfig
                    ModelSynchronization.updateModelArrayByViewModelArrayOperation(
                        viewModelArrayConfig,
                        change.action,
                        change
                    )
                },
                onArrayItemsChange: (change) => {
                    try {
                        Notifier.notifyChange(topData, change.fullKey, change, dependencies)
                    } catch (error) {
                        throw new Error(`[TemplateEngine] Error during refresh of "${change.fullKey}" after "${change.action}"`, { cause: error })
                    }
                },
                onDataPropertyGet: () => {},
                onDataPropertySet: ({ fullKey, extraParams }) => {
                    try {
                        Notifier.notifyKeyChange(topData, fullKey, dependencies)
                    } catch (error) {
                        throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}"`, { cause: error })
                    }

                    ModelSynchronization.updateModelItemByViewModelItem(
                        extraParams.viewModelItemConfig,
                        [extraParams.objectSegments]
                    )
                },
                onAccessorPropertyGet: () => {},
                onAccessorPropertySet: ({ fullKey }) => {
                    try {
                        Notifier.notifyKeyChange(topData, fullKey, dependencies)
                    } catch (error) {
                        throw new Error(`[TemplateEngine] Error during refresh of "${fullKey}"`, { cause: error })
                    }
                }
            }

            function makeReactive(obj, fullKey = '', extraParams = {}) {
                return ReactivityFrame.makeReactive(obj, fullKey, {
                    ...frameParams,
                    ...extraParams
                })
            }

            // run() first: lets the template engine assign UUIDs to array items.
            // makeReactive() then reads those UUIDs to build the correct fullKey paths.
            try {
                RenderEngine.run(data, node, dependencies)
            } catch (error) {
                throw new Error(`[TemplateEngine] Error during initial render: ${error.message}`, { cause: error })
            }

            // Patch data in-place. The returned object IS the original data,
            // now with reactive getters/setters on every property.
            // Beispiel (Einstieg):
            // const data = { person: { name: 'Anna' } }
            // makeReactive(data) => data.person.name = 'Lisa' löst Refresh aus.
            makeReactive(data)

            return data
        }
    }
})()

export default TemplateEngine
