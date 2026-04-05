import { NextRequest, NextResponse } from "next/server";

const INDEXNOW_KEY = "d050dbd71ea0c7b50b82a58c0a9789fa";
const HOST = "clawnitor.io";
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

const PUBLIC_URLS = [
  `https://${HOST}`,
  `https://${HOST}/demo`,
  `https://${HOST}/pricing`,
  `https://${HOST}/docs`,
  `https://${HOST}/signup`,
  `https://${HOST}/login`,
  `https://${HOST}/privacy`,
  `https://${HOST}/terms`,
];

export async function POST(request: NextRequest) {
  // Simple auth — only allow with internal secret or from localhost
  const authHeader = request.headers.get("authorization");
  const expected = process.env.INTERNAL_API_SECRET;
  if (expected && authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
        urlList: PUBLIC_URLS,
      }),
    });

    return NextResponse.json({
      status: res.status,
      submitted: PUBLIC_URLS.length,
      urls: PUBLIC_URLS,
    });
  } catch (err) {
    return NextResponse.json({ error: "IndexNow submission failed" }, { status: 500 });
  }
}
