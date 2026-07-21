'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { loadPrefs, savePrefs, type Prefs } from '@/lib/store';
import { getProfile, getSession, signOut, updateNickname } from '@/lib/api';
import { hasBackend } from '@/lib/supabase';

/** Settings — 판정 오프셋·볼륨·해상도·닉네임·계정 (8.9, FR-18) */
export default function SettingsPage() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [saved, setSaved] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [serverNickname, setServerNickname] = useState<string | null>(null);

  useEffect(() => {
    setPrefs(loadPrefs());
    void getSession().then((s) => setEmail(s?.user.email ?? null));
    void getProfile().then((p) => p && setServerNickname(p.nickname));
  }, []);

  if (!prefs) return null;

  const update = (patch: Partial<Prefs>) => {
    setPrefs(savePrefs(patch));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  };

  return (
    <main className="screen top" style={{ gap: 18 }}>
      <div className="row">
        <Link href="/home" style={{ fontSize: 20 }}>
          ←
        </Link>
        <strong>설정</strong>
        <span className="dim">{saved ? '저장됨 ✓' : ''}</span>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>닉네임</div>
        <input
          type="text"
          key={serverNickname ?? 'local'}
          defaultValue={serverNickname ?? prefs.nickname}
          maxLength={12}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v.length < 2) return;
            update({ nickname: v }); // 게스트 표시용 미러
            if (email) void updateNickname(v); // 로그인 시 프로필에도 저장 (FR-02)
          }}
        />
        <p className="dim" style={{ marginTop: 6 }}>
          2~12자 · 입력 후 바깥을 탭하면 저장
        </p>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>계정</div>
        {email ? (
          <>
            <p className="dim">{email}</p>
            <button
              className="btn secondary small"
              style={{ marginTop: 8 }}
              onClick={() => {
                void signOut().then(() => router.push('/home'));
              }}
            >
              로그아웃
            </button>
          </>
        ) : hasBackend() ? (
          <>
            <p className="dim">게스트 모드 — 기록이 이 기기에만 저장됩니다</p>
            <Link href="/login" className="btn small" style={{ marginTop: 8 }}>
              로그인
            </Link>
          </>
        ) : (
          <p className="dim">백엔드 미설정 빌드 — 게스트 전용 모드로 동작합니다</p>
        )}
      </div>

      <div className="card">
        <div className="row">
          <div style={{ fontWeight: 700 }}>판정 오프셋</div>
          <span className="badge">{prefs.offsetMs > 0 ? '+' : ''}{prefs.offsetMs}ms</span>
        </div>
        <input
          type="range"
          min={-200}
          max={200}
          step={5}
          value={prefs.offsetMs}
          onChange={(e) => update({ offsetMs: Number(e.target.value) })}
        />
        <p className="dim">
          판정이 계속 늦게/빠르게 나오면 조정하세요. 캘리브레이션에서 자동 측정된 값입니다.
        </p>
        <button
          className="btn secondary small"
          style={{ marginTop: 8 }}
          onClick={() => update({ calibrated: false, offsetMs: 0 })}
        >
          다음 플레이에서 다시 보정하기
        </button>
      </div>

      <div className="card">
        <div className="row">
          <div style={{ fontWeight: 700 }}>음악 볼륨</div>
          <span className="badge">{prefs.volume}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={prefs.volume}
          onChange={(e) => update({ volume: Number(e.target.value) })}
        />
      </div>

      <div className="card">
        <div className="row">
          <div style={{ fontWeight: 700 }}>카메라 프레이밍</div>
          <select
            value={prefs.framing}
            onChange={(e) =>
              // 수동 선택은 자동 감지를 끈다 — 유저 의사가 감지 결과보다 우선
              update({ framing: e.target.value as Prefs['framing'], framingAuto: false })
            }
          >
            <option value="closeup">클로즈업 (상반신 셀카)</option>
            <option value="fullbody">풀바디 (트라이포드)</option>
          </select>
        </div>
        <p className="dim" style={{ marginTop: 6 }}>
          버블은 시작 직전 카메라로 잰 어깨 위치·너비에 맞춰 자동 배치됩니다 — 폰 세로든 PC 가로든
          몸 대비 같은 자리에 뜹니다. 이 설정은 사람이 인식되지 않을 때 쓰는 예비값입니다.
        </p>
        <label className="row" style={{ marginTop: 8, gap: 6 }}>
          <input
            type="checkbox"
            checked={prefs.framingAuto}
            onChange={(e) => update({ framingAuto: e.target.checked })}
          />
          <span>자동 감지 — 플레이 준비 중 카메라로 판별해 적용</span>
        </label>
      </div>

      <div className="card">
        <div className="row">
          <div style={{ fontWeight: 700 }}>함정 버블 (다른 단어)</div>
          <label className="row" style={{ gap: 6 }}>
            <input
              type="checkbox"
              checked={prefs.decoyEnabled}
              onChange={(e) => update({ decoyEnabled: e.target.checked })}
            />
            <span className="badge">{prefs.decoyEnabled ? 'ON' : 'OFF'}</span>
          </label>
        </div>
        <p className="dim" style={{ marginTop: 6 }}>
          잡으면 콤보가 끊기는 함정 버블이에요. 끄면 채보에서 아예 나오지 않습니다.
        </p>
      </div>

      <div className="card">
        <div className="row">
          <div style={{ fontWeight: 700 }}>카메라 해상도</div>
          <select
            value={prefs.resolution}
            onChange={(e) => update({ resolution: Number(e.target.value) as 720 | 480 })}
          >
            <option value={720}>720p (기본)</option>
            <option value={480}>480p (저사양 기기)</option>
          </select>
        </div>
        <p className="dim" style={{ marginTop: 6 }}>
          게임이 끊기면 480p로 낮춰보세요.
        </p>
      </div>
    </main>
  );
}
