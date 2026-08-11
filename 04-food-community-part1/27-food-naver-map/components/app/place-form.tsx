"use client";
// 맛집 등록·수정 공용 폼 — SSOT 컴포넌트(TextField/TextArea/Dropzone/FileItem/Toast/Button)를
// 실입력으로 감싸 BFF POST /api/places · PATCH /api/places/[id] 로 저장한다.
// 장소는 네이버 지역검색으로 고르거나(PlaceSearchFlow) 지도를 움직여 리버스 지오코딩으로 채운다.
// 지도 정보(장소명·지번주소·좌표)는 모두 필수라, 하나라도 비면 제출 버튼이 잠기고 서버도 400으로 막는다.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PlaceMapPicker, type CenterChangeSource } from "@/components/app/place-map-picker";
import { PlaceSearchFlow } from "@/components/app/place-search-flow";
import { Button } from "@/components/ui/button";
import { Dropzone, FileItem } from "@/components/ui/file-uploader";
import { TextArea } from "@/components/ui/text-area";
import { TextField } from "@/components/ui/text-field";
import { Toast } from "@/components/ui/toast";
import { formatCoords, type Coords } from "@/lib/naver-maps";
import {
  DEFAULT_PLACE,
  REVERSE_GEOCODE_DEBOUNCE_MS,
  type PlaceSelection,
} from "@/lib/places/place-search";
import {
  MAX_CONTENT_LENGTH,
  MAX_IMAGE_COUNT,
  MIN_CONTENT_LENGTH,
  validateContent,
  validateImageFile,
  validatePlaceLocation,
  validateTitle,
} from "@/lib/places/validation";

export type ExistingImage = { id: string; url: string };

export type PlaceFormProps = {
  mode: "create" | "edit";
  /** edit 모드 필수 */
  placeId?: string;
  initialTitle?: string;
  initialContent?: string;
  initialImages?: ExistingImage[];
  /** 수정 모드에서 저장돼 있던 지도 정보 */
  initialPlace?: PlaceSelection;
};

export function PlaceForm({
  mode,
  placeId,
  initialTitle = "",
  initialContent = "",
  initialImages = [],
  initialPlace = DEFAULT_PLACE,
}: PlaceFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [keptImages, setKeptImages] = useState(initialImages);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [dragover, setDragover] = useState(false);
  // 저장될 지도 정보 — 검색 선택과 지도 이동(리버스 지오코딩) 양쪽에서 갱신된다
  const [place, setPlace] = useState<PlaceSelection>(initialPlace);
  // 지도에 "여기로 옮겨라"라고 지시하는 값. 참조가 바뀔 때만 지도가 이동하므로,
  // 사용자가 끌어서 바뀐 좌표(place.lat/lng)로는 건드리지 않아 되돌아가는 일이 없다.
  const [mapTarget, setMapTarget] = useState<Coords>({
    lat: initialPlace.lat,
    lng: initialPlace.lng,
  });
  // 지도의 실시간 중심 — 좌표 표시용
  const [mapCenter, setMapCenter] = useState<Coords>({
    lat: initialPlace.lat,
    lng: initialPlace.lng,
  });
  // 사용자가 직접 움직여 멎은 중심. 이 값이 바뀔 때만 리버스 지오코딩을 건다.
  const [movedCenter, setMovedCenter] = useState<Coords | null>(null);
  const [addressPending, setAddressPending] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCenterChange = useCallback((coords: Coords, source: CenterChangeSource) => {
    setMapCenter(coords);
    if (source === "user") setMovedCenter(coords);
  }, []);

  /** 검색·직접입력으로 장소를 고르면 그 좌표로 지도를 옮긴다 */
  const applySelection = useCallback((selection: PlaceSelection) => {
    setPlace(selection);
    setMapTarget({ lat: selection.lat, lng: selection.lng });
    setMovedCenter(null);
    setAddressError(null);
  }, []);

  // 지도가 멎으면 그 중심의 지번주소를 조회한다 (드래그 중 연속 호출은 디바운스로 막는다)
  useEffect(() => {
    if (!movedCenter) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setAddressPending(true);
      try {
        const res = await fetch(
          `/api/reverse-geocode?lat=${movedCenter.lat}&lng=${movedCenter.lng}`,
          { signal: controller.signal },
        );
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json().catch(() => null);
        // 좌표는 성공·실패와 무관하게 핀 위치로 맞춘다 — 주소와 좌표가 어긋나면 안 된다
        if (!res.ok) {
          setPlace((prev) => ({ ...prev, address: "", lat: movedCenter.lat, lng: movedCenter.lng }));
          setAddressError(data?.error ?? "주소를 조회하지 못했어요");
          return;
        }
        const address = typeof data?.address === "string" ? data.address : "";
        setPlace((prev) => ({ ...prev, address, lat: movedCenter.lat, lng: movedCenter.lng }));
        setAddressError(address ? null : "이 위치의 지번주소를 찾지 못했어요");
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setPlace((prev) => ({ ...prev, address: "", lat: movedCenter.lat, lng: movedCenter.lng }));
        setAddressError("네트워크 오류로 주소를 불러오지 못했어요");
      } finally {
        setAddressPending(false);
      }
    }, REVERSE_GEOCODE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [movedCenter, router]);

  const displayedAddress = addressPending ? "주소를 불러오는 중…" : place.address;

  const titleError = validateTitle(title);
  const contentError = validateContent(content);
  const locationError = validatePlaceLocation(place);
  const imageCount = keptImages.length + newFiles.length;
  const canSubmit =
    !titleError && !contentError && !locationError && !addressPending && imageCount >= 1;

  const addFiles = (list: FileList | null | undefined) => {
    if (!list?.length) return;
    const accepted: File[] = [];
    for (const file of Array.from(list)) {
      const fileError = validateImageFile(file);
      if (fileError) {
        setError(fileError);
        return;
      }
      if (imageCount + accepted.length >= MAX_IMAGE_COUNT) {
        setError(`사진은 ${MAX_IMAGE_COUNT}장까지 등록할 수 있어요`);
        break;
      }
      accepted.push(file);
    }
    if (accepted.length) {
      setError(null);
      setNewFiles((prev) => [...prev, ...accepted]);
    }
  };

  const submit = async () => {
    setPending(true);
    setError(null);
    const body = new FormData();
    body.set("title", title.trim());
    body.set("content", content.trim());
    body.set("name", place.name.trim());
    body.set("address", place.address.trim());
    body.set("lat", String(place.lat));
    body.set("lng", String(place.lng));
    for (const file of newFiles) body.append("images", file);
    if (mode === "edit") {
      for (const img of keptImages) body.append("keepImageIds", img.id);
    }
    try {
      const res = await fetch(mode === "create" ? "/api/places" : `/api/places/${placeId}`, {
        method: mode === "create" ? "POST" : "PATCH",
        body,
      });
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "저장에 실패했어요");
        setPending(false);
        return;
      }
      // 서버 컴포넌트(목록·상세)가 변경분을 다시 읽도록 refresh 후 상세로 이동
      router.refresh();
      router.push(`/restaurants/${data?.place?.id ?? placeId}`);
    } catch {
      setError("네트워크 오류로 저장하지 못했어요");
      setPending(false);
    }
  };

  return (
    <>
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 pb-8 pt-5 md:px-6">
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-1">
            <span className="text-[14px] font-bold text-[var(--text-primary)]">사진 *</span>
            <span className="text-[12px] font-medium text-[var(--text-tertiary)]">
              {imageCount} / {MAX_IMAGE_COUNT}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <div
            role="button"
            aria-label="맛집 사진 선택"
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragover(true);
            }}
            onDragLeave={() => setDragover(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragover(false);
              addFiles(e.dataTransfer.files);
            }}
          >
            <Dropzone
              state={dragover ? "dragover" : "default"}
              guideText="사진을 여기에 끌어다 놓아주세요 (1장 이상)"
              browseLabel="파일 선택"
              fullWidth
            />
          </div>
          {keptImages.map((img, i) => (
            <FileItem
              key={img.id}
              status="complete"
              fileName={`등록된 사진 ${i + 1}`}
              statusText="등록 완료"
              fullWidth
              onRemove={() => setKeptImages((prev) => prev.filter((k) => k.id !== img.id))}
            />
          ))}
          {newFiles.map((file, i) => (
            <FileItem
              key={`${file.name}-${i}`}
              status="complete"
              fileName={file.name}
              statusText="선택 완료 — 저장 시 업로드돼요"
              fullWidth
              onRemove={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
            />
          ))}
        </section>

        <TextField
          label="맛집 이름 *"
          leadIcon="edit"
          value={title}
          onChange={setTitle}
          placeholder="예: 할머니 손칼국수"
          helper="맛집 이름을 입력해주세요"
          fullWidth
        />

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {/* 검색창은 직접 타이핑하지 않는다 — 누르면 전체화면 검색으로 넘어간다 */}
            <div
              role="button"
              tabIndex={0}
              aria-label="장소 검색 열기"
              className="min-w-0 flex-1 cursor-pointer [&_input]:pointer-events-none [&_input]:cursor-pointer"
              onClick={() => setSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSearchOpen(true);
                }
              }}
            >
              <TextField
                label="맛집 장소 *"
                leadIcon="search"
                value={place.name}
                placeholder="장소를 검색해주세요"
                helper={
                  place.manual
                    ? "직접 입력한 장소예요 — 지도를 움직여 주소를 맞춰주세요"
                    : "검색창을 눌러 네이버 지역검색으로 찾아주세요"
                }
                fullWidth
              />
            </div>
            <Button variant="secondary" leadIcon="search" onClick={() => setSearchOpen(true)}>
              검색
            </Button>
          </div>

          <PlaceMapPicker center={mapTarget} onCenterChange={handleCenterChange} />

          <TextField
            label="주소(지번) *"
            state={addressError ? "error" : "disabled"}
            value={displayedAddress}
            helper={addressError ?? "지도를 움직이면 핀 위치의 지번주소를 찾아드려요"}
            fullWidth
          />

          <span className="text-[12px] text-[var(--text-tertiary)]">
            저장될 좌표 {formatCoords(place)} · 지도 중심 {formatCoords(mapCenter)}
          </span>
          {/* 지도 정보는 전부 필수라, 왜 제출이 잠겨 있는지 여기서 알려준다 */}
          {locationError && !addressError && (
            <span className="text-[12px] font-medium text-[var(--destructive)]">
              {locationError}
            </span>
          )}
        </section>

        <TextArea
          label="맛집 내용 *"
          value={content}
          onChange={(v) => setContent(v.slice(0, MAX_CONTENT_LENGTH))}
          placeholder="어떤 점이 좋았는지 이웃에게 알려주세요"
          state={content.length > 0 && contentError ? "error" : "default"}
          helper={content.length > 0 && contentError ? contentError : `${MIN_CONTENT_LENGTH}자 이상 입력해주세요`}
          counter={`${content.length}/${MAX_CONTENT_LENGTH}`}
          height={140}
          fullWidth
        />

        {error && <Toast status="error" message={error} fullWidth onClose={() => setError(null)} />}
      </main>

      <div className="sticky bottom-0 border-t border-[var(--border-subtle)] bg-[var(--bg-page)]">
        <div className="mx-auto w-full max-w-[720px] px-4 pb-4 pt-3 md:px-6">
          <Button variant="primary" fullWidth disabled={!canSubmit} loading={pending} onClick={submit}>
            {mode === "create" ? "맛집 등록하기" : "수정 저장하기"}
          </Button>
        </div>
      </div>

      {/* 폼 위에 덮는 전체화면이라 사진·이름·내용 입력값은 그대로 유지된다 */}
      <PlaceSearchFlow
        open={searchOpen}
        initialQuery={place.name}
        onClose={() => setSearchOpen(false)}
        onSubmit={applySelection}
      />
    </>
  );
}
