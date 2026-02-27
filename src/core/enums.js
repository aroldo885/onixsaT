/**
 * Enums for OnixSat project.
 */

const CollectorMode = Object.freeze({
  POSITIONS_ONLY: "POSITIONS_ONLY",
  POSITIONS_AND_VIOLATIONS: "POSITIONS_AND_VIOLATIONS",
  ONCE: "ONCE",
});

const ReportFormat = Object.freeze({
  CSV: "CSV",
  XLSX: "XLSX",
});

const ViolationType = Object.freeze({
  EXCESSO_VELOCIDADE: "EXCESSO_VELOCIDADE",
  VIOLACAO: "VIOLACAO",
});

const TimeRangeMode = Object.freeze({
  TODAY: "TODAY",
  LAST_HOURS: "LAST_HOURS",
  RANGE: "RANGE",
});

module.exports = {
  CollectorMode,
  ReportFormat,
  ViolationType,
  TimeRangeMode,
};
