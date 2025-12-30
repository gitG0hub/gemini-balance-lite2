import { handleVerification } from "./verify_keys.js";

async function fetchOpenRouter(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/openrouter/, ""); // Remove /openrouter prefix
  const targetUrl = `https://openrouter.ai/api/v1${path}${url.search}`;

  try {
    const headers = new Headers();
    // Forward Authorization header
    if (request.headers.has("Authorization")) {
      headers.set("Authorization", request.headers.get("Authorization"));
    }
    // Forward other necessary headers, e.g., Content-Type
    if (request.headers.has("Content-Type")) {
      headers.set("Content-Type", request.headers.get("Content-Type"));
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });

    const responseHeaders = new Headers(response.headers);
    // Clean up headers if necessary
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");
    responseHeaders.delete("keep-alive");
    responseHeaders.delete("content-encoding");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Failed to fetch from OpenRouter:", error);
    return new Response("Internal Server Error\\n" + error?.stack, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

export default {
  fetch: fetchOpenRouter,
};
