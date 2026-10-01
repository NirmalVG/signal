import { ImageResponse } from "next/og"

// Next.js picks this file up by name and serves it as the social-share
// preview (LinkedIn, X, Slack…), generated once at build time.
export const alt = "Signal — Ask your codebase. Verify every answer."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// The share-image renderer (Satori) supports a flexbox subset of CSS, and
// every element with children needs an explicit `display: flex`.
function Bar({ height, opacity }: { height: number; opacity: number }) {
  return (
    <div
      style={{
        display: "flex",
        width: 9,
        height,
        borderRadius: 5,
        background: "white",
        opacity,
        marginLeft: 3,
        marginRight: 3,
      }}
    />
  )
}

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0f172a",
        padding: 72,
        color: "white",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#6366f1",
            paddingBottom: 14,
          }}
        >
          <Bar height={14} opacity={0.55} />
          <Bar height={24} opacity={0.8} />
          <Bar height={35} opacity={1} />
        </div>
        <div style={{ display: "flex", fontSize: 40, marginLeft: 20 }}>
          Signal
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 76 }}>Ask your codebase.</div>
        <div style={{ display: "flex", fontSize: 76, color: "#86f2e4" }}>
          Verify every answer.
        </div>
      </div>

      <div style={{ display: "flex", fontSize: 26, color: "#94a3b8" }}>
        Tree-sitter chunking · pgvector retrieval · Validated citations
      </div>
    </div>,
    { ...size },
  )
}
