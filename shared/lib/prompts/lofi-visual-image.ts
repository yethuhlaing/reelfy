export function lofiVisualImageSystemPrompt(): string {
  return `Generate a single 16:9 cinematic still frame for a lofi hip-hop YouTube video background loop.
Style: cozy atmospheric lofi aesthetic, soft warm or cool lighting, muted harmonious colors, gentle depth of field, cinematic composition, highly detailed environment, peaceful late-night study or chill mood.
Constraints: no people, no faces, no text, no logos, no watermark, no UI, no border, no frame — image bleeds edge to edge.
The image must match the scene description below exactly — do not substitute a generic stock room.

SCENE:
`
}

export function lofiVisualImageUserMessage(sceneDescription: string): string {
  return sceneDescription
}

export function lofiVisualImageRequest(sceneDescription: string): string {
  return `${lofiVisualImageSystemPrompt()}${lofiVisualImageUserMessage(sceneDescription)}`
}
