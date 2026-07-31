// Notify dependent nodes

import RefreshDelegator from '../refresh-delegator.js'
import NodeHolders from './node-holders.js'

// Find all dependency keys that match the changed fullKey
// Supports nested paths: if 'model.rawPersonData.0.name' changes,
// dependencies on 'model.rawPersonData' should also be triggered
// Recursively resolves transitive dependencies: A → B → C
const Notifier = (function () {
    function findMatchingDependencies(fullKey, dependencies, visited = new Set()) {
        if (visited.has(fullKey)) {
            return []
        }

        visited.add(fullKey)

        const matches = []

        if (dependencies[fullKey]) {
            matches.push(...dependencies[fullKey])
        }

        for (const [dependencyKey, dependencyValue] of Object.entries(dependencies)) {
            if (fullKey.startsWith(dependencyKey + '.')) {
                const suffix = fullKey.substring(dependencyKey.length)
                for (const dependent of dependencyValue) {
                    matches.push(dependent + suffix)
                }
            }
        }

        const allMatches = [...matches]
        for (const match of matches) {
            const transitive = findMatchingDependencies(match, dependencies, visited)
            allMatches.push(...transitive)
        }

        return [...new Set(allMatches)]
    }

    function notifyDependencies(data, dependencyValues, sourceChange = null) {
        for (const dependencyValue of dependencyValues || []) {
            const action = sourceChange?.action || NodeHolders.nodeHoldersByKeys.getByKey(dependencyValue)?.get('holders')?.[0]?.action || 'update'

            const dependencyChange = {
                fullKey: dependencyValue,
                action: action
            }

            if (sourceChange) {
                if (sourceChange.items) {
                    dependencyChange.items = sourceChange.items
                }

                if (sourceChange.startIndex !== undefined) {
                    dependencyChange.startIndex = sourceChange.startIndex
                }

                if (sourceChange.deleteCount !== undefined) {
                    dependencyChange.deleteCount = sourceChange.deleteCount
                }
            }

            RefreshDelegator.refresh(data, dependencyChange)
        }
    }

    return {
        findMatchingDependencies,
        notifyDependencies
    }
})()

export default Notifier