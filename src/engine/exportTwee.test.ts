import { describe, expect, it } from 'vitest'
import {
  addChoice,
  addVariable,
  createStory,
  linkChoice,
  setChoiceCondition,
  setChoiceEffects,
  updateNode,
} from './storyOps'
import { buildTweeScript } from './exportTwee'

describe('buildTweeScript', () => {
  it('emits StoryTitle, StoryData and the start passage', () => {
    const story = createStory('My Story')
    const twee = buildTweeScript(story)
    expect(twee).toContain(':: StoryTitle\nMy Story')
    expect(twee).toContain(':: StoryData')
    expect(twee).toContain('"format": "SugarCube"')
    expect(twee).toContain('"start":')
  })

  it('emits passage for each scene in BFS order', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { title: 'Begin', text: 'It starts.' })
    const twee = buildTweeScript(story)
    expect(twee).toContain(':: Begin\nIt starts.')
  })

  it('emits unconditional links as [[text|target]] syntax', () => {
    let story = createStory('Links')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { title: 'Start', text: '' })
    story = addChoice(story, startId, 'Go right')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, startId)
    const twee = buildTweeScript(story)
    expect(twee).toContain('[[Go right|Start]]')
  })

  it('wraps conditional choices in <<if>> blocks', () => {
    let story = createStory('Cond')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { title: 'Hall', text: '' })
    const { story: withVar, variableId } = addVariable(story, 'Life', 0)
    story = withVar
    story = addChoice(story, startId, 'Secret door')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, startId)
    story = setChoiceCondition(story, startId, choiceId, { variableId, comparator: 'gte', value: 5 })
    const twee = buildTweeScript(story)
    expect(twee).toContain('<<if $Life gte 5>>[[Secret door|Hall]]<</if>>')
  })

  it('emits StoryInit with initial variable values', () => {
    let story = createStory('Vars')
    const { story: withVar } = addVariable(story, 'Gold', 10)
    story = withVar
    const twee = buildTweeScript(story)
    expect(twee).toContain(':: StoryInit\n<<set $Gold to 10>>')
  })

  it('generates effect passages and links through them for choices with effects', () => {
    let story = createStory('Effects')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { title: 'Cave', text: '' })
    const { story: withVar, variableId } = addVariable(story, 'Gold', 0)
    story = withVar
    story = addChoice(story, startId, 'Mine')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, startId)
    story = setChoiceEffects(story, startId, choiceId, [{ variableId, op: 'add', value: 5 }])
    const twee = buildTweeScript(story)
    expect(twee).toMatch(/\[\[Mine\|_eff_[a-z0-9]+\]\]/)
    expect(twee).toContain('<<set $Gold to $Gold + 5>>')
    expect(twee).toContain('<<goto "Cave">>')
  })

  it('marks scenes with no linked choices as ending', () => {
    const story = createStory('End Test')
    const twee = buildTweeScript(story)
    expect(twee).toContain('/% Конец истории %/')
  })

  it('skips StoryInit when the story has no variables', () => {
    const story = createStory('No Vars')
    const twee = buildTweeScript(story)
    expect(twee).not.toContain(':: StoryInit')
  })
})
