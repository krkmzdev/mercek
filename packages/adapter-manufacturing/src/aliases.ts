import type { MfgField } from './canonical';

export const MFG_ALIASES: Record<MfgField, string[]> = {
  timestamp: ['tarih', 'zaman', 'tarih saat', 'timestamp', 'date', 'time'],
  machineId: ['makine', 'makine no', 'makine id', 'tezgah', 'machine', 'machine id', 'equipment'],
  workOrderId: ['iş emri', 'iş emri no', 'work order', 'wo', 'order'],
  plannedTime: ['planlanan süre', 'planlı süre', 'planlanan üretim süresi', 'planned time', 'planned production time'],
  runtime: ['çalışma süresi', 'çalışma', 'runtime', 'run time', 'operating time'],
  idealCycleTime: ['ideal çevrim', 'ideal çevrim süresi', 'ideal cycle', 'ideal cycle time', 'çevrim süresi'],
  totalCount: ['toplam adet', 'üretim adedi', 'toplam üretim', 'total count', 'total', 'produced'],
  goodCount: ['sağlam adet', 'iyi adet', 'kabul', 'good count', 'good', 'ok count'],
  downtimeReason: ['duruş nedeni', 'duruş sebebi', 'arıza nedeni', 'downtime reason', 'stop reason', 'reason'],
  shift: ['vardiya', 'shift'],
  operatorId: ['operatör', 'operatör no', 'operator', 'operator id'],
};
