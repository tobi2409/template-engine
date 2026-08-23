import { beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import Notifier from '../../../src/components/reactivity-helpers/notifier.js'
import NodeHolders from '../../../src/components/utils/node-holders.js'

const { window } = new JSDOM('<!DOCTYPE html><body></body>')
global.document = window.document
global.Node = window.Node

const { nodeHoldersByKeys } = NodeHolders

beforeEach(() => {
    nodeHoldersByKeys.clear()
})

describe('Notifier', () => {
    test('refreshes holders for the changed key and its dependencies', () => {
        const data = { name: 'Bob', greeting: 'Hello Bob' }
        const nameNode = document.createElement('span')
        const greetingNode = document.createElement('span')

        nodeHoldersByKeys.appendToKey('name', { action: 'updateGet', node: nameNode })
        nodeHoldersByKeys.appendToKey('greeting', { action: 'updateGet', node: greetingNode })

        Notifier.notifyKeyChange(data, 'name', { name: ['greeting'] })

        assert.equal(nameNode.textContent, 'Bob')
        assert.equal(greetingNode.textContent, 'Hello Bob')
    })
})