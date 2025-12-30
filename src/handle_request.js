import { handleVerification } from "./verify_keys.js";
// import openai from "./openai.mjs"; // No longer needed

export async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const search = url.search;

  if (pathname === "/" || pathname === "/index.html") {
    return new Response(
      "Proxy is Running!  More Details: https://github.com/tech-shrimp/gemini-balance-lite",
      {
        status: 200,
        headers: { "Content-Type": "text/html" },
      },
    );
  }

  if (pathname === "/verify" && request.method === "POST") {
    return handleVerification(request);
  }

  let targetUrl;
  let headers = new Headers();

  try {
    targetUrl = `https://openrouter.ai/api${pathname}${search}`;
    let openRouterApiKey = null;

    for (const [key, value] of request.headers.entries()) {
      if (
        key.trim().toLowerCase() === "x-goog-api-key" ||
        key.trim().toLowerCase() === "authorization"
      ) {
        const apiKeys = value
          .replace("Bearer ", "") // Remove Bearer prefix if present
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k);
        if (apiKeys.length > 0) {
          openRouterApiKey =
            apiKeys[Math.floor(Math.random() * apiKeys.length)];
          console.log(`OpenRouter Selected API Key: ${openRouterApiKey}`);
        }
      } else if (key.trim().toLowerCase() === "content-type") {
        headers.set(key, value);
      } else {
        // Copy other headers except host, referer, etc. which are handled by fetch
        // and content-length which might change
        const disallowedHeaders = ["host", "referer", "content-length"];
        if (!disallowedHeaders.includes(key.trim().toLowerCase())) {
          headers.set(key, value);
        }
      }
    }

    if (openRouterApiKey) {
      headers.set("Authorization", `Bearer ${openRouterApiKey}`);
    } else {
      console.warn(
        "No OpenRouter API key found in x-goog-api-key or Authorization header.",
      );
      return new Response("Unauthorized: OpenRouter API key missing.", {
        status: 401,
      });
    }
    if (!headers.has("HTTP-Referer")) {
      headers.set("HTTP-Referer", url.hostname); // Optional, for OpenRouter analytics
    }
    if (!headers.has("X-Title")) {
      headers.set("X-Title", "Gemini Balance Lite"); // Optional, for OpenRouter analytics
    }

    console.log("Request Sending to OpenRouter");

    console.log("targetUrl:" + targetUrl);
    console.log(headers);

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });

    console.log("Call OpenRouter Success");

    const responseHeaders = new Headers(response.headers);

    console.log("Header from OpenRouter:");
    console.log(responseHeaders);

    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("connection");
    responseHeaders.delete("keep-alive");
    responseHeaders.delete("content-encoding");
    responseHeaders.set("Referrer-Policy", "no-referrer");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Failed to fetch:", error);
    return new Response("Internal Server Error\n" + error?.stack, {
      status: 500,
      headers: { "Content-Type": "text/plain" },
    });
  }
}
