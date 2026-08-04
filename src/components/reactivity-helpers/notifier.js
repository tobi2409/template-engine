import NodeHolders from '../utils/node-holders.js'
import RefreshDelegator from '../refresh-delegator.js'
import DependencyNotifier from '../utils/dependency-notifier.js'

const Notifier = (function () {
    function notifyKeyChange(data, fullKey, dependencies = {}) {
        notifyChange(data, fullKey, undefined, dependencies)
    }

    function notifyChange(data, fullKey, change = undefined, dependencies = {}) {
        const linkedNodeHolders = NodeHolders.nodeHoldersByKeys.getByKey(fullKey)
        const matchingDependents = DependencyNotifier.findMatchingDependencies(fullKey, dependencies)

        if ((!linkedNodeHolders || linkedNodeHolders.get('holders')?.length === 0)
            && matchingDependents.length === 0) {
            return
        }

        if (linkedNodeHolders?.get('holders')?.length > 0) {
            if (change) {
                RefreshDelegator.refresh(data, change)
            } else {
                for (const nodeHolder of linkedNodeHolders.get('holders')) {
                    RefreshDelegator.refresh(data, { fullKey, action: nodeHolder.action })
                }
            }
        }

        DependencyNotifier.notifyDependencies(data, matchingDependents, change)
    }

    return { notifyKeyChange, notifyChange }
})()

export default Notifier