import { createToast } from "mosha-vue-toastify";

export function useClipboardToast() {
  const copy = async (text: string) => {
    if (!navigator.clipboard) {
      createToast("Clipboard is not available in this browser context", {
        type: "warning",
        position: "bottom-right",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      createToast("Copied", { type: "info", position: "bottom-right", timeout: 1600 });
    } catch {
      createToast("Cannot copy this snippet", { type: "danger", position: "bottom-right" });
    }
  };

  return {
    copy,
  };
}
