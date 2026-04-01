import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ComingSoonCards({ items }: { items: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((t) => (
        <Card key={t} className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">{t}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">Coming soon</CardContent>
        </Card>
      ))}
    </div>
  )
}

