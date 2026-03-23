import { redirect } from 'next/navigation'

// Redirect sang /tac-gia — page đó đã xử lý cả AUTHOR lẫn TRANSLATOR
export default function Page({ params }: { params: { id: string } }) {
  redirect(`/tac-gia/truyen/${params.id}`)
}
