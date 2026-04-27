import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import ts from 'typescript'

const source = await readFile(new URL('../src/lib/transcription/transcript-state.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022
  }
})

const module = { exports: {} }
const context = vm.createContext({
  module,
  exports: module.exports,
  Date,
  console
})

vm.runInContext(outputText, context, {
  filename: 'transcript-state.ts'
})

const { createEmptyTranscriptState, transcriptReducer } = module.exports

function segment(id, text) {
  return {
    id,
    sessionId: 'session-1',
    text,
    final: true,
    createdAt: '2026-04-27T00:00:00.000Z'
  }
}

function finalMessage(segmentId, text) {
  return {
    type: 'final',
    sessionId: 'session-1',
    segmentId,
    text
  }
}

function partialMessage(segmentId, text) {
  return {
    type: 'partial',
    sessionId: 'session-1',
    segmentId,
    text
  }
}

{
  const state = {
    ...createEmptyTranscriptState(),
    segments: [segment('1', 'Hello world')]
  }
  const next = transcriptReducer(state, {
    type: 'ASR_FINAL',
    message: finalMessage('2', 'This is a test')
  })

  assert.deepEqual(
    Array.from(next.segments, (entry) => entry.text),
    ['Hello world', 'This is a test'],
    'final ASR messages append instead of replacing existing text'
  )
}

{
  const state = {
    ...createEmptyTranscriptState(),
    segments: [segment('1', 'Previous final text')]
  }
  const next = transcriptReducer(state, {
    type: 'ASR_PARTIAL',
    message: partialMessage('draft-1', 'Current live text')
  })

  assert.equal(next.segments[0].text, 'Previous final text')
  assert.equal(next.draftSegment?.text, 'Current live text')
}

{
  const withDraft = transcriptReducer(createEmptyTranscriptState(), {
    type: 'ASR_PARTIAL',
    message: partialMessage('draft-1', 'Current live text')
  })
  const committed = transcriptReducer(withDraft, {
    type: 'ASR_FINAL',
    message: finalMessage('draft-1', 'Current live text completed')
  })

  assert.equal(committed.draftSegment, null)
  assert.deepEqual(Array.from(committed.segments, (entry) => entry.text), ['Current live text completed'])
}

{
  const state = {
    ...createEmptyTranscriptState(),
    segments: [segment('1', 'Keep this text')]
  }
  const stopped = transcriptReducer(state, { type: 'CLEAR_DRAFT' })

  assert.deepEqual(Array.from(stopped.segments, (entry) => entry.text), ['Keep this text'])
}

{
  const state = {
    ...createEmptyTranscriptState(),
    segments: [segment('1', 'Existing segment')]
  }
  const nextChunk = transcriptReducer(state, {
    type: 'ASR_PARTIAL',
    message: partialMessage('draft-2', 'New chunk draft')
  })

  assert.deepEqual(Array.from(nextChunk.segments, (entry) => entry.text), ['Existing segment'])
  assert.equal(nextChunk.draftSegment?.text, 'New chunk draft')
}

{
  const state = {
    ...createEmptyTranscriptState(),
    segments: [segment('1', 'Delete me'), segment('2', 'Keep me')]
  }
  const next = transcriptReducer(state, {
    type: 'DELETE_SEGMENT',
    segmentId: '1'
  })

  assert.deepEqual(Array.from(next.segments, (entry) => entry.text), ['Keep me'])
}

console.log('Transcript reducer tests passed.')
