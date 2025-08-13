export enum DayType {
  NONE = 'NONE',
  CASA = 'CASA',
  AZIENDA = 'AZIENDA',
  PAR = 'PAR',
  FERIE = 'FERIE',
  FESTIVO = 'FESTIVO',
  MALATTIA = 'MALATTIA'
}

export interface CalendarDay {
  date: Date;
  day: number;
  month: number;
  year: number;
  type: DayType;
  secondaryType?: DayType; // Per gestire combinazioni di tipi (es. CASA + PAR)
  hours?: number;
  isWeekend: boolean;
  isHoliday: boolean;
}
