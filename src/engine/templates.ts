import type { Story } from '../types/story'
import { addChoice, addNode, createStory, linkChoice, updateNode } from './storyOps'

export type TemplateId = 'blank' | 'mystery' | 'quest'

export interface WriterIdentity {
  author: string
  writerId: string
}

interface Template {
  id: TemplateId
  label: string
  description: string
  build: (title: string, identity: WriterIdentity) => Story
}

function buildMysteryTemplate(title: string, identity: WriterIdentity): Story {
  let story = createStory(title, '', identity.author, identity.writerId)
  const startId = story.startNodeId!
  story = updateNode(story, startId, {
    title: 'Завязка',
    text: 'Происходит загадочное событие. Герою нужно разобраться, что случилось.',
  })

  const { story: s1, nodeId: cluesId } = addNode(story, { x: 280, y: -120 })
  story = updateNode(s1, cluesId, {
    title: 'Сбор улик',
    text: 'Герой осматривает место происшествия и находит первые подсказки.',
  })

  const { story: s2, nodeId: suspectId } = addNode(story, { x: 280, y: 120 })
  story = updateNode(s2, suspectId, {
    title: 'Допрос подозреваемого',
    text: 'Герой встречается с тем, кто может знать больше, чем говорит.',
  })

  const { story: s3, nodeId: resolutionId } = addNode(story, { x: 560, y: 0 })
  story = updateNode(s3, resolutionId, {
    title: 'Разгадка',
    text: 'Все нити сходятся в одной точке, и тайна наконец раскрыта.',
  })

  story = addChoice(story, startId, 'Осмотреть место происшествия')
  story = linkChoice(story, startId, story.nodes[startId].choices[0].id, cluesId)
  story = addChoice(story, startId, 'Сразу найти подозреваемого')
  story = linkChoice(story, startId, story.nodes[startId].choices[1].id, suspectId)

  story = addChoice(story, cluesId, 'Сопоставить улики и предъявить обвинение')
  story = linkChoice(story, cluesId, story.nodes[cluesId].choices[0].id, resolutionId)

  story = addChoice(story, suspectId, 'Дожать признание')
  story = linkChoice(story, suspectId, story.nodes[suspectId].choices[0].id, resolutionId)

  return story
}

function buildQuestTemplate(title: string, identity: WriterIdentity): Story {
  let story = createStory(title, '', identity.author, identity.writerId)
  const startId = story.startNodeId!
  story = updateNode(story, startId, {
    title: 'Зов',
    text: 'Героя зовут в путешествие, которое изменит всё.',
  })

  const { story: s1, nodeId: prepId } = addNode(story, { x: 280, y: -100 })
  story = updateNode(s1, prepId, {
    title: 'Подготовка',
    text: 'Прежде чем отправиться в путь, герой готовится к тому, что ждёт впереди.',
  })

  const { story: s2, nodeId: trialId } = addNode(story, { x: 560, y: -100 })
  story = updateNode(s2, trialId, {
    title: 'Испытание',
    text: 'На пути встаёт серьёзное препятствие, которое нельзя обойти.',
  })

  const { story: s3, nodeId: victoryId } = addNode(story, { x: 840, y: -180 })
  story = updateNode(s3, victoryId, {
    title: 'Победа',
    text: 'Герой справляется с испытанием и возвращается домой другим человеком.',
  })

  const { story: s4, nodeId: defeatId } = addNode(story, { x: 560, y: 140 })
  story = updateNode(s4, defeatId, {
    title: 'Поражение',
    text: 'Путь обрывается раньше, чем герой успевает доказать себя.',
  })

  story = addChoice(story, startId, 'Отправиться в путь')
  story = linkChoice(story, startId, story.nodes[startId].choices[0].id, prepId)
  story = addChoice(story, startId, 'Остаться дома')
  story = linkChoice(story, startId, story.nodes[startId].choices[1].id, defeatId)

  story = addChoice(story, prepId, 'Выучиться у наставника')
  story = linkChoice(story, prepId, story.nodes[prepId].choices[0].id, trialId)

  story = addChoice(story, trialId, 'Пройти испытание')
  story = linkChoice(story, trialId, story.nodes[trialId].choices[0].id, victoryId)
  story = addChoice(story, trialId, 'Свернуть с пути')
  story = linkChoice(story, trialId, story.nodes[trialId].choices[1].id, defeatId)

  return story
}

export const TEMPLATES: Template[] = [
  {
    id: 'blank',
    label: 'Пустая история',
    description: 'Один лист — начните с чистого листа.',
    build: (title, identity) => createStory(title, '', identity.author, identity.writerId),
  },
  {
    id: 'mystery',
    label: 'Детектив',
    description: '4 сцены: завязка, две ветки расследования и общая разгадка.',
    build: buildMysteryTemplate,
  },
  {
    id: 'quest',
    label: 'Квест',
    description: '5 сцен: зов, подготовка, испытание и две альтернативные концовки.',
    build: buildQuestTemplate,
  },
]

export function buildFromTemplate(
  templateId: TemplateId,
  title: string,
  identity: WriterIdentity = { author: '', writerId: '' },
): Story {
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0]
  return template.build(title, identity)
}
