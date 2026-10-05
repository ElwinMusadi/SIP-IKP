import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Static clinical guidance, deliberately local to the review UI.
const severityLevels = [
  { level: 1, name: "Tidak signifikan", className: "bg-risk-blue text-risk-blue-foreground hover:bg-risk-blue", descriptions: ["Tidak ada cedera."] },
  { level: 2, name: "Minor", className: "bg-risk-green text-risk-green-foreground hover:bg-risk-green", descriptions: [
    "Cedera ringan, misalnya luka lecet.",
    "Dapat diatasi dengan pertolongan pertama.",
  ] },
  { level: 3, name: "Moderat", className: "bg-risk-yellow text-risk-yellow-foreground hover:bg-risk-yellow", descriptions: [
    "Cedera sedang, misalnya luka robek.",
    "Berkurangnya fungsi motorik/sensorik/psikologis atau intelektual (reversibel), tidak berhubungan dengan penyakit.",
    "Setiap kasus yang memperpanjang perawatan.",
  ] },
  { level: 4, name: "Mayor", className: "bg-severity-orange text-severity-orange-foreground hover:bg-severity-orange", descriptions: [
    "Cedera luas/berat, misalnya cacat, lumpuh.",
    "Kehilangan fungsi motorik/sensorik/psikologis atau intelektual (irreversibel), tidak berhubungan dengan penyakit.",
  ] },
  { level: 5, name: "Katastropik", className: "bg-risk-red text-risk-red-foreground hover:bg-risk-red", descriptions: [
    "Kematian yang tidak berhubungan dengan perjalanan penyakit.",
  ] },
] as const

export function SeverityReference() {
  return (
    <section aria-labelledby="severity-reference-title" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h4 id="severity-reference-title" className="text-sm font-semibold">Referensi Penilaian Dampak Klinis (Severity)</h4>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Gunakan informasi berikut sebagai referensi dalam menentukan pita grading risiko. Tingkat severity tidak otomatis menentukan pita grading risiko; penetapan risiko tetap dilakukan oleh Kepala Ruangan.
        </p>
      </div>
      <div className="hidden min-w-0 rounded-lg border md:block">
        <Table className="table-fixed">
          <TableHeader><TableRow>
            <TableHead className="w-20 whitespace-normal">Tingkat Risiko</TableHead>
            <TableHead className="w-36 whitespace-normal">Deskripsi</TableHead>
            <TableHead className="whitespace-normal">Dampak</TableHead>
          </TableRow></TableHeader>
          <TableBody>{severityLevels.map((row) => (
            <TableRow key={row.level} className={cn(row.className)}>
              <TableCell className="align-top whitespace-normal">{row.level}</TableCell>
              <TableCell className="align-top whitespace-normal">{row.name}</TableCell>
              <TableCell className="align-top whitespace-normal break-words">
                <ul className="flex list-disc flex-col gap-1 pl-4">{row.descriptions.map((description) => <li key={description}>{description}</li>)}</ul>
              </TableCell>
            </TableRow>
          ))}</TableBody>
        </Table>
      </div>
      <ol className="flex min-w-0 flex-col gap-2 md:hidden" aria-label="Tingkat dampak klinis">
        {severityLevels.map((row) => (
          <li key={row.level} className={cn("min-w-0 rounded-lg border p-3 break-words", row.className)}>
            <h5 className="text-sm font-semibold">{row.level}. {row.name}</h5>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-4 text-xs leading-relaxed">{row.descriptions.map((description) => <li key={description}>{description}</li>)}</ul>
          </li>
        ))}
      </ol>
    </section>
  )
}
