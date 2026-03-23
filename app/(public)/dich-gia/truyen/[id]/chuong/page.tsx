import { redirect } from 'next/navigation'

export default function Page({ params }: { params: { id: string } }) {
  redirect(`/tac-gia/truyen/${params.id}/chuong`)
}
