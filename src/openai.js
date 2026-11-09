export const MODEL = 'gpt-5.4-mini'

export async function requestReply(apiKey, history) {
  let response
  try {
    response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        instructions: `당신은 '온기 라디오'의 DJ 온기입니다. 사연을 듣고 다정하고 차분한 한국어 존댓말로 답하세요.
사연의 구체적인 마음에 공감하는 짧은 두 문단을 쓰고, '이 사연에 띄우는 노래' 아래 '아티스트 — 곡명'과 추천 이유를 적고, 부담 없는 질문 하나로 마무리하세요.
실제로 존재한다고 확실히 아는 곡 1~2곡만 추천하세요. 곡이나 아티스트를 지어내지 말고 확신이 없으면 취향을 물어보세요. 가사는 인용하지 마세요.
청취자의 장르와 언어 취향, 이전 사연을 반영하고 같은 곡을 불필요하게 반복하지 마세요.
인사나 짧은 질문에는 자연스럽게 답하고 사연 형식을 억지로 적용하지 마세요. 실제 음악을 재생하거나 실시간 음원 정보를 확인했다고 말하지 마세요.
마크다운 표나 강조 기호 없이 읽기 편한 일반 텍스트로 답하세요.`,
        input: history,
        store: false,
      }),
      signal: AbortSignal.timeout(90000),
    })
  } catch (error) {
    if (['TimeoutError', 'AbortError'].includes(error.name)) {
      throw new Error('응답 대기 시간이 초과되었어요. 잠시 후 다시 보내 주세요.')
    }
    throw new Error('API에 연결하지 못했어요. 인터넷 연결, 브라우저의 네트워크 차단 또는 CORS 오류를 확인해 주세요.')
  }
  let data
  try {
    data = await response.json()
  } catch {
    throw new Error(`API 응답을 읽지 못했어요 (HTTP ${response.status}). 다시 시도해 주세요.`)
  }
  if (!response.ok) {
    const reasons = {
      400: '요청 형식이나 대화 길이를 확인해 주세요. 대화를 초기화한 뒤 다시 시도해 보세요.',
      401: 'API Key가 유효하지 않아요. 키를 확인하고 개발 서버를 재시작해 주세요.',
      403: '요청 권한이 없어요. 프로젝트 권한과 API 이용 가능 지역을 확인해 주세요.',
      404: '모델 또는 API를 찾을 수 없어요. 모델 사용 권한을 확인해 주세요.',
      429: data.error?.code === 'insufficient_quota'
        ? 'API 잔액이나 할당량이 부족해요. OpenAI 결제 및 사용 한도를 확인해 주세요.'
        : '요청 한도를 초과했어요. 잠시 기다린 뒤 다시 보내 주세요.',
    }
    throw new Error(`요청 실패 (HTTP ${response.status}). ${reasons[response.status] || 'OpenAI 서비스 오류일 수 있어요. 잠시 후 다시 시도해 주세요.'}`)
  }
  if (data.status !== 'completed') throw new Error('답변 생성이 완료되지 않았어요. 다시 시도하거나 대화를 초기화해 주세요.')
  // REST 응답은 SDK의 output_text 편의 속성 대신 output 배열을 순회합니다.
  const content = (data.output ?? [])
    .filter((item) => item.type === 'message' && item.role === 'assistant')
    .flatMap((item) => item.content ?? [])
  const text = content.filter((item) => item.type === 'output_text').map((item) => item.text).join('\n').trim()
  const refusal = content.find((item) => item.type === 'refusal')?.refusal
  if (!text && !refusal) throw new Error('API 응답에 표시할 텍스트가 없어요. 다시 질문해 주세요.')
  return text || refusal
}
