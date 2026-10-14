import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiUrl } from "../../lib/api-base";
import { Button } from "../ui/Button";
import { useAuthStore } from "../../stores/auth-store";
const copy = {
  ko: {
    unsupported: "이 기기는 푸시 알림을 지원하지 않습니다.",
    denied: "브라우저에서 알림이 차단되어 있습니다.",
    default: "알림 권한을 아직 선택하지 않았습니다.",
    none: "이 기기는 알림을 구독하지 않았습니다.",
    active: "이 기기의 푸시 구독이 서버에 등록되어 있습니다.",
    unsynced:
      "기기 구독이 서버와 연결되지 않았습니다. 설정에서 다시 연결하세요.",
    error: "기기 구독 상태를 확인하지 못했습니다.",
    loading: "기기 알림 상태 확인 중…",
    test: "등록 기기에 테스트 알림 보내기",
    accepted: "발송 요청이 수락됐습니다. 기기에 알림이 도착했는지 확인해 주세요.",
    failed: "테스트 알림 발송에 실패했습니다. 기기 구독과 설정을 확인해 주세요.",
  },
  ja: {
    unsupported: "この端末はプッシュ通知に対応していません。",
    denied: "ブラウザーで通知がブロックされています。",
    default: "通知の許可はまだ選択されていません。",
    none: "この端末は通知を購読していません。",
    active: "この端末の通知登録を確認しました。",
    unsynced:
      "端末の通知登録が同期されていません。設定から再接続してください。",
    error: "通知登録を確認できませんでした。",
    loading: "通知登録を確認中…",
    test: "登録した端末にテスト通知を送る",
    accepted: "送信要求が受け付けられました。端末に通知が届いたか確認してください。",
    failed: "テスト通知を送れませんでした。端末の登録と設定を確認してください。",
  },
  en: {
    unsupported: "Push is not supported on this device.",
    denied: "Notifications are blocked by the browser.",
    default: "Notification permission has not been chosen.",
    none: "This device is not subscribed.",
    active: "This device subscription is registered on the server.",
    unsynced: "The device subscription is not linked. Reconnect in settings.",
    error: "Could not verify device subscription.",
    loading: "Checking device notifications…",
    test: "Send a test notification to registered devices",
    accepted: "The send request was accepted. Please confirm receipt on your device.",
    failed: "Could not send the test notification. Check your device subscription and settings.",
  },
};
export function DevicePushStatus({ userId }: { userId: string }) {
  const { i18n } = useTranslation(),
    labels =
      copy[
        i18n.language.startsWith("ja")
          ? "ja"
          : i18n.language.startsWith("en")
            ? "en"
            : "ko"
      ];
  const [status, setStatus] = useState<keyof typeof labels>("loading");
  const [sending, setSending] = useState(false);
  const [delivery, setDelivery] = useState<'accepted' | 'failed' | null>(null);
  async function testDelivery() {
    if (sending || useAuthStore.getState().user?.id !== userId) return;
    setSending(true); setDelivery(null);
    try {
      const response = await fetch(apiUrl('/notifications/test'), {
        method: 'POST', credentials: 'include', headers: { 'X-Account-Id': userId },
      });
      const body = await response.json() as { data?: { sent: number; failed: number } };
      if (useAuthStore.getState().user?.id === userId)
        setDelivery(response.ok && Number(body.data?.sent) > 0 && body.data?.failed === 0 ? 'accepted' : 'failed');
    } catch {
      if (useAuthStore.getState().user?.id === userId) setDelivery('failed');
    } finally {
      if (useAuthStore.getState().user?.id === userId) setSending(false);
    }
  }
  useEffect(() => {
    let cancelled = false;
    const abort = new AbortController();
    setStatus("loading");
    setSending(false); setDelivery(null);
    void (async () => {
      if (
        !("Notification" in window) ||
        !("PushManager" in window) ||
        !("serviceWorker" in navigator)
      )
        return "unsupported";
      if (Notification.permission !== "granted") return Notification.permission;
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) return "none";
      const response = await fetch(apiUrl("/notifications/subscribe"), {
        credentials: "include",
        cache: "no-store",
        headers: { 'X-Account-Id': userId },
        signal: abort.signal,
      });
      if (!response.ok) throw new Error("Subscription lookup");
      const body = (await response.json()) as { data: { endpoints: string[] } };
      return body.data.endpoints.includes(subscription.endpoint)
        ? "active"
        : "unsynced";
    })()
      .then((value) => {
        if (!cancelled) setStatus(value as keyof typeof labels);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [userId]);
  return (
    <div className="space-y-3">
    <p
      role="status"
      className="text-sm leading-relaxed text-[var(--muted-foreground)]"
    >
      {labels[status]}
    </p>
    {status === 'active' && <Button variant="secondary" disabled={sending} onClick={() => void testDelivery()}>{labels.test}</Button>}
    {delivery && <p role={delivery === 'failed' ? 'alert' : 'status'} className="text-sm">{labels[delivery]}</p>}
    </div>
  );
}
