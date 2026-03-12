import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export async function transcribeAudio(file: any): Promise<string> {
  try {

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1"
    })

    return transcription.text || ""

  } catch (error) {

    console.error("Audio transcription failed:", error)

    return ""
  }
}
