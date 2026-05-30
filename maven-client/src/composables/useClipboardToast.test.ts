import { beforeEach, describe, expect, it, vi } from "vitest";

import { useClipboardToast } from "@/composables/useClipboardToast";

vi.mock("mosha-vue-toastify", () => ({
  createToast: vi.fn(),
}));

describe("useClipboardToast", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.clearAllMocks();
  });

  it("returns copy function", () => {
    const { copy } = useClipboardToast();
    expect(copy).toBeDefined();
    expect(typeof copy).toBe("function");
  });

  it("copies text to clipboard", async () => {
    const { copy } = useClipboardToast();
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");

    await copy("test text");

    expect(clipboardSpy).toHaveBeenCalledWith("test text");
  });

  it("shows success toast after copying", async () => {
    const { createToast } = await import("mosha-vue-toastify");
    const { copy } = useClipboardToast();

    await copy("copied text");

    expect(createToast).toHaveBeenCalledWith("Copied", expect.objectContaining({
      type: "info",
      position: "bottom-right",
      timeout: 1600,
    }));
  });

  it("shows warning when clipboard is unavailable", async () => {
    vi.stubGlobal("navigator", {
      clipboard: undefined,
    });

    const { createToast } = await import("mosha-vue-toastify");
    const { copy } = useClipboardToast();

    await copy("test");

    expect(createToast).toHaveBeenCalledWith(
      "Clipboard is not available in this browser context",
      expect.objectContaining({ type: "warning", position: "bottom-right" }),
    );
  });

  it("shows danger toast when clipboard copy fails", async () => {
    const { createToast } = await import("mosha-vue-toastify");
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("copy failed"));

    const { copy } = useClipboardToast();

    await copy("test");

    expect(createToast).toHaveBeenCalledWith(
      "Cannot copy this snippet",
      expect.objectContaining({ type: "danger", position: "bottom-right" }),
    );
  });

  it("does not throw when clipboard writeText rejects", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(new Error("clipboard error"));
    const { copy } = useClipboardToast();

    await expect(copy("test")).resolves.not.toThrow();
  });

  it("handles empty string", async () => {
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");
    const { copy } = useClipboardToast();

    await copy("");

    expect(clipboardSpy).toHaveBeenCalledWith("");
  });

  it("handles long text content", async () => {
    const clipboardSpy = vi.spyOn(navigator.clipboard, "writeText");
    const longText = "a".repeat(10000);
    const { copy } = useClipboardToast();

    await copy(longText);

    expect(clipboardSpy).toHaveBeenCalledWith(longText);
  });
});