import { SignalSurface } from '@/components/signal/SignalSurface'
import { loadSignalFlag } from '@lib/signal/loadSignalFlag'
import { UploadAndEdit } from '@/app/user/plan/upload/UploadAndEdit'

export default async function UploadAndEditPage() {
  const signalEnabled = await loadSignalFlag()

  return (
    <SignalSurface signalEnabled={signalEnabled} surface="planning">
      <UploadAndEdit signalEnabled={signalEnabled} />
    </SignalSurface>
  )
}
