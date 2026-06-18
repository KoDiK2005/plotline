export interface Choice {
  id: string
  text: string
  targetNodeId: string | null
}

export interface StoryNode {
  id: string
  title: string
  text: string
  choices: Choice[]
  position: { x: number; y: number }
}

export interface Story {
  id: string
  title: string
  description: string
  startNodeId: string | null
  nodes: Record<string, StoryNode>
  createdAt: number
  updatedAt: number
}
