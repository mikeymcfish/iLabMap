let token = "";
export async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.method && !["GET", "HEAD"].includes(options.method))
    headers.set("X-CSRF-Token", token);
  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    options.body = JSON.stringify(options.body);
  }
  const response = await fetch(path, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  const data = await response
    .json()
    .catch(() => ({ error: "The server returned an invalid response." }));
  if (!response.ok) {
    const error = new Error(data.error || "The request failed.");
    error.status = response.status;
    throw error;
  }
  if (data.csrf) token = data.csrf;
  return data;
}
