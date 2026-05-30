import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient, createArtifactUrl, createXBasicHeader, setAuthorization } from "@/api/client";

describe("api/client", () => {
  describe("createArtifactUrl", () => {
    it("normalizes single leading slash", () => {
      expect(createArtifactUrl("/com/example/demo.jar")).toBe("/com/example/demo.jar");
    });

    it("normalizes multiple leading slashes", () => {
      expect(createArtifactUrl("///com/example/demo.jar")).toBe("/com/example/demo.jar");
    });

    it("passes through normalized paths unchanged", () => {
      expect(createArtifactUrl("com/example/demo.jar")).toBe("/com/example/demo.jar");
    });

    it("handles root path", () => {
      expect(createArtifactUrl("/")).toBe("/");
    });

    it("handles empty string", () => {
      expect(createArtifactUrl("")).toBe("/");
    });
  });

  describe("createXBasicHeader", () => {
    it("encodes name:secret in base64 with xBasic prefix", () => {
      vi.stubGlobal("window", { btoa: globalThis.btoa });
      expect(createXBasicHeader("user", "pass")).toEqual({
        Authorization: `xBasic ${window.btoa("user:pass")}`,
      });
      vi.unstubAllGlobals();
    });

    it("handles empty name and secret", () => {
      vi.stubGlobal("window", { btoa: globalThis.btoa });
      expect(createXBasicHeader("", "")).toEqual({
        Authorization: `xBasic ${window.btoa(":")}`,
      });
      vi.unstubAllGlobals();
    });

    it("handles special characters in credentials", () => {
      vi.stubGlobal("window", { btoa: (str: string) => btoa(str) });
      expect(createXBasicHeader("user@example.com", "p@ssw0rd!")).toEqual({
        Authorization: `xBasic ${window.btoa("user@example.com:p@ssw0rd!")}`,
      });
      vi.unstubAllGlobals();
    });
  });

  describe("setAuthorization", () => {
    beforeEach(() => {
      delete apiClient.defaults.headers.common.Authorization;
    });

    it("sets xBasic header when name and secret are provided", () => {
      vi.stubGlobal("window", { btoa: globalThis.btoa });
      setAuthorization("admin", "secret123");
      expect(apiClient.defaults.headers.common.Authorization).toBe("xBasic YWRtaW46c2VjcmV0MTIz");
      vi.unstubAllGlobals();
    });

    it("deletes authorization header when name is empty", () => {
      setAuthorization("", "secret123");
      expect(apiClient.defaults.headers.common.Authorization).toBeUndefined();
    });

    it("deletes authorization header when secret is empty", () => {
      setAuthorization("admin", "");
      expect(apiClient.defaults.headers.common.Authorization).toBeUndefined();
    });

    it("deletes authorization header when both are empty", () => {
      setAuthorization("", "");
      expect(apiClient.defaults.headers.common.Authorization).toBeUndefined();
    });
  });

  describe("apiClient configuration", () => {
    it("has 20 second timeout configured", () => {
      expect(apiClient.defaults.timeout).toBe(20_000);
    });

    it("uses environment base URL", () => {
      expect(apiClient.defaults.baseURL).toBe("");
    });
  });
});