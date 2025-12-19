// Notify dependent nodes

import { refresh } from '../refresh.js'
import { nodeHoldersByKeys } from './node-holders.js'

// Find all dependency keys that match the changed fullKey
// Supports nested paths: if 'model.rawPersonData.0.name' changes,
// dependencies on 'model.rawPersonData' should also be triggered
export function findMatchingDependencies(fullKey, dependencies) {
    const matches = []
    
    // Direct match
    if (dependencies[fullKey]) {
        matches.push(...dependencies[fullKey])
    }
    
    // Check if fullKey is a subpath of any dependency key
    // e.g., fullKey='model.rawPersonData.0.name' matches dependencyKey='model.rawPersonData'
    for (const [depKey, dependents] of Object.entries(dependencies)) {
        if (fullKey.startsWith(depKey + '.')) {
            // Extract the suffix after the dependency key
            // fullKey='model.rawPersonData.0.name', depKey='model.rawPersonData' → suffix='.0.name'
            const suffix = fullKey.substring(depKey.length)
            
            // Append suffix to each dependent to get the specific path
            // e.g., 'beautifiedPersonData' + '.0.name' = 'beautifiedPersonData.0.name'
            for (const dependent of dependents) {
                matches.push(dependent + suffix)
            }
        }
    }
    
    return [...new Set(matches)] // Remove duplicates
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
                if (sourceChange.items) dependencyChange.items = sourceChange.items
                if (sourceChange.startIndex !== undefined) dependencyChange.startIndex = sourceChange.startIndex
                if (sourceChange.deleteCount !== undefined) dependencyChange.deleteCount = sourceChange.deleteCount
            }
            console.log(dependencyChange)
            refresh(data, dependencyChange)
        }
    } catch (error) {
        throw new Error(`[TemplateEngine] Error notifying dependencies: ${error.message}`)
    }
}