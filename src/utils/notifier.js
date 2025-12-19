// Notify dependent nodes

import { refresh } from '../refresh.js'
import { nodeHoldersByKeys } from './node-holders.js'

// Find all dependency keys that match the changed fullKey
// Supports nested paths: if 'model.rawPersonData.0.name' changes,
// dependencies on 'model.rawPersonData' should also be triggered
// Recursively resolves transitive dependencies: A → B → C
export function findMatchingDependencies(fullKey, dependencies, visited = new Set()) {
    if (visited.has(fullKey)) {
        return []
    }

    visited.add(fullKey)
    
    const matches = []
    
    // Direct match
    if (dependencies[fullKey]) {
        matches.push(...dependencies[fullKey])
    }
    
    // Check if fullKey is a subpath of any dependency key
    // e.g., fullKey='model.rawPersonData.0.name' matches dependencyKey='model.rawPersonData'
    for (const [dependencyKey, dependencyValue] of Object.entries(dependencies)) {
        if (fullKey.startsWith(dependencyKey + '.')) {
            // Extract the suffix after the dependency key
            // fullKey='model.rawPersonData.0.name', depKey='model.rawPersonData' → suffix='.0.name'
            const suffix = fullKey.substring(dependencyKey.length)
            
            // Append suffix to each dependent to get the specific path
            // e.g., 'beautifiedPersonData' + '.0.name' = 'beautifiedPersonData.0.name'
            for (const dependent of dependencyValue) {
                matches.push(dependent + suffix)
            }
        }
    }
    
    // Recursively find transitive dependencies
    // e.g., if fullName depends on model.firstName, and fullInfo depends on fullName,
    // then model.firstName changing should also refresh fullInfo
    const allMatches = [...matches]
    for (const match of matches) {
        const transitive = findMatchingDependencies(match, dependencies, visited)
        allMatches.push(...transitive)
    }
    
    return [...new Set(allMatches)] // Remove duplicates
}

export function notifyDependencies(data, dependencyValues, sourceChange = null) {
    try {
        for (const dependencyValue of dependencyValues || []) {
            // If we have a source change object (e.g., from array push), use its action
            // Otherwise, determine action from the NodeHolder
            const action = sourceChange?.action || nodeHoldersByKeys.getByKey(dependencyValue)?.get('holders')?.[0]?.action || 'update'
            
            const dependencyChange = { 
                fullKey: dependencyValue,
                action: action
            }
            
            // Copy additional properties from source change (e.g., items for push, startIndex for splice)
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

            refresh(data, dependencyChange)
        }
    } catch (error) {
        throw new Error(`[TemplateEngine] Error notifying dependencies: ${error.message}`)
    }
}