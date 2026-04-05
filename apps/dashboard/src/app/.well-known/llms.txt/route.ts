import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.redirect(new URL("/llms.txt", "https://clawnitor.io"), 301);
}
