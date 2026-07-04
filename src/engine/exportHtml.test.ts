import { describe, expect, it } from 'vitest'
import { addChoice, addVariable, createStory, linkChoice, setChoiceCondition, updateMeta, updateNode } from './storyOps'
import { buildStandaloneHtml } from './exportHtml'

describe('buildStandaloneHtml', () => {
  it('embeds the story title and a self-contained script with no external dependencies', () => {
    const story = createStory('My <Story> & "Title"')
    const html = buildStandaloneHtml(story)
    expect(html).toContain('<title>My &lt;Story&gt; &amp; &quot;Title&quot;</title>')
    expect(html).not.toMatch(/<script\s+src=/)
    expect(html).toContain('STORY')
  })

  it('escapes a closing script tag hidden inside story text so the embedded JSON cannot break out', () => {
    let story = createStory('Test')
    const startId = story.startNodeId!
    story = updateNode(story, startId, { text: 'Before </script><script>alert(1)</script> after' })
    const html = buildStandaloneHtml(story)
    expect(html).not.toContain('</script><script>alert(1)</script>')
    expect(html.toLowerCase()).not.toMatch(/<\/script>[^]*alert\(1\)/)
  })

  it('includes condition and effect data needed for the inlined player runtime', () => {
    let story = createStory()
    const startId = story.startNodeId!
    const { story: withVar, variableId } = addVariable(story, 'Key', 0)
    story = withVar
    story = addChoice(story, startId, 'Use key')
    const choiceId = story.nodes[startId].choices[0].id
    story = linkChoice(story, startId, choiceId, startId)
    story = setChoiceCondition(story, startId, choiceId, { variableId, comparator: 'gte', value: 1 })

    const html = buildStandaloneHtml(story)
    expect(html).toContain('"comparator":"gte"')
    expect(html).toContain('meetsCondition')
    expect(html).toContain('applyEffects')
  })

  it('wires up number-key (1-9) choice selection in the embedded player runtime', () => {
    const story = createStory()
    const html = buildStandaloneHtml(story)
    expect(html).toContain("addEventListener('keydown'")
    expect(html).toContain('currentChoices')
    expect(html).toContain("className = 'key'")
  })

  it('omits private author notes from the embedded story JSON', () => {
    let story = createStory()
    const startId = story.startNodeId!
    story = updateNode(story, startId, { notes: 'Secret plan only the author should see' })

    const html = buildStandaloneHtml(story)
    expect(html).not.toContain('Secret plan only the author should see')
    expect(html).not.toContain('notes')
  })

  it('includes localStorage save/resume logic keyed by story id', () => {
    const story = createStory('Save Test')
    const html = buildStandaloneHtml(story)
    expect(html).toContain('SAVE_KEY')
    expect(html).toContain("'plotline-save-'")
    expect(html).toContain('localStorage.setItem')
    expect(html).toContain('localStorage.getItem')
    expect(html).toContain('localStorage.removeItem')
    expect(html).toContain('Продолжить')
    expect(html).toContain('Начать заново')
  })

  it('renders a variable panel when the story has variables', () => {
    let story = createStory('Var Test')
    const { story: withVar } = addVariable(story, 'Courage', 0)
    story = withVar
    const html = buildStandaloneHtml(story)
    expect(html).toContain('Переменные')
    expect(html).toContain('STORY.variables')
    expect(html).toContain("className = 'vars'")
  })

  it('includes the story description below the title when one is set', () => {
    let story = createStory('Described Story')
    story = updateMeta(story, { description: 'A tale of mystery & adventure.' })
    const html = buildStandaloneHtml(story)
    expect(html).toContain('class="description"')
    expect(html).toContain('A tale of mystery &amp; adventure.')
  })

  it('omits the description paragraph when the description is blank', () => {
    const story = createStory('No Description')
    const html = buildStandaloneHtml(story)
    expect(html).not.toContain('class="description"')
  })
})
