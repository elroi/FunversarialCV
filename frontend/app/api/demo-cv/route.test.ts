/**
 * API route tests for GET /api/demo-cv.
 * @jest-environment node
 */

import { GET } from "./route";

function makeRequest(url: string) {
  return new Request(url);
}

describe("/api/demo-cv", () => {
  it("returns a clean PDF demo CV by default", async () => {
    const req = makeRequest("http://localhost/api/demo-cv");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.bufferBase64).toBe("string");
    expect(body.mimeType).toBe("application/pdf");
    expect(body.variant).toBe("clean");
    expect(body.originalName).toContain("Senior Security Architect");
  });

  it("returns a dirty DOCX demo CV when requested", async () => {
    const req = makeRequest(
      "http://localhost/api/demo-cv?variant=dirty&format=docx"
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.bufferBase64).toBe("string");
    expect(body.mimeType).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(body.variant).toBe("dirty");
    expect(body.originalName).toContain("Senior Security Architect");
  });
});

