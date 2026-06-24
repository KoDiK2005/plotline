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
  /** Author-only notes, never shown to the player (in-app or in HTML export). */
  notes: string
}

export type VariableType = 'number' | 'boolean'

export interface StoryVariable {
  id: string
  name: string
  initialValue: number
  /** Defaults to 'number' when absent, for stories saved before this field existed. */
  type?: VariableType
}

export interface Story {
  id: string
  title: string
  description: string
  /** Display name of the writer, shown publicly on shared ratings. Defaults to '' for stories saved before this field existed. */
  author: string
  /** Stable id of the writer who created this story, used to attribute shared likes/views to them. Defaults to '' for stories saved before this field existed. */
  writerId: string
  startNodeId: string | null
  nodes: Record<string, StoryNode>
  variables: StoryVariable[]
  createdAt: number
  updatedAt: number
}
