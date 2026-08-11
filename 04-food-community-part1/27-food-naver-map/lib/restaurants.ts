// 하이파이 핸드오프용 더미 데이터 — 메인·상세·마이페이지가 공유
export type Restaurant = {
  id: string;
  photoUrl: string;
  /** 카테고리 태그 (한식·카페·양식 등) */
  tag: string;
  name: string;
  /** 카드용 짧은 주소 */
  address: string;
  /** 상세페이지용 전체 주소 */
  fullAddress: string;
  author: string;
  /** 카드 메타용 상대 시간 (예: "2일 전") */
  postedAt: string;
  /** 상세페이지용 작성일 */
  postedDate: string;
  photoCount: number;
  content: string;
};

export const RESTAURANTS: Restaurant[] = [
  {
    id: "grandma-kalguksu",
    photoUrl:
      "https://images.unsplash.com/photo-1775883374700-bddbb6c80fcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5NjZ8&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "한식",
    name: "할머니 손칼국수",
    address: "구로구 개봉로 12",
    fullAddress: "서울 구로구 개봉로 12",
    author: "김구로",
    postedAt: "2일 전",
    postedDate: "2026년 7월 22일",
    photoCount: 3,
    content:
      "골목 안쪽에 숨어있어서 아는 사람만 가는 칼국수집이에요. 멸치 육수가 진하고 면발이 쫄깃합니다.\n\n주차는 가게 앞에 3~4대 정도 가능하고, 주말 점심에는 대기가 조금 있어요. 아이 의자도 있어서 가족 단위로 가기 좋았습니다.",
  },
  {
    id: "alley-roastery",
    photoUrl:
      "https://images.unsplash.com/photo-1623659228341-21bc94462e9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5Njd8&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "카페",
    name: "골목 안 로스터리",
    address: "광명시 하안로 45",
    fullAddress: "경기 광명시 하안로 45",
    author: "이주말",
    postedAt: "4일 전",
    postedDate: "2026년 7월 20일",
    photoCount: 2,
    content:
      "간판이 작아서 지나치기 쉬운 로스터리 카페예요. 직접 볶은 원두로 내려주는 핸드드립이 일품입니다.\n\n좌석이 많지 않아서 오후엔 자리 잡기가 어려울 수 있어요. 조용히 책 읽기 좋은 분위기입니다.",
  },
  {
    id: "forest-pasta",
    photoUrl:
      "https://images.unsplash.com/photo-1669880210910-57960a74e1db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5Njd8&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "양식",
    name: "숲속 파스타집",
    address: "부천시 원미로 88",
    fullAddress: "경기 부천시 원미로 88",
    author: "박커플",
    postedAt: "6일 전",
    postedDate: "2026년 7월 18일",
    photoCount: 4,
    content:
      "주택가 안쪽 정원 딸린 파스타집이에요. 창가 자리에서 보이는 나무들 덕분에 숲속에 온 기분이 납니다.\n\n예약 없이 가면 30분 정도 기다릴 수 있어요. 라구 파스타와 티라미수 조합 추천합니다.",
  },
  {
    id: "giwa-boribap",
    photoUrl:
      "https://images.unsplash.com/photo-1589899476489-2b5e3e2b323f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5Njh8&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "한식",
    name: "기와집 보리밥",
    address: "양천구 신월로 3",
    fullAddress: "서울 양천구 신월로 3",
    author: "최나들",
    postedAt: "1주 전",
    postedDate: "2026년 7월 14일",
    photoCount: 3,
    content:
      "오래된 기와집을 개조한 보리밥집이에요. 나물 반찬이 정갈하게 나오고 된장찌개가 구수합니다.\n\n어르신 모시고 가기 좋은 분위기예요. 점심시간엔 근처 직장인들로 붐비니 조금 일찍 가세요.",
  },
  {
    id: "moonlight-sushi",
    photoUrl:
      "https://images.unsplash.com/photo-1734313276340-cb45345c4454?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5NjV8&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "일식",
    name: "달빛 초밥집",
    address: "구로구 디지털로 27",
    fullAddress: "서울 구로구 디지털로 27",
    author: "정야식",
    postedAt: "1주 전",
    postedDate: "2026년 7월 13일",
    photoCount: 2,
    content:
      "저녁에만 여는 작은 초밥집이에요. 그날 들어온 생선으로만 구성되는 오마카세가 가성비 좋습니다.\n\n바 좌석 8개가 전부라 예약은 필수예요. 사장님이 재료 설명을 친절하게 해주십니다.",
  },
  {
    id: "sunny-bunsik",
    photoUrl:
      "https://images.unsplash.com/photo-1645536024589-0c25fb936d74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    tag: "분식",
    name: "양지 분식",
    address: "구로구 개봉로 31",
    fullAddress: "서울 구로구 개봉로 31",
    author: "김구로",
    postedAt: "2주 전",
    postedDate: "2026년 7월 6일",
    photoCount: 1,
    content:
      "초등학교 앞 30년 된 분식집이에요. 떡볶이 국물이 걸쭉하고 튀김이 항상 갓 튀겨져 나옵니다.\n\n오후 4시쯤 가면 하교하는 아이들로 북적여요. 포장하면 어묵 국물을 넉넉히 챙겨주십니다.",
  },
];

export function getRestaurant(id: string): Restaurant | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}

/** 카드용 메타 문자열 (예: "김구로 · 2일 전") */
export function cardMeta(r: Restaurant): string {
  return `${r.author} · ${r.postedAt}`;
}
