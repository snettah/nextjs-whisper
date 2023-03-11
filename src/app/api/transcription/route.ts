import { NextRequest, NextResponse } from 'next/server'
import { Configuration, OpenAIApi } from 'openai'
import { Readable } from 'stream'

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})
const openai = new OpenAIApi(configuration)

export async function POST(req: NextRequest) {
  if (!configuration.apiKey) {
    return NextResponse.json(
      {
        error: {
          message: 'OpenAI API key not configured, please follow instructions in README.md',
        },
      },
      { status: 500 }
    )
  }

  try {
    const formData = await req.formData()

    // const prompt = formData.get('prompt') as string
    const timestamp = formData.get('timestamp') as string
    const audio = formData.get('audio') as File

    const stream = audio.stream()
    const readableStream = Readable.fromWeb(stream)
    readableStream.path = 'hello.webm'

    const transcription = await openai.createTranscription(
      readableStream,
      'whisper-1', // model doc -> https://platform.openai.com/docs/api-reference/audio/create#audio
      //  The model will only consider the final 224 tokens of the prompt and ignore anything earlier.
      '', // prompt https://platform.openai.com/docs/guides/speech-to-text/prompting
      'text', // response
      0, // temperature
      'fr' // language
    )

    console.log('transcription: ', transcription.data)

    return NextResponse.json({ result: transcription.data, timestamp })
    // return NextResponse.json({ ok: false })
  } catch (error) {
    // Consider adjusting the error handling logic for your use case
    if (error.response) {
      console.error(error.response.status, error.response.data)
      return NextResponse.json(error.response.data, { status: error.response.status })
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`)
      return NextResponse.json(
        {
          error: {
            message: `An error occurred during your request: ${error.message}`,
          },
        },
        { status: 500 }
      )
    }
  }
}
