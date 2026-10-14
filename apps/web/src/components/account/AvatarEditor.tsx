import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { accountApi } from "../../lib/account-api";
import { useAuthStore } from "../../stores/auth-store";

export async function cropAvatar(
  source: ImageBitmap,
  zoom: number,
  x: number,
  y: number,
): Promise<Blob> {
  const edge = Math.min(source.width, source.height) / zoom;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 256, 256);
  context.drawImage(
    source,
    (source.width - edge) * x,
    (source.height - edge) * y,
    edge,
    edge,
    0,
    0,
    256,
    256,
  );
  for (let quality = 0.9; quality >= 0.4; quality -= 0.1) {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (blob && blob.size <= 128 * 1024) return blob;
  }
  throw new Error("Image too large");
}
const copy = {
  ko: {
    choose: "사진 올리기",
    save: "자르기 저장",
    cancel: "취소",
    remove: "사진 삭제",
    zoom: "확대",
    x: "가로 위치",
    y: "세로 위치",
    preview: "사진 미리보기",
    invalid: "5MiB 이하 JPEG·PNG·WebP 사진을 선택하세요.",
    error: "사진을 처리하거나 저장하지 못했습니다. 다시 시도해 주세요.",
    saving: "사진 처리 중…",
  },
  ja: {
    choose: "写真を選択",
    save: "切り抜きを保存",
    cancel: "キャンセル",
    remove: "写真を削除",
    zoom: "拡大",
    x: "横の位置",
    y: "縦の位置",
    preview: "写真のプレビュー",
    invalid: "5 MiB 以下の JPEG・PNG・WebP 写真を選択してください。",
    error: "写真の処理または保存に失敗しました。もう一度お試しください。",
    saving: "写真を処理中…",
  },
  en: {
    choose: "Upload photo",
    save: "Save crop",
    cancel: "Cancel",
    remove: "Delete photo",
    zoom: "Zoom",
    x: "Horizontal position",
    y: "Vertical position",
    preview: "Photo preview",
    invalid: "Choose a JPEG, PNG or WebP photo no larger than 5 MiB.",
    error: "Could not process or save the photo. Please try again.",
    saving: "Processing photo…",
  },
};
/** 강성호 2026-10-14: 원본 대신 조절한 정사각형만 저장하고 다른 계정의 늦은 응답은 폐기한다. */
export function AvatarEditor({
  userId,
  onChange,
}: {
  userId: string;
  onChange: (url: string | null) => void;
}) {
  const { i18n } = useTranslation(),
    labels =
      copy[
        i18n.language.startsWith("ja")
          ? "ja"
          : i18n.language.startsWith("en")
            ? "en"
            : "ko"
      ];
  const input = useRef<HTMLInputElement>(null),
    bitmap = useRef<ImageBitmap | null>(null),
    generation = useRef(0),
    alive = useRef(true);
  const [source, setSource] = useState<ImageBitmap | null>(null),
    [crop, setCrop] = useState({ zoom: 1, x: 0.5, y: 0.5 });
  const [draft, setDraft] = useState<Blob | null>(null),
    [preview, setPreview] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  const current = (version: number) =>
    alive.current &&
    generation.current === version &&
    useAuthStore.getState().user?.id === userId;
  const clear = () => {
    ++generation.current;
    bitmap.current?.close();
    bitmap.current = null;
    setSource(null);
    setDraft(null);
    setPreview(null);
    setError(null);
  };
  useEffect(() => {
    alive.current = true;
    clear();
    setBusy(false);
    return () => {
      alive.current = false;
      ++generation.current;
      bitmap.current?.close();
    };
  }, [userId]);
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    setDraft(null);
    const version = generation.current;
    const timer = setTimeout(() => {
      void cropAvatar(source, crop.zoom, crop.x, crop.y)
        .then((blob) => {
          if (cancelled || !current(version)) return;
          setDraft(blob);
          setPreview(URL.createObjectURL(blob));
        })
        .catch(() => {
          if (!cancelled && current(version)) setError(labels.error);
        });
    }, 100);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [source, crop, userId]);
  const select = async (file: File | undefined) => {
    if (!file) return;
    clear();
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setError(labels.invalid);
      return;
    }
    const version = generation.current;
    setBusy(true);
    try {
      const image = await createImageBitmap(file);
      if (!current(version)) {
        image.close();
        return;
      }
      if (
        image.width > 8192 ||
        image.height > 8192 ||
        !image.width ||
        !image.height
      ) {
        image.close();
        throw new Error("Dimensions");
      }
      bitmap.current = image;
      setCrop({ zoom: 1, x: 0.5, y: 0.5 });
      setSource(image);
    } catch {
      if (current(version)) setError(labels.error);
    } finally {
      if (current(version)) setBusy(false);
    }
  };
  const save = async () => {
    if (!draft || busy) return;
    const version = generation.current;
    setBusy(true);
    setError(null);
    try {
      await accountApi.uploadAvatar(userId, draft);
      if (!current(version)) return;
      onChange(null);
      clear();
    } catch {
      if (current(version)) setError(labels.error);
    } finally {
      if (alive.current && useAuthStore.getState().user?.id === userId)
        setBusy(false);
    }
  };
  const remove = async () => {
    if (busy) return;
    const version = generation.current;
    setBusy(true);
    setError(null);
    try {
      await accountApi.deleteAvatar(userId);
      if (current(version)) {
        onChange(null);
        clear();
      }
    } catch {
      if (current(version)) setError(labels.error);
    } finally {
      if (alive.current && useAuthStore.getState().user?.id === userId)
        setBusy(false);
    }
  };
  return (
    <div className="space-y-3">
      <input
        ref={input}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        aria-label={labels.choose}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          void select(file);
        }}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="account-action"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {labels.choose}
        </button>
        <button
          type="button"
          className="account-action"
          disabled={busy}
          onClick={() => void remove()}
        >
          {labels.remove}
        </button>
      </div>
      {source && (
        <div className="rounded-2xl border border-[var(--border)] p-3">
          {preview && (
            <img
              src={preview}
              alt={labels.preview}
              width={128}
              height={128}
              className="mx-auto rounded-full"
            />
          )}
          {(["zoom", "x", "y"] as const).map((key) => (
            <label key={key} className="mt-2 flex items-center gap-3 text-sm">
              {labels[key]}
              <input
                type="range"
                min={key === "zoom" ? 1 : 0}
                max={key === "zoom" ? 3 : 1}
                step="0.05"
                value={crop[key]}
                disabled={busy}
                onChange={(e) =>
                  setCrop({ ...crop, [key]: Number(e.target.value) })
                }
                className="min-h-12 min-w-0 flex-1 accent-[var(--accent)]"
              />
            </label>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              className="account-action"
              disabled={busy || !draft}
              onClick={() => void save()}
            >
              {labels.save}
            </button>
            <button
              type="button"
              className="account-action"
              disabled={busy}
              onClick={clear}
            >
              {labels.cancel}
            </button>
          </div>
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm">
          {labels.saving}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-[var(--foreground)]">
          {error}
        </p>
      )}
    </div>
  );
}
