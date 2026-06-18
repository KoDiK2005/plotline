export type Comparator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'

export interface ChoiceCondition {
  variableId: string
  comparator: Comparator
  value: number
}

export interface ChoiceEffect {
  variableId: string
  op: 'set' | 'add'
  value: number
}

export interface Choice {
  id: string
  text: string
  targetNodeId: string | null
  condition: ChoiceCondition | null
  effects: ChoiceEffect[]
}

export interface StoryNode {
  id: string
  title: string
  text: string
  choices: Choice[]
  position: { x: number; y: number }
}

export interface StoryVariable {
  id: string
  name: string
  initialValue: number
}

export interface Story {
  id: string
  title: string
  description: string
  startNodeId: string | null
  nodes: Record<string, StoryNode>
  variables: StoryVariable[]
  createdAt: number
  updatedAt: number
}
