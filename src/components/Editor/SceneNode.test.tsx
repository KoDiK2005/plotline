import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ReactFlowProvider } from 'reactflow'
import { SceneNode } from './SceneNode'
import type { SceneNodeData } from '../../engine/flowAdapters'

function baseData(overrides: Partial<SceneNodeData> = {}): SceneNodeData {
  return {
    title: 'Лесная тропа',
    text: 'Герой видит волка.',
    isStart: false,
    isUnreachable: false,
    isEnding: false,
    wordCount: 3,
    choices: [],
    ...overrides,
  }
}

function renderNode(data: SceneNodeData) {
  return render(
    <ReactFlowProvider>
      <SceneNode
        id="n1"
        type="scene"
        data={data}
        selected={false}
        zIndex={0}
        isConnectable
        xPos={0}
        yPos={0}
        dragging={false}
      />
    </ReactFlowProvider>,
  )
}

describe('SceneNode', () => {
  it('shows the word count with correct Russian pluralization', () => {
    renderNode(baseData({ wordCount: 1 }))
    expect(screen.getByText('1 слово')).toBeInTheDocument()
  })

  it('uses the 2-4 plural form', () => {
    renderNode(baseData({ wordCount: 3 }))
    expect(screen.getByText('3 слова')).toBeInTheDocument()
  })

  it('uses the 5+ plural form', () => {
    renderNode(baseData({ wordCount: 7 }))
    expect(screen.getByText('7 слов')).toBeInTheDocument()
  })

  it('uses the plural form for the 11-14 exception even though they end in 1-4', () => {
    renderNode(baseData({ wordCount: 11 }))
    expect(screen.getByText('11 слов')).toBeInTheDocument()
  })

  it('shows 0 слов for an empty scene', () => {
    renderNode(baseData({ wordCount: 0, text: '' }))
    expect(screen.getByText('0 слов')).toBeInTheDocument()
  })
})
