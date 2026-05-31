import { beforeEach, describe, expect, it, vi } from "vitest";

describe("useSettings", () => {
  const mockGet = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock("@/api/settings", () => ({
      settingsApi: { get: mockGet },
    }));
    vi.doMock("@/site.config", () => ({
      applySiteSettings: vi.fn(),
    }));
    mockGet.mockReset();
  });

  const loadUseSettings = async () => {
    const { useSettings } = await import("@/composables/useSettings");
    return useSettings;
  };

  it("calls settingsApi.get on first call", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    const useSettings = await loadUseSettings();
    const { loaded } = useSettings();

    await vi.waitFor(() => expect(loaded.value).toBe(true));

    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it("populates title from response", async () => {
    mockGet.mockResolvedValueOnce({ data: { title: "My Private Maven" } });

    const useSettings = await loadUseSettings();
    const { title, loaded } = useSettings();

    await vi.waitFor(() => expect(loaded.value).toBe(true));

    expect(title.value).toBe("My Private Maven");
  });

  it("falls back to default title when response omits it", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    const useSettings = await loadUseSettings();
    const { title, loaded } = useSettings();

    await vi.waitFor(() => expect(loaded.value).toBe(true));

    expect(title.value).toBe("Cloud Maven");
  });

  it("populates defaultRepo from response", async () => {
    mockGet.mockResolvedValueOnce({ data: { defaultRepository: "releases" } });

    const useSettings = await loadUseSettings();
    const { defaultRepo, loaded } = useSettings();

    await vi.waitFor(() => expect(loaded.value).toBe(true));

    expect(defaultRepo.value).toBe("releases");
  });

  it("uses empty string for defaultRepo when response omits it", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    const useSettings = await loadUseSettings();
    const { defaultRepo, loaded } = useSettings();

    await vi.waitFor(() => expect(loaded.value).toBe(true));

    expect(defaultRepo.value).toBe("");
  });

  it("populates baseUrl from response", async () => {
    mockGet.mockResolvedValueOnce({ data: { baseUrl: "https://maven.example.com" } });

    const useSettings = await loadUseSettings();
    const { baseUrl, loaded } = useSettings();

    await vi.waitFor(() => expect(loaded.value).toBe(true));

    expect(baseUrl.value).toBe("https://maven.example.com");
  });

  it("uses empty string for baseUrl when response omits it", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    const useSettings = await loadUseSettings();
    const { baseUrl, loaded } = useSettings();

    await vi.waitFor(() => expect(loaded.value).toBe(true));

    expect(baseUrl.value).toBe("");
  });

  it("sets loaded to true after fetch completes", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    const useSettings = await loadUseSettings();
    const { loaded } = useSettings();

    expect(loaded.value).toBe(false);

    await vi.waitFor(() => expect(loaded.value).toBe(true));
  });

  it("keeps defaults and sets loaded when fetch fails", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network error"));

    const useSettings = await loadUseSettings();
    const { title, baseUrl, loaded } = useSettings();

    await vi.waitFor(() => expect(loaded.value).toBe(true));

    expect(title.value).toBe("Cloud Maven");
    expect(baseUrl.value).toBe("");
  });

  it("fetches only once across multiple calls", async () => {
    mockGet.mockResolvedValueOnce({ data: {} });

    const useSettings = await loadUseSettings();
    const inst1 = useSettings();

    await vi.waitFor(() => expect(inst1.loaded.value).toBe(true));

    const inst2 = useSettings();

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(inst1.loaded.value).toBe(true);
    expect(inst2.loaded.value).toBe(true);
  });

  it("returns same ref instances across calls", async () => {
    mockGet.mockResolvedValueOnce({ data: { title: "Shared" } });

    const useSettings = await loadUseSettings();
    const inst1 = useSettings();

    await vi.waitFor(() => expect(inst1.loaded.value).toBe(true));

    const inst2 = useSettings();

    expect(inst1.title).toBe(inst2.title);
    expect(inst1.defaultRepo).toBe(inst2.defaultRepo);
    expect(inst1.baseUrl).toBe(inst2.baseUrl);
    expect(inst2.title.value).toBe("Shared");
  });
});
