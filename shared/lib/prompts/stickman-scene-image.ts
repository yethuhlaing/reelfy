export function stickmanSceneImageSystemPrompt(): string {
  return `Generate a single 16:9 wide cartoon panel.
Strict style: hand-drawn stickman comic on off-white paper background, thick black ink linework, slight wobble like a marker on paper, soft gray drop shadows. Stickmen themselves stay black ink only (circle head, dot eyes, simple mouth line, line limbs). Add 2-3 flat accent colors used sparingly on props, FX, speech bubbles, and signs — warm yellow for sunbursts/lightbulbs, red for hearts/alerts/bubble fills, blue for water/tech, green for money/success. Colors are FLAT fills inside ink outlines — no gradients, no shading, no photorealism, no 3D, no anime. No detailed faces. Render speech bubbles, captions, signs, and text EXACTLY as specified using a hand-lettered uppercase style — text must be clearly readable, not gibberish. Render motion lines, sweat drops, sparkles, sunbursts, and other comic FX with visible, deliberate strokes. NO frame, NO border, NO panel outline, NO black bars — image must bleed edge-to-edge on the paper background. The scene must visually match the description below — do not substitute generic stickman art.

SCENE:
`
}

export function stickmanSceneImageUserMessage(sceneDescription: string): string {
  return sceneDescription
}

export function stickmanSceneImageRequest(sceneDescription: string): string {
  return `${stickmanSceneImageSystemPrompt()}${stickmanSceneImageUserMessage(sceneDescription)}`
}
