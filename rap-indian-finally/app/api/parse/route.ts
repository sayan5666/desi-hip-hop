import { NextRequest, NextResponse } from "next/server";
import { Innertube, UniversalCache } from "youtubei.js";
import { GoogleGenAI, Type } from "@google/genai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSpotifyClient() {
  try {
    const spotifyUrlInfo = require("spotify-url-info");
    return spotifyUrlInfo(fetch);
  } catch (e) {
    console.error("Error loading spotify-url-info:", e);
    return null;
  }
}

function extractTrack(v: any) {
  if (!v) return null;

  // Video ID resolution across different YouTube JS node models
  const vid =
    v.id ||
    v.videoId ||
    v.content_id ||
    v.video_id ||
    v.endpoint?.payload?.videoId ||
    v.navigation_endpoint?.payload?.videoId ||
    v.endpoint?.watchEndpoint?.videoId;

  if (!vid || typeof vid !== "string" || vid.length < 5) return null;

  // Title extraction
  let title = "";
  if (typeof v.title === "string") {
    title = v.title;
  } else if (v.title?.text) {
    title = v.title.text;
  } else if (v.title?.runs && Array.isArray(v.title.runs)) {
    title = v.title.runs.map((r: any) => r.text || "").join("");
  } else if (v.metadata?.title?.text) {
    title = v.metadata.title.text;
  } else if (v.metadata?.title?.runs && Array.isArray(v.metadata.title.runs)) {
    title = v.metadata.title.runs.map((r: any) => r.text || "").join("");
  } else if (v.header?.title?.text) {
    title = v.header.title.text;
  } else if (v.headline?.text) {
    title = v.headline.text;
  }

  // Artist / Channel extraction
  let artist = "";
  if (typeof v.author === "string") {
    artist = v.author;
  } else if (v.author?.name) {
    artist = v.author.name;
  } else if (v.author?.text) {
    artist = v.author.text;
  } else if (v.short_byline?.text) {
    artist = v.short_byline.text;
  } else if (v.short_byline?.runs && Array.isArray(v.short_byline.runs)) {
    artist = v.short_byline.runs.map((r: any) => r.text || "").join("");
  } else if (v.metadata?.metadata?.metadata_rows?.[0]?.metadata_parts?.[0]?.text?.text) {
    artist = v.metadata.metadata.metadata_rows[0].metadata_parts[0].text.text;
  } else if (v.subtitle?.text) {
    artist = v.subtitle.text;
  } else if (v.subtitle?.runs && Array.isArray(v.subtitle.runs)) {
    artist = v.subtitle.runs.map((r: any) => r.text || "").join("");
  }

  // Duration extraction
  let dur = 0;
  if (typeof v.duration === "number") {
    dur = v.duration;
  } else if (typeof v.duration?.seconds === "number") {
    dur = v.duration.seconds;
  } else if (typeof v.duration?.text === "string") {
    const parts = v.duration.text.split(":").map(Number);
    if (parts.length === 2) dur = parts[0] * 60 + parts[1];
    if (parts.length === 3) dur = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (v.length_seconds) {
    dur = parseInt(v.length_seconds, 10) || 0;
  } else {
    // Check overlays (common on LockupView)
    const overlays = v.content_image?.overlays || [];
    for (const o of overlays) {
      if (o.badges) {
        for (const b of o.badges) {
          if (b.text && /^\d+:\d+/.test(b.text)) {
            const parts = b.text.split(":").map(Number);
            if (parts.length === 2) dur = parts[0] * 60 + parts[1];
            if (parts.length === 3) dur = parts[0] * 3600 + parts[1] * 60 + parts[2];
          }
        }
      }
    }
  }

  if (title) {
    return {
      id: vid,
      videoId: vid,
      title: title.trim(),
      artist: artist ? artist.trim() : "Various Artists",
      duration: dur || 180,
    };
  }

  return null;
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL or prompt is required" }, { status: 400 });
    }

    const trimmedInput = url.trim();
    const yt = await Innertube.create({ cache: new UniversalCache(false) });
    const tracks: any[] = [];
    let playlistName = "Imported Playlist";

    // 1. Check if input is a Spotify Link
    if (trimmedInput.includes("spotify.com") || trimmedInput.includes("spotify.link")) {
      try {
        const spotify = getSpotifyClient();
        if (!spotify) {
          return NextResponse.json({ error: "Spotify parser is unavailable" }, { status: 500 });
        }
        const spotifyData = await spotify.getTracks(trimmedInput);
        if (!Array.isArray(spotifyData) || spotifyData.length === 0) {
          return NextResponse.json({ error: "No tracks found in Spotify link." }, { status: 400 });
        }

        // Try getting playlist title from details if available
        try {
          const details = await spotify.getDetails(trimmedInput);
          if (details?.preview?.title) {
            playlistName = details.preview.title;
          }
        } catch {
          // Keep default name
        }

        // Process ALL tracks with high-concurrency batching (no artificial 50-song limit)
        const chunkSize = 10;
        for (let i = 0; i < spotifyData.length; i += chunkSize) {
          const chunk = spotifyData.slice(i, i + chunkSize);
          await Promise.all(
            chunk.map(async (sTrack: any) => {
              try {
                const artistName = sTrack.artist || sTrack.artists?.[0]?.name || "";
                const searchStr = `${sTrack.name} ${artistName}`.trim();
                const results = await yt.search(searchStr, { type: "video" });

                if (results.videos && results.videos.length > 0) {
                  const v: any = results.videos[0];
                  tracks.push({
                    id: v.id || v.content_id,
                    videoId: v.id || v.content_id,
                    title: v.title?.text || v.title?.runs?.[0]?.text || sTrack.name,
                    artist: artistName || (v.author?.name || "Various Artists"),
                    duration: v.duration?.seconds || Math.floor((sTrack.duration || sTrack.duration_ms || 0) / 1000) || 180,
                  });
                }
              } catch (err) {
                console.error("Error matching Spotify track to YouTube:", err);
              }
            })
          );
        }

        if (tracks.length === 0) {
          return NextResponse.json({ error: "Could not find matching YouTube videos for this Spotify playlist." }, { status: 400 });
        }

        return NextResponse.json({ tracks, name: playlistName });
      } catch (err: any) {
        console.error("Spotify Import Error:", err);
        return NextResponse.json({ error: "Failed to parse Spotify link: " + (err.message || "Unknown error") }, { status: 400 });
      }
    }

    // 2. Check if input is a YouTube Playlist (URL or Playlist ID)
    let youtubePlaylistId: string | null = null;
    try {
      const parsedUrl = new URL(trimmedInput);
      youtubePlaylistId = parsedUrl.searchParams.get("list");
    } catch {
      // Regex search for playlist ID
      const match = trimmedInput.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (match) {
        youtubePlaylistId = match[1];
      } else if (/^(PL|UU|LL|RD|OLAK5uy_)[a-zA-Z0-9_-]+$/.test(trimmedInput)) {
        youtubePlaylistId = trimmedInput;
      }
    }

    if (youtubePlaylistId) {
      try {
        let playlist = await yt.getPlaylist(youtubePlaylistId);
        
        if (playlist.info?.title) {
          playlistName = playlist.info.title;
        }

        const rawItems: any[] = [];

        const collectItems = (feed: any) => {
          const items = feed.videos || feed.items || [];
          for (const item of items) {
            rawItems.push(item);
          }
        };

        // Collect initial page
        collectItems(playlist);

        // Fetch ALL continuation pages without artificial cutoff (up to 100 pages = 5,000+ tracks)
        let page = playlist;
        let pageCount = 0;
        while (page.has_continuation && pageCount < 100) {
          try {
            page = await page.getContinuation();
            collectItems(page);
            pageCount++;
          } catch (contErr) {
            console.warn("Continuation ended or failed at page", pageCount, contErr);
            break;
          }
        }

        // Deduplicate and extract all valid tracks
        const seen = new Set<string>();
        for (const item of rawItems) {
          const track = extractTrack(item);
          if (track && !seen.has(track.videoId)) {
            seen.add(track.videoId);
            tracks.push(track);
          }
        }

        if (tracks.length === 0) {
          return NextResponse.json({ error: "No playable tracks could be found in this YouTube playlist." }, { status: 400 });
        }

        return NextResponse.json({ tracks, name: playlistName });
      } catch (ytPlErr: any) {
        console.error("YouTube Playlist Fetch Error:", ytPlErr);
        return NextResponse.json({ error: "Failed to fetch YouTube playlist: " + (ytPlErr.message || "Invalid or private playlist") }, { status: 400 });
      }
    }

    // 3. Check if input is a direct YouTube Video link
    let singleVideoId: string | null = null;
    try {
      const parsedUrl = new URL(trimmedInput);
      if (parsedUrl.hostname.includes("youtu.be")) {
        singleVideoId = parsedUrl.pathname.replace("/", "");
      } else {
        singleVideoId = parsedUrl.searchParams.get("v");
      }
    } catch {
      if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedInput)) {
        singleVideoId = trimmedInput;
      }
    }

    if (singleVideoId) {
      try {
        const info = await yt.getInfo(singleVideoId);
        const title = info.basic_info.title || "Unknown Track";
        const artist = info.basic_info.author || "Various Artists";
        const duration = info.basic_info.duration || 180;
        
        return NextResponse.json({
          tracks: [{
            id: singleVideoId,
            videoId: singleVideoId,
            title,
            artist,
            duration,
          }],
          name: title,
        });
      } catch (singleErr) {
        console.error("Single Video Fetch Error:", singleErr);
      }
    }

    // 4. Natural Language AI Generation via Gemini
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured for prompt-based playlist generation." }, { status: 500 });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Create a music playlist with playlist title and 15-20 tracks based on this prompt: "${trimmedInput}".`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            playlistTitle: { type: Type.STRING },
            tracks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                },
                required: ["title", "artist"],
              },
            },
          },
          required: ["playlistTitle", "tracks"],
        },
      },
    });

    let generatedData: any = null;
    try {
      generatedData = JSON.parse(response.text?.trim() || "{}");
    } catch (parseJsonErr) {
      console.error("Failed to parse Gemini output:", parseJsonErr);
    }

    const generatedTracks = generatedData?.tracks || [];
    playlistName = generatedData?.playlistTitle || "AI Mix: " + trimmedInput.slice(0, 20);

    if (!Array.isArray(generatedTracks) || generatedTracks.length === 0) {
      return NextResponse.json({ error: "Failed to generate playlist for the given prompt." }, { status: 400 });
    }

    // Search YouTube in parallel batches for each generated track
    const chunkSize = 5;
    for (let i = 0; i < generatedTracks.length; i += chunkSize) {
      const chunk = generatedTracks.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (t: any) => {
          try {
            const searchStr = `${t.title} ${t.artist}`;
            const results = await yt.search(searchStr, { type: "video" });

            if (results.videos && results.videos.length > 0) {
              const v: any = results.videos[0];
              tracks.push({
                id: v.id || v.content_id,
                videoId: v.id || v.content_id,
                title: v.title?.text || v.title?.runs?.[0]?.text || t.title,
                artist: t.artist,
                duration: v.duration?.seconds || 180,
              });
            }
          } catch (err) {
            console.error("Error searching for AI track:", err);
          }
        })
      );
    }

    if (tracks.length === 0) {
      return NextResponse.json({ error: "Could not find YouTube videos for the generated playlist." }, { status: 400 });
    }

    return NextResponse.json({ tracks, name: playlistName });
  } catch (error: any) {
    console.error("Parse Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process playlist import" }, { status: 500 });
  }
}
