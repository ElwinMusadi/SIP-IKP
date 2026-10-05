import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer"
import { normalizeInitialReporters } from "../lib/initial-reporters"

import type {
  ActionItem,
  AuditRecord,
  IncidentReport,
  RecommendationItem,
  SimpleInvestigation,
} from "../types/incident"
import {
  formatPrintAuditLabel,
  formatPrintStatus,
  parsePrintTableRows,
} from "../utils/print-formatters"

export interface IncidentPdfDocumentProps {
  report: IncidentReport
  investigation: SimpleInvestigation | null
  auditRecords: AuditRecord[]
  printedAt: string
}

const colors = {
  black: "#111827",
  gray: "#475569",
  border: "#94a3b8",
  pale: "#f1f5f9",
  teal: "#115e59",
  red: "#be123c",
  amber: "#fffbeb",
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingRight: 42,
    paddingBottom: 34,
    paddingLeft: 42,
    fontFamily: "Helvetica",
    fontSize: 8,
    lineHeight: 1.35,
    color: colors.black,
  },
  header: { borderBottomWidth: 1.5, borderBottomColor: colors.black, paddingBottom: 7 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: colors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: colors.teal },
  headerCenter: { flexGrow: 1, paddingHorizontal: 12, textAlign: "center" },
  government: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  hospital: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 2 },
  committee: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: colors.teal, marginTop: 2 },
  address: { fontSize: 6.7, color: colors.gray, marginTop: 2 },
  confidential: {
    width: 48,
    minHeight: 40,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: 4,
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    marginTop: 7,
    paddingTop: 5,
    fontSize: 6.3,
  },
  metaWide: { width: "45%" },
  meta: { width: "27.5%", textAlign: "center" },
  title: { fontSize: 10.5, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 10 },
  classification: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    color: colors.red,
    marginTop: 3,
  },
  draft: {
    marginTop: 8,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.black,
    padding: 6,
    textAlign: "center",
    fontFamily: "Helvetica-Bold",
  },
  statusPanel: {
    flexDirection: "row",
    marginTop: 10,
    borderWidth: 0.75,
    borderColor: colors.black,
    backgroundColor: colors.pale,
    padding: 6,
  },
  statusColumn: { width: "50%" },
  label: { fontSize: 6.5, color: colors.gray },
  strong: { fontFamily: "Helvetica-Bold" },
  section: { marginTop: 12 },
  sectionHeading: {
    backgroundColor: "#e2e8f0",
    borderBottomWidth: 0.75,
    borderBottomColor: colors.black,
    paddingVertical: 3,
    paddingHorizontal: 5,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
  },
  table: { borderWidth: 0.5, borderColor: colors.border, marginTop: 3 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: colors.border },
  lastRow: { flexDirection: "row" },
  cellLabel: {
    width: "34%",
    padding: 4,
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
    backgroundColor: "#f8fafc",
    fontFamily: "Helvetica-Bold",
  },
  cellValue: { width: "66%", padding: 4 },
  note: {
    marginTop: 10,
    borderWidth: 0.75,
    borderColor: colors.black,
    backgroundColor: colors.amber,
    padding: 6,
  },
  subheading: { fontSize: 7.3, fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 3 },
  dataHeader: {
    flexDirection: "row",
    backgroundColor: colors.pale,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    fontFamily: "Helvetica-Bold",
  },
  numberCell: {
    width: "7%",
    padding: 3,
    borderRightWidth: 0.5,
    borderRightColor: colors.border,
    textAlign: "center",
  },
  textCell: { width: "43%", padding: 3, borderRightWidth: 0.5, borderRightColor: colors.border },
  ownerCell: { width: "30%", padding: 3, borderRightWidth: 0.5, borderRightColor: colors.border },
  targetCell: { width: "20%", padding: 3 },
  attributionGrid: { flexDirection: "row", marginTop: 4 },
  attributionBox: {
    width: "33.333%",
    minHeight: 78,
    borderWidth: 0.5,
    borderColor: colors.border,
    padding: 6,
    justifyContent: "space-between",
  },
  attributionSeal: { textAlign: "center", fontSize: 6, color: colors.gray, marginVertical: 10 },
  attributionValue: {
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    paddingTop: 3,
    textAlign: "center",
    fontSize: 6.5,
  },
  auditTime: { width: "21%", padding: 3, borderRightWidth: 0.5, borderRightColor: colors.border },
  auditType: { width: "24%", padding: 3, borderRightWidth: 0.5, borderRightColor: colors.border },
  auditActor: { width: "25%", padding: 3, borderRightWidth: 0.5, borderRightColor: colors.border },
  auditNote: { width: "30%", padding: 3 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 6,
    color: colors.gray,
  },
})

function value(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-"
  return typeof value === "number" ? value.toString() : value
}

function dateTime(valueToFormat: string | null | undefined): string {
  return valueToFormat ? `${new Date(valueToFormat).toLocaleString("id-ID")} WITA` : "-"
}

function dateOnly(valueToFormat: string | null | undefined): string {
  return valueToFormat ? new Date(valueToFormat).toLocaleDateString("id-ID") : "-"
}

function pdfPageNumber(valueToFormat: unknown): string {
  return typeof valueToFormat === "number" ? valueToFormat.toString() : "-"
}

function DetailRow({
  label,
  children,
  last = false,
}: {
  label: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <View style={last ? styles.lastRow : styles.row} wrap={false}>
      <Text style={styles.cellLabel}>{label}</Text>
      <Text style={styles.cellValue}>{children}</Text>
    </View>
  )
}

function DataTable({
  rows,
  emptyText,
}: {
  rows: Array<RecommendationItem | ActionItem>
  emptyText: string
}) {
  return (
    <View style={styles.table}>
      <View style={styles.dataHeader} wrap={false}>
        <Text style={styles.numberCell}>No</Text>
        <Text style={styles.textCell}>Uraian</Text>
        <Text style={styles.ownerCell}>Penanggung Jawab</Text>
        <Text style={styles.targetCell}>Target Waktu</Text>
      </View>
      {rows.length ? (
        rows.map((row, index) => (
          <View
            key={`${index.toString()}-${row.text}`}
            style={index === rows.length - 1 ? styles.lastRow : styles.row}
            wrap={false}
          >
            <Text style={styles.numberCell}>{index + 1}</Text>
            <Text style={styles.textCell}>{value(row.text)}</Text>
            <Text style={styles.ownerCell}>{value(row.responsible)}</Text>
            <Text style={styles.targetCell}>{value(row.target_date)}</Text>
          </View>
        ))
      ) : (
        <Text style={{ padding: 5, textAlign: "center", color: colors.gray }}>{emptyText}</Text>
      )}
    </View>
  )
}

export function IncidentPdfDocument({
  report,
  investigation,
  auditRecords,
  printedAt,
}: IncidentPdfDocumentProps) {
  const recommendations = parsePrintTableRows<RecommendationItem>(
    investigation?.recommendations,
    "recommendations",
  )
  const actions = parsePrintTableRows<ActionItem>(investigation?.actions, "actions")
  const showInvestigation =
    investigation &&
    (report.status === "SIMPLE_INVESTIGATION" || report.status === "COMPLETED_BY_UNIT")
  const printTime = dateTime(printedAt || new Date().toISOString())
  const target = `${value(report.incident_target)}${report.incident_target_other ? ` (${report.incident_target_other})` : ""}`
  const initialReporters = normalizeInitialReporters(report)
  const similarIncident = `${value(report.similar_incident_occurred)}${report.similar_incident_details ? ` (Detail: ${report.similar_incident_details})` : ""}`
  const patientName =
    "patient_name" in report
      ? value(report.patient_name)
      : "[Disensor Sesuai Kebijakan Privasi Administrator]"
  const medicalRecordNumber =
    "medical_record_number" in report
      ? value(report.medical_record_number)
      : "[Disensor Sesuai Kebijakan Privasi Administrator]"
  const chronology =
    "chronology" in report
      ? value(report.chronology)
      : "[Disensor Sesuai Kebijakan Privasi Administrator]"
  const closeAuthority =
    report.status === "COMPLETED_BY_UNIT"
      ? "Kepala Ruangan IBS"
      : report.status === "COMPLETED"
        ? "Komite PMKP RS"
        : "-"

  return (
    <Document
      title={`Formulir IKP ${report.report_number ?? report.id}`}
      author="SIP-IKP RSUD Prof. Dr. W. Z. Johannes Kupang"
      subject="Formulir Pelaporan Insiden Keselamatan Pasien"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <View style={styles.headerRow}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>RSUD</Text>
            </View>
            <View style={styles.headerCenter}>
              <Text style={styles.government}>PEMERINTAH PROVINSI NUSA TENGGARA TIMUR</Text>
              <Text style={styles.hospital}>RSUD PROF. DR. W. Z. JOHANNES KUPANG</Text>
              <Text style={styles.committee}>
                INSTALASI BEDAH SENTRAL (IBS) • KOMITE MUTU & KESELAMATAN PASIEN (PMKP)
              </Text>
              <Text style={styles.address}>
                Jl. Dr. Moch. Hatta No. 19, Kupang, NTT • Telp: (0380) 833614
              </Text>
            </View>
            <View style={styles.confidential}>
              <Text>DOKUMEN RAHASIA</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaWide}>
              SISTEM INFORMASI PELAPORAN INSIDEN KESELAMATAN PASIEN (SIP-IKP)
            </Text>
            <Text style={styles.meta}>NOMOR: {report.report_number ?? "DRAF-IKP"}</Text>
            <Text style={styles.meta}>DICETAK: {printTime}</Text>
          </View>
        </View>
        <Text style={styles.title}>FORMULIR PELAPORAN INSIDEN KESELAMATAN PASIEN (IKP)</Text>
        <Text style={styles.classification}>
          RAHASIA • TIDAK BOLEH DIFOTOCOPY • DILAPORKAN MAKSIMAL 2 X 24 JAM
        </Text>
        {report.status === "DRAFT" && (
          <Text style={styles.draft}>
            *** DRAF — BELUM MENJADI LAPORAN RESMI (TIDAK BERLAKU UNTUK AUDIT AKREDITASI) ***
          </Text>
        )}
        <View style={styles.statusPanel} wrap={false}>
          <View style={styles.statusColumn}>
            <Text style={styles.label}>Status Dokumen:</Text>
            <Text style={styles.strong}>{formatPrintStatus(report.status)}</Text>
          </View>
          <View style={styles.statusColumn}>
            <Text style={styles.label}>Grading Risiko:</Text>
            <Text style={styles.strong}>
              {report.risk_grade ? `PITA RISIKO ${report.risk_grade}` : "BELUM DITENTUKAN"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading} wrap={false}>
            I. DATA PASIEN
          </Text>
          <View style={styles.table}>
            <DetailRow label="1. Nama Pasien">{patientName}</DetailRow>
            <DetailRow label="2. No. Rekam Medis (No. MR)">{medicalRecordNumber}</DetailRow>
            <DetailRow label="3. Ruangan / Bangsal Pasien">{value(report.patient_room)}</DetailRow>
            <DetailRow label="4. Kelompok Umur">{value(report.patient_age_category)}</DetailRow>
            <DetailRow label="5. Jenis Kelamin">
              {report.patient_gender === "LAKI_LAKI"
                ? "Laki-laki"
                : report.patient_gender === "PEREMPUAN"
                  ? "Perempuan"
                  : "-"}
            </DetailRow>
            <DetailRow label="6. Penanggung Biaya Pasien">
              {value(report.patient_payer_type)}
            </DetailRow>
            <DetailRow label="7. Tanggal & Jam Masuk RS">
              {dateTime(report.admission_datetime)}
            </DetailRow>
            <DetailRow label="8. Jenis Pelayanan Pasien" last>
              {value(report.patient_care_type)}
            </DetailRow>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeading} wrap={false}>
            II. RINCIAN KEJADIAN INSIDEN
          </Text>
          <View style={styles.table}>
            <DetailRow label="1. Tanggal & Waktu Insiden">
              {dateTime(report.incident_datetime)}
            </DetailRow>
            <DetailRow label="2. Jenis Insiden">{`${report.incident_type} — ${report.incident_type === "KNC" ? "Kejadian Nyaris Cedera (Near Miss)" : report.incident_type === "KTC" ? "Kejadian Tidak Cedera (No Harm)" : report.incident_type === "KTD" ? "Kejadian Tidak Diharapkan (Adverse Event)" : "Kejadian Sentinel (Sentinel Event)"}`}</DetailRow>
            <DetailRow label="3. Judul / Ringkasan Insiden">
              {value(report.incident_title)}
            </DetailRow>
            <DetailRow label="4. Insiden Terjadi Pada (Sasaran)">{target}</DetailRow>
            <Text style={styles.sectionHeading} minPresenceAhead={35}>
              5. Orang Pertama Melaporkan
            </Text>
            {initialReporters.length ? initialReporters.map((reporter, index) => (
              <View key={index} style={{ padding: 4, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>
                <Text style={styles.strong} minPresenceAhead={20}>Pelapor {index + 1}</Text>
                <Text>Nama/Identitas Pelapor: {reporter.name || "Tidak tercatat"}</Text>
                <Text>Kategori: {value(reporter.category)}</Text>
                <Text>Detail: {value(reporter.detail)}</Text>
              </View>
            )) : <Text style={{ padding: 4, borderBottomWidth: 0.5, borderBottomColor: colors.border }}>-</Text>}
            <DetailRow label="6. Tempat / Kamar Operasi Kejadian">
              {value(report.incident_location)}
            </DetailRow>
            <DetailRow label="7. Spesialisasi Kasus Terkait">
              {value(report.clinical_specialization)}
            </DetailRow>
            <DetailRow label="8. Unit Penyebab Insiden">{value(report.causing_unit)}</DetailRow>
            <DetailRow label="9. Akibat / Derajat Cedera Pasien">
              {value(report.patient_impact)}
            </DetailRow>
            <DetailRow label="10. Kronologi Lengkap Insiden (5W+1H)">{chronology}</DetailRow>
            <DetailRow label="11. Tindakan Segera & Hasilnya">
              {value(report.immediate_action_and_result)}
            </DetailRow>
            <DetailRow label="12. Tindakan Dilakukan Oleh">
              {value(report.action_taken_by)}
            </DetailRow>
            <DetailRow label="13. Kejadian Serupa Pernah Terjadi?" last>
              {similarIncident}
            </DetailRow>
          </View>
        </View>

        {report.high_risk_mitigation_notes && (
          <View style={styles.note} wrap={false}>
            <Text style={styles.strong}>
              Catatan Awal Mitigasi & Tindakan Pencegahan Segera (Kepala Ruangan IBS):
            </Text>
            <Text>{report.high_risk_mitigation_notes}</Text>
          </View>
        )}
        {showInvestigation && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading} wrap={false}>
              III. LEMBAR KERJA INVESTIGASI SEDERHANA
            </Text>
            <View style={styles.table}>
              <DetailRow label="1. Penyebab Langsung Insiden (Direct Cause)">
                {value(investigation.direct_cause)}
              </DetailRow>
              <DetailRow label="2. Akar Masalah (Root Cause)">
                {value(investigation.underlying_root_cause)}
              </DetailRow>
              <DetailRow
                label="3. Rentang Waktu Investigasi"
                last
              >{`Mulai: ${value(investigation.investigation_start_date)} • Selesai: ${value(investigation.investigation_end_date)}`}</DetailRow>
            </View>
            <Text style={styles.subheading} wrap={false}>
              TABEL REKOMENDASI PENCEGAHAN:
            </Text>
            <DataTable rows={recommendations} emptyText="Tidak ada data rekomendasi" />
            <Text style={styles.subheading} wrap={false}>
              TABEL TINDAKAN PERBAIKAN (ACTION PLAN):
            </Text>
            <DataTable rows={actions} emptyText="Tidak ada data tindakan" />
          </View>
        )}
        {report.pmkp_review_notes && (
          <View style={styles.note} wrap={false}>
            <Text style={styles.strong}>Catatan Arahan & Evaluasi Komite PMKP:</Text>
            <Text>{report.pmkp_review_notes}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionHeading} wrap={false}>
            ATRIBUSI DOKUMEN
          </Text>
          <View style={styles.attributionGrid} wrap={false}>
            <View style={styles.attributionBox}>
              <Text style={styles.strong}>Dibuat oleh (Pelapor):</Text>
              <Text style={styles.attributionSeal}>[TERVERIFIKASI SISTEM]</Text>
              <View style={styles.attributionValue}>
                <Text style={styles.strong}>{report.reporter_name}</Text>
                <Text>{report.reporter_role}</Text>
                <Text>{report.submitted_at ? dateOnly(report.submitted_at) : "Draf"}</Text>
              </View>
            </View>
            <View style={styles.attributionBox}>
              <Text style={styles.strong}>Diterima / Diverifikasi oleh:</Text>
              <Text style={styles.attributionSeal}>[TERVERIFIKASI SISTEM]</Text>
              <View style={styles.attributionValue}>
                <Text style={styles.strong}>Kepala Ruangan IBS</Text>
                <Text>Instalasi Bedah Sentral</Text>
                <Text>{dateOnly(report.received_at)}</Text>
              </View>
            </View>
            <View style={styles.attributionBox}>
              <Text style={styles.strong}>Ditutup oleh (Atribusi Penutupan):</Text>
              <Text style={styles.attributionSeal}>[ATRIBUSI SISTEM]</Text>
              <View style={styles.attributionValue}>
                <Text style={styles.strong}>{closeAuthority}</Text>
                <Text>
                  {report.completed_at
                    ? `Selesai: ${dateOnly(report.completed_at)}`
                    : "Dalam Proses"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {auditRecords.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionHeading} wrap={false}>
              CATATAN JEJAK AUDIT DOKUMEN (SYSTEM AUDIT TRAIL)
            </Text>
            <View style={styles.table}>
              <View style={styles.dataHeader} wrap={false}>
                <Text style={styles.auditTime}>Waktu (WITA)</Text>
                <Text style={styles.auditType}>Jenis Tindakan</Text>
                <Text style={styles.auditActor}>Pelaku</Text>
                <Text style={styles.auditNote}>Catatan / Keterangan</Text>
              </View>
              {auditRecords.map((record, index) => (
                <View
                  key={record.id}
                  style={index === auditRecords.length - 1 ? styles.lastRow : styles.row}
                  wrap={false}
                >
                  <Text style={styles.auditTime}>{dateTime(record.occurredAt)}</Text>
                  <Text style={styles.auditType}>{formatPrintAuditLabel(record.eventType)}</Text>
                  <Text style={styles.auditActor}>
                    {record.actorName} ({record.actorRole})
                  </Text>
                  <Text style={styles.auditNote}>{value(record.notes)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <View style={styles.footer} fixed>
          <Text>SIP-IKP • DOKUMEN RAHASIA</Text>
          <Text
            render={({ pageNumber, totalPages }) =>
              `Halaman ${pdfPageNumber(pageNumber)} dari ${pdfPageNumber(totalPages)}`
            }
          />
        </View>
      </Page>
    </Document>
  )
}
