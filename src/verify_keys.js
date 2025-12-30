async function verifyKey(key, controller) {
  const url = "https://openrouter.ai/api/v1/models"; // OpenRouter models endpoint
  let result;
  try {
    const response = await fetch(url, {
      method: "GET", // Changed to GET
      headers: {
        Authorization: `Bearer ${key}`, // Changed to Authorization header
      },
      // Removed body
    });
    if (response.ok) {
      await response.json(); // Consume body to release connection, OpenRouter returns JSON
      result = {
        key: `${key.slice(0, 7)}......${key.slice(-7)}`,
        status: "GOOD",
      };
    } else {
      const errorData = await response
        .json()
        .catch(() => ({ error: { message: "Unknown error" } }));
      // OpenRouter error structure might be different, but keeping generic for minimal change
      result = {
        key: `${key.slice(0, 7)}......${key.slice(-7)}`,
        status: "BAD",
        error: errorData.error?.message || JSON.stringify(errorData),
      };
    }
  } catch (e) {
    result = {
      key: `${key.slice(0, 7)}......${key.slice(-7)}`,
      status: "ERROR",
      error: e.message,
    };
  }
  controller.enqueue(
    new TextEncoder().encode("data: " + JSON.stringify(result) + "\n\n"),
  );
}

export async function handleVerification(request) {
  try {
    const authHeader = request.headers.get("authorization"); // Changed to authorization
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header." }),
        {
          // Updated error message
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const keys = authHeader
      .replace("Bearer ", "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean); // Added .replace('Bearer ', '')

    const stream = new ReadableStream({
      async start(controller) {
        const verificationPromises = keys.map((key) =>
          verifyKey(key, controller),
        );
        await Promise.all(verificationPromises);
        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred: " + e.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
