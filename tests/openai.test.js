import { test } from 'node:test'
import assert from 'node:assert/strict'
import { requestReply, MODEL } from '../src/openai.js'

const history = [{ role: 'user', content: '안녕' }, { role: 'assistant', content: '반가워요' }, { role: 'user', content: '이어서 질문' }]
function mockResponse(t, data, status = 200) {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify(data), { status }))
}
test('대화 전체를 보내고 reasoning 뒤의 여러 텍스트를 추출한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses')
    assert.equal(options.headers.Authorization, 'Bearer test-only')
    const body = JSON.parse(options.body)
    assert.equal(body.model, MODEL)
    assert.equal(body.store, false)
    assert.deepEqual(body.input, history)
    return new Response(JSON.stringify({ status: 'completed', output: [
      { type: 'reasoning' },
      { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: '첫 문장' }, { type: 'output_text', text: '다음 문장' }] },
    ] }))
  })
  assert.equal(await requestReply('test-only', history), '첫 문장\n다음 문장')
})
for (const [status, code, pattern] of [[401, 'invalid_api_key', /유효하지/], [403, '', /권한/], [404, '', /모델/], [429, 'insufficient_quota', /잔액/], [429, 'rate_limit_exceeded', /한도/], [500, '', /서비스 오류/]]) {
  test(`HTTP ${status} ${code} 오류 안내`, async (t) => {
    mockResponse(t, { error: { code } }, status)
    await assert.rejects(requestReply('test-only', history), pattern)
  })
}
test('미완료 응답은 성공 처리하지 않는다', async (t) => {
  mockResponse(t, { status: 'incomplete', output: [] })
  await assert.rejects(requestReply('test-only', history), /완료되지/)
})
test('빈 텍스트 응답을 감지한다', async (t) => {
  mockResponse(t, { status: 'completed', output: [] })
  await assert.rejects(requestReply('test-only', history), /텍스트가 없어요/)
})
test('거절 응답을 표시한다', async (t) => {
  mockResponse(t, { status: 'completed', output: [{ type: 'message', role: 'assistant', content: [{ type: 'refusal', refusal: '답변할 수 없어요' }] }] })
  assert.equal(await requestReply('test-only', history), '답변할 수 없어요')
})
test('네트워크 오류를 안내한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(requestReply('test-only', history), /인터넷 연결/)
})
test('시간 초과를 안내한다', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => { throw new DOMException('Timeout', 'TimeoutError') })
  await assert.rejects(requestReply('test-only', history), /대기 시간/)
})
