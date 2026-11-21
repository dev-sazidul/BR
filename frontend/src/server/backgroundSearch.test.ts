// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "../../app/api/v1/backgrounds/search/route";
import { resetRateLimitsForTests } from "./rateLimit";

const photo = {
  id: 123,
  url: "https://www.pexels.com/photo/123/",
  photographer: "A Photographer",
  photographer_url: "https://www.pexels.com/@photographer/",
  alt: "A quiet park",
  src: {
    medium: "https://images.pexels.com/photos/123/medium.jpeg",
    large: "https://images.pexels.com/photos/123/large.jpeg",
  },
};

afterEach(() => {
  delete process.env.PEXELS_API_KEY;
  resetRateLimitsForTests();
  vi.unstubAllGlobals();
});

describe("Pexels background search", () => {
  it("explains that search is optional when no server key is configured", async () => {
    delete process.env.PEXELS_API_KEY;
    const response = await GET(new Request("https://solva.test/api/v1/backgrounds/search?q=park"));
    expect(response.status).toBe(503);
    expect((await response.json()).error.message).toContain("PEXELS_API_KEY");
  });

  it("uses the server key, returns attributed photo results, and caches a repeated query", async () => {
    process.env.PEXELS_API_KEY = "server-only-test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ photos: [photo], next_page: "https://api.pexels.com/v1/search?page=2" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const url = "https://solva.test/api/v1/backgrounds/search?q=golden%20retriever%20park&page=1&orientation=portrait";
    const first = await GET(new Request(url));
    const second = await GET(new Request(url));
    const body = await first.json();

    expect(first.status).toBe(200);
    expect(body.photos[0]).toMatchObject({ id: photo.id, photographer: photo.photographer, src: photo.src });
    expect(body.hasNextPage).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("server-only-test-key");
    expect(second.headers.get("Cache-Control")).toContain("max-age=300");
  });
});
