// Design tokens — generated from design.pen via Pencil MCP. 수정은 design.pen에서.

export type ColorToken = {
  /** design.pen variables 메뉴의 토큰 이름 */
  name: string;
  cssVar: string;
  light: string;
  dark?: string;
  desc: string;
};

export type ColorGroup = { title: string; tokens: ColorToken[] };

export const colorGroups: ColorGroup[] = [
  {
    "title": "Brand",
    "tokens": [
      {
        "name": "pink-500",
        "cssVar": "--pink-500",
        "light": "#FF3E7F",
        "desc": "주 액센트 — FAB·활성 탭·포인트"
      },
      {
        "name": "pink-600",
        "cssVar": "--pink-600",
        "light": "#E62E6B",
        "desc": "액센트 강조 — 태그 텍스트"
      },
      {
        "name": "pink-200",
        "cssVar": "--pink-200",
        "light": "#FFD9E6",
        "desc": "액센트 서페이스 — 아바타 배경"
      },
      {
        "name": "pink-100",
        "cssVar": "--pink-100",
        "light": "#FFF1F6",
        "desc": "액센트 틴트 — 태그·카테고리 배경"
      }
    ]
  },
  {
    "title": "Text",
    "tokens": [
      {
        "name": "text-primary",
        "cssVar": "--text-primary",
        "light": "#1A1A1F",
        "desc": "본문·제목"
      },
      {
        "name": "text-secondary",
        "cssVar": "--text-secondary",
        "light": "#8A8A93",
        "desc": "보조 텍스트"
      },
      {
        "name": "text-tertiary",
        "cssVar": "--text-tertiary",
        "light": "#B7B7BF",
        "desc": "플레이스홀더·메타"
      }
    ]
  },
  {
    "title": "Surface",
    "tokens": [
      {
        "name": "bg-page",
        "cssVar": "--bg-page",
        "light": "#FFFFFF",
        "desc": "페이지 배경"
      },
      {
        "name": "bg-muted",
        "cssVar": "--bg-muted",
        "light": "#F5F5F7",
        "desc": "입력·스켈레톤·칩 배경"
      },
      {
        "name": "white",
        "cssVar": "--white",
        "light": "#FFFFFF",
        "desc": "고정 흰색 (--white 별칭)"
      }
    ]
  },
  {
    "title": "Border",
    "tokens": [
      {
        "name": "border",
        "cssVar": "--border-subtle",
        "light": "#ECECEF",
        "desc": "카드 테두리·구분선 (pen: border)"
      },
      {
        "name": "border-strong",
        "cssVar": "--border-strong",
        "light": "#DEDEE3",
        "desc": "강조 테두리"
      }
    ]
  },
  {
    "title": "Status",
    "tokens": [
      {
        "name": "danger",
        "cssVar": "--danger",
        "light": "#E5352B",
        "desc": "위험·삭제"
      },
      {
        "name": "danger-bg",
        "cssVar": "--danger-bg",
        "light": "#FDECEA",
        "desc": "위험 배경"
      }
    ]
  },
  {
    "title": "Semantic — UI 컴포넌트",
    "tokens": [
      {
        "name": "--primary",
        "cssVar": "--primary",
        "light": "#FF8400",
        "desc": "Primary 버튼·활성 상태"
      },
      {
        "name": "--primary-foreground",
        "cssVar": "--primary-foreground",
        "light": "#111111",
        "desc": "Primary 전경"
      },
      {
        "name": "--secondary",
        "cssVar": "--secondary",
        "light": "#E7E8E5",
        "desc": "Secondary 버튼",
        "dark": "#2E2E2E"
      },
      {
        "name": "--secondary-foreground",
        "cssVar": "--secondary-foreground",
        "light": "#111111",
        "desc": "Secondary 전경",
        "dark": "#FFFFFF"
      },
      {
        "name": "--destructive",
        "cssVar": "--destructive",
        "light": "#D93C15",
        "desc": "Destructive 버튼",
        "dark": "#FF5C33"
      },
      {
        "name": "--background",
        "cssVar": "--background",
        "light": "#F2F3F0",
        "desc": "페이지 배경(컴포넌트 문서)",
        "dark": "#111111"
      },
      {
        "name": "--foreground",
        "cssVar": "--foreground",
        "light": "#111111",
        "desc": "기본 전경",
        "dark": "#FFFFFF"
      },
      {
        "name": "--card",
        "cssVar": "--card",
        "light": "#FFFFFF",
        "desc": "카드·인풋 서페이스",
        "dark": "#1A1A1A"
      },
      {
        "name": "--card-foreground",
        "cssVar": "--card-foreground",
        "light": "#111111",
        "desc": "카드 전경",
        "dark": "#FFFFFF"
      },
      {
        "name": "--muted",
        "cssVar": "--muted",
        "light": "#F2F3F0",
        "desc": "뮤트 서페이스",
        "dark": "#2E2E2E"
      },
      {
        "name": "--muted-foreground",
        "cssVar": "--muted-foreground",
        "light": "#666666",
        "desc": "뮤트 전경",
        "dark": "#B8B9B6"
      },
      {
        "name": "--accent",
        "cssVar": "--accent",
        "light": "#F2F3F0",
        "desc": "액센트 서페이스",
        "dark": "#111111"
      },
      {
        "name": "--accent-foreground",
        "cssVar": "--accent-foreground",
        "light": "#111111",
        "desc": "액센트 전경",
        "dark": "#F2F3F0"
      },
      {
        "name": "--border",
        "cssVar": "--border",
        "light": "#CBCCC9",
        "desc": "컴포넌트 테두리",
        "dark": "#2E2E2E"
      },
      {
        "name": "--input",
        "cssVar": "--input",
        "light": "#CBCCC9",
        "desc": "인풋 테두리",
        "dark": "#2E2E2E"
      },
      {
        "name": "--ring",
        "cssVar": "--ring",
        "light": "#666666",
        "desc": "포커스 링"
      },
      {
        "name": "--popover",
        "cssVar": "--popover",
        "light": "#FFFFFF",
        "desc": "팝오버 서페이스",
        "dark": "#1A1A1A"
      },
      {
        "name": "--popover-foreground",
        "cssVar": "--popover-foreground",
        "light": "#111111",
        "desc": "팝오버 전경",
        "dark": "#FFFFFF"
      },
      {
        "name": "--white",
        "cssVar": "--white",
        "light": "#FFFFFF",
        "desc": "고정 흰색"
      },
      {
        "name": "--black",
        "cssVar": "--black",
        "light": "#000000",
        "desc": "고정 검정(스크림)"
      }
    ]
  },
  {
    "title": "Feedback — UI 컴포넌트",
    "tokens": [
      {
        "name": "--color-success",
        "cssVar": "--color-success",
        "light": "#DFE6E1",
        "desc": "Success 배경",
        "dark": "#222924"
      },
      {
        "name": "--color-success-foreground",
        "cssVar": "--color-success-foreground",
        "light": "#004D1A",
        "desc": "Success 전경",
        "dark": "#B6FFCE"
      },
      {
        "name": "--color-warning",
        "cssVar": "--color-warning",
        "light": "#E9E3D8",
        "desc": "Warning 배경",
        "dark": "#291C0F"
      },
      {
        "name": "--color-warning-foreground",
        "cssVar": "--color-warning-foreground",
        "light": "#804200",
        "desc": "Warning 전경",
        "dark": "#FF8400"
      },
      {
        "name": "--color-error",
        "cssVar": "--color-error",
        "light": "#E5DCDA",
        "desc": "Error 배경",
        "dark": "#24100B"
      },
      {
        "name": "--color-error-foreground",
        "cssVar": "--color-error-foreground",
        "light": "#8C1C00",
        "desc": "Error 전경",
        "dark": "#FF5C33"
      },
      {
        "name": "--color-info",
        "cssVar": "--color-info",
        "light": "#DFDFE6",
        "desc": "Info 배경",
        "dark": "#222229"
      },
      {
        "name": "--color-info-foreground",
        "cssVar": "--color-info-foreground",
        "light": "#000066",
        "desc": "Info 전경",
        "dark": "#B2B2FF"
      }
    ]
  }
];

export type TypoRole = {
  role: string; family: 'brand' | 'body'; size: number; weight: number;
  lineHeight: number; usage: string;
};

export const typography: TypoRole[] = [
  {
    "role": "display",
    "family": "brand",
    "size": 34,
    "weight": 400,
    "lineHeight": 1.2,
    "usage": "로그인 히어로 브랜드"
  },
  {
    "role": "logo",
    "family": "brand",
    "size": 20,
    "weight": 400,
    "lineHeight": 1.2,
    "usage": "헤더 로고"
  },
  {
    "role": "title-1",
    "family": "body",
    "size": 22,
    "weight": 800,
    "lineHeight": 1.3,
    "usage": "상세 페이지 타이틀"
  },
  {
    "role": "title-2",
    "family": "body",
    "size": 20,
    "weight": 800,
    "lineHeight": 1.3,
    "usage": "페이지 타이틀"
  },
  {
    "role": "title-3",
    "family": "body",
    "size": 16,
    "weight": 700,
    "lineHeight": 1.35,
    "usage": "섹션 타이틀"
  },
  {
    "role": "title-4",
    "family": "body",
    "size": 15,
    "weight": 700,
    "lineHeight": 1.35,
    "usage": "카드 타이틀"
  },
  {
    "role": "body-1",
    "family": "body",
    "size": 16,
    "weight": 400,
    "lineHeight": 1.4,
    "usage": "입력값·강조 본문"
  },
  {
    "role": "body-2",
    "family": "body",
    "size": 14,
    "weight": 400,
    "lineHeight": 1.5,
    "usage": "기본 본문"
  },
  {
    "role": "body-3",
    "family": "body",
    "size": 13,
    "weight": 500,
    "lineHeight": 1.4,
    "usage": "보조 본문(주소·닉네임)"
  },
  {
    "role": "label-1",
    "family": "body",
    "size": 14,
    "weight": 600,
    "lineHeight": 1.4,
    "usage": "버튼·폼 라벨"
  },
  {
    "role": "label-2",
    "family": "body",
    "size": 12,
    "weight": 500,
    "lineHeight": 1.4,
    "usage": "헬퍼·카운터"
  },
  {
    "role": "caption",
    "family": "body",
    "size": 11,
    "weight": 400,
    "lineHeight": 1.4,
    "usage": "메타 정보(작성자·시간)"
  },
  {
    "role": "micro",
    "family": "body",
    "size": 10,
    "weight": 600,
    "lineHeight": 1.4,
    "usage": "태그·탭 라벨"
  }
];

export const fonts = {
  brand: { name: 'Black Han Sans', cssVar: '--font-brand', usage: '브랜드·로고 전용' },
  body: { name: 'Noto Sans KR', cssVar: '--font-body', usage: '본문·UI 전반' },
} as const;

export const spacing = [
  {
    "name": "spacing-8",
    "cssVar": "--spacing-8",
    "value": 8
  },
  {
    "name": "spacing-12",
    "cssVar": "--spacing-12",
    "value": 12
  },
  {
    "name": "spacing-16",
    "cssVar": "--spacing-16",
    "value": 16
  },
  {
    "name": "spacing-20",
    "cssVar": "--spacing-20",
    "value": 20
  },
  {
    "name": "spacing-24",
    "cssVar": "--spacing-24",
    "value": 24
  },
  {
    "name": "spacing-32",
    "cssVar": "--spacing-32",
    "value": 32
  }
];

export const radius = [
  {
    "name": "--radius-m",
    "cssVar": "--radius-m",
    "value": 16
  },
  {
    "name": "--radius-none",
    "cssVar": "--radius-none",
    "value": 0
  },
  {
    "name": "--radius-pill",
    "cssVar": "--radius-pill",
    "value": 999
  }
];

export const iconSizes = [16, 20, 24, 32] as const;
