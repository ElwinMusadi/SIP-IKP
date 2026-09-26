import { Badge } from "@/components/ui/badge"
import type { RiskGrade } from "../types/incident"

interface RiskBadgeProps {
  grade?: RiskGrade | null
  className?: string
}

export function RiskBadge({ grade, className }: RiskBadgeProps) {
  if (!grade) {
    return (
      <Badge className={className} variant="outline">
        Belum Ditentukan
      </Badge>
    )
  }

  switch (grade) {
    case "BIRU":
      return (
        <Badge
          className={`bg-risk-blue text-risk-blue-foreground border-transparent font-medium ${className ?? ""}`}
          variant="outline"
        >
          Risiko Rendah (BIRU)
        </Badge>
      )
    case "HIJAU":
      return (
        <Badge
          className={`bg-risk-green text-risk-green-foreground border-transparent font-medium ${className ?? ""}`}
          variant="outline"
        >
          Risiko Sedang (HIJAU)
        </Badge>
      )
    case "KUNING":
      return (
        <Badge
          className={`bg-risk-yellow text-risk-yellow-foreground border-transparent font-medium ${className ?? ""}`}
          variant="outline"
        >
          Risiko Tinggi (KUNING)
        </Badge>
      )
    case "MERAH":
      return (
        <Badge
          className={`bg-risk-red text-risk-red-foreground border-transparent font-medium ${className ?? ""}`}
          variant="outline"
        >
          Risiko Ekstrem (MERAH)
        </Badge>
      )
  }
}
