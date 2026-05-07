export interface ComfortLine {
  kr: string;
  en: string;
}

export const COMFORT_LINES: readonly ComfortLine[] = [
  { kr: '오늘 여기까지 온 것만으로도 충분해요.', en: 'Just getting here today is enough.' },
  { kr: '감정은 쓰레기가 아니에요. 다만 잠시 내려놓아도 돼요.', en: "Feelings aren't trash — but you can put them down for now." },
  { kr: '괜찮지 않아도 괜찮아요.', en: "It's okay not to be okay." },
  { kr: '당신의 무게를 잠시 맡겨두세요.', en: 'Leave the weight here, just for a moment.' },
  { kr: '이 불빛은 당신만 보고 있어요.', en: 'This flame is only watching you.' },
  { kr: '타고 남은 자리에 새로운 공간이 생겨요.', en: 'Where it burns, space opens up.' },
  { kr: '조용히, 천천히, 충분히.', en: 'Quiet. Slow. Enough.' },
  { kr: '오늘은 이만큼만 해도 잘한 거예요.', en: 'This much, today, is well done.' },
] as const;
