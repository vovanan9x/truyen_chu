import { redirect } from 'next/navigation'

export default function Page({ params }: { params: { id: string; chapterId: string } }) {
  redirect(`/tac-gia/truyen/${params.id}/chuong/${params.chapterId}/sua`)
}
