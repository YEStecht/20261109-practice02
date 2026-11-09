import './style.css'
import { requestReply } from './openai.js'

const apiKey = import.meta.env.VITE_OPENAI_API_KEY?.trim()
const form = document.querySelector('#chat-form')
const input = document.querySelector('#message')
const send = document.querySelector('#send')
const reset = document.querySelector('#reset')
const messages = document.querySelector('#messages')
const empty = document.querySelector('#empty')
const status = document.querySelector('#status')
const notice = document.querySelector('#notice')
const loading = document.querySelector('#loading')
let history = []
let busy = false

function setStatus(text, state = 'idle') {
  status.textContent = text
  status.dataset.state = state
}
setStatus(apiKey ? '연결 미확인' : '키 미설정')
notice.textContent = apiKey ? '메시지를 보내면 실제 요청 결과를 확인할 수 있어요.' : '.env.local에 키를 입력하고 개발 서버를 재시작해 주세요.'

function addMessage(role, text) {
  const item = document.createElement('li')
  item.className = role
  const label = document.createElement('strong')
  label.textContent = role === 'user' ? '청취자' : 'DJ 온기'
  const body = document.createElement('p')
  body.textContent = text
  item.append(label, body)
  messages.append(item)
  empty.hidden = true
  item.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  return item
}
function setBusy(value) {
  busy = value
  send.disabled = reset.disabled = input.disabled = value
  loading.hidden = !value
  messages.setAttribute('aria-busy', String(value))
  send.textContent = value ? '사연 읽는 중…' : '사연 보내기 ↗'
}
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const text = input.value.trim()
  if (busy || !text) return
  if (!apiKey) {
    setStatus('키 미설정')
    notice.textContent = '.env.local의 VITE_OPENAI_API_KEY를 입력하고 개발 서버를 재시작해 주세요.'
    return
  }
  const pending = [...history, { role: 'user', content: text }]
  const userMessage = addMessage('user', text)
  input.value = ''
  notice.textContent = ''
  setBusy(true)
  try {
    const reply = await requestReply(apiKey, pending)
    history = [...pending, { role: 'assistant', content: reply }]
    addMessage('assistant', reply)
    setStatus('요청 성공', 'success')
    notice.textContent = 'DJ 온기의 답장이 도착했어요. 이어지는 이야기도 들려주세요.'
  } catch (error) {
    userMessage.remove()
    empty.hidden = messages.children.length > 0
    input.value = text
    setStatus('요청 실패', 'error')
    notice.textContent = error.message
  } finally {
    setBusy(false)
    input.focus()
  }
})
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    form.requestSubmit()
  }
})
reset.addEventListener('click', () => {
  if (busy) return
  history = []
  messages.replaceChildren()
  empty.hidden = false
  input.value = ''
  notice.textContent = '대화를 초기화했어요. 다음 요청에는 이전 대화가 포함되지 않아요.'
  input.focus()
})
