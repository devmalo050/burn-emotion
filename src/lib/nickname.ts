const ADJ_KR = [
  '지친', '흐린', '무거운', '조용한', '외로운', '젖은', '흩어진', '굽은', '텅 빈',
  '느린', '차가운', '어슴푸레한', '낡은', '조각난', '흔들리는', '잔잔한', '헝클어진',
  '깜빡이는', '눅눅한', '삐걱이는', '고요한', '찢어진', '남겨진',
] as const;

const NOUN_KR = [
  '구름', '달팽이', '고양이', '우산', '라디오', '촛불', '가로등', '그림자', '주전자',
  '엽서', '상자', '파도', '스웨터', '안개', '전구', '노트', '봉투', '청바지',
  '테이프', '양말', '수첩', '유리병', '지하철',
] as const;

const ADJ_EN = [
  'tired', 'blue', 'muffled', 'quiet', 'lonely', 'soggy', 'scattered', 'bent',
  'hollow', 'slow', 'fading', 'creaky', 'dim', 'torn', 'wobbly', 'still', 'tangled',
] as const;

const NOUN_EN = [
  'cloud', 'snail', 'lamp', 'kettle', 'envelope', 'wave', 'sweater', 'fog',
  'bulb', 'note', 'ribbon', 'tape', 'sock', 'jar', 'ticket', 'page',
] as const;

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

export function makeNickname(): string {
  if (Math.random() >= 0.65) {
    return `${pick(ADJ_EN)} ${pick(NOUN_EN)}`;
  }
  return `${pick(ADJ_KR)} ${pick(NOUN_KR)}`;
}
