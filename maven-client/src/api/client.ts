import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "";

export const apiClient = axios.create({
  baseURL,
  timeout: 20_000,
});

export const createArtifactUrl = (path: string) => {
  const normalized = path.replace(/^\/+/, "");
  return `${baseURL}/${normalized}`;
};

export const createXBasicHeader = (name: string, secret: string) => ({
  Authorization: `xBasic ${window.btoa(`${name}:${secret}`)}`,
});

export const setAuthorization = (name: string, secret: string) => {
  if (!name || !secret) {
    delete apiClient.defaults.headers.common.Authorization;
    return;
  }

  apiClient.defaults.headers.common.Authorization = createXBasicHeader(name, secret).Authorization;
};
