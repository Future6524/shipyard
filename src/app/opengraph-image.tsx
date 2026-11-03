import { ImageResponse } from "next/og";

export const alt = "Shipyard: roadmap, release timelines and changelog";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social preview in the site's split black / studio style. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0b0b0b" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, width: "58%" }}>
          <div style={{ display: "flex", background: "#ffffff", color: "#0b0b0b", fontSize: 40, fontWeight: 900, padding: "6px 18px", alignSelf: "flex-start" }}>
            shipyard
          </div>
          <div style={{ display: "flex", color: "#ffffff", fontSize: 112, fontWeight: 900, marginTop: 36, letterSpacing: -4 }}>road</div>
          <div style={{ display: "flex", color: "#e0157a", fontSize: 112, fontWeight: 900, marginTop: -24, letterSpacing: -4 }}>map</div>
          <div style={{ display: "flex", color: "#bdbdbd", fontSize: 28, marginTop: 20 }}>Releases, audit timelines, changelog and stats.</div>
        </div>
        <div
          style={{
            display: "flex",
            width: "42%",
            alignItems: "center",
            justifyContent: "center",
            background: "radial-gradient(circle at 50% 40%, #ffffff 0%, #e6e6e6 45%, #a8a8a8 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: 300,
              height: 300,
              borderRadius: 300,
              background: "linear-gradient(135deg, #e0157a 0%, #ffd400 35%, #22d36b 60%, #2a6be0 100%)",
            }}
          />
        </div>
      </div>
    ),
    size,
  );
}
