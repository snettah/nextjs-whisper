import React from 'react'

type Props = {
  transcriptions: Transcriptions
}

function format_time(s: string) {
  const dtFormat = new Intl.DateTimeFormat('fr-FR', {
    timeStyle: 'medium',
    timeZone: 'Europe/Paris',
  })

  return dtFormat.format(new Date(Number(s)))
}

function Transcriptions({ transcriptions }: Props) {
  console.log('transcriptions: ', transcriptions)
  const sorted = transcriptions.sort((a, b) => a.timestamp.localeCompare(b.timestamp))
  console.log('sorted: ', sorted)

  // const trans = Object.entries(transcription).map(([key, value]) => {
  //   format_time(key)
  //   console.log('value: ', value)
  //   return [key]
  // }).sort(([time]) => )
  return <pre>{JSON.stringify(transcriptions, null, 2)}</pre>
}

export default Transcriptions
