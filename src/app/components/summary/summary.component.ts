import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CalendarService } from '../../services/calendar.service';
import { ExportService } from '../../services/export.service';
import { DayType } from '../../models/calendar-day';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.scss']
})
export class SummaryComponent implements OnInit {
  // Expose DayType enum to the template
  DayType = DayType;
  readonly year = 2025;
  summary: any;
  chartData: any[] = [];
  monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  dayTypeColors = {
    [DayType.CASA]: '#4CAF50',
    [DayType.AZIENDA]: '#2196F3',
    [DayType.PAR]: '#FF9800',
    [DayType.FERIE]: '#F44336',
    [DayType.FESTIVO]: '#9E9E9E',
    [DayType.MALATTIA]: '#d32f2f',
    [DayType.NONE]: '#FFFFFF'
  };

  constructor(
    private calendarService: CalendarService,
    private exportService: ExportService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.getSummary();
    this.calendarService.getCalendarUpdated().subscribe(updated => {
      if (updated) {
        this.getSummary();
      }
    });
  }

  getSummary(): void {
    this.summary = this.calendarService.getSummary(this.year);
    this.prepareChartData();
  }

  prepareChartData(): void {
    // Prepare data for visualization if needed
    this.chartData = this.summary.monthlyData.map((month: {
      month: number,
      casaDays: number,
      aziendaDays: number,
      parHours: number,
      ferieHours: number,
      malattiaDays: number,
      workingDays: number
    }) => ({
      month: this.monthNames[month.month],
      casaDays: month.casaDays,
      aziendaDays: month.aziendaDays,
      parHours: month.parHours,
      ferieHours: month.ferieHours,
      malattiaDays: month.malattiaDays || 0,
      workingDays: month.workingDays,
      utilizationPercent: this.calculateUtilization(month)
    }));
  }

  calculateUtilization(monthData: {
    casaDays: number,
    aziendaDays: number,
    parHours: number,
    ferieHours: number,
    malattiaDays: number,
    workingDays: number
  }): number {
    // Calcolo giorni equivalenti da ore di PAR e FERIE
    const parDaysEquivalent = monthData.parHours / 8; // Assuming 8 hours per day
    const ferieDaysEquivalent = monthData.ferieHours / 8; // Assuming 8 hours per day
    const malattiaDays = monthData.malattiaDays || 0; // Giorni di malattia (sempre 8 ore)
    
    // Questo è un totale approssimato che potrebbe includere conteggi duplicati
    // quando un giorno ha sia tipo primario che secondario
    const rawTotalDays = monthData.casaDays + monthData.aziendaDays + parDaysEquivalent + ferieDaysEquivalent + malattiaDays;
    
    // Se il totale supera i giorni lavorativi, usiamo i giorni lavorativi come massimo
    // Questo evita che la percentuale superi il 100% quando ci sono tipi secondari
    const totalEquivalentDays = Math.min(rawTotalDays, monthData.workingDays);
    
    return monthData.workingDays > 0 
      ? Math.round((totalEquivalentDays / monthData.workingDays) * 100) 
      : 0;
  }

  navigateToMonth(month: number): void {
    this.router.navigate(['/calendar', this.year, month]);
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }
  
  // Metodi per l'esportazione
  exportToExcel(): void {
    this.exportService.exportToExcel();
  }
  
  exportToPDF(): void {
    this.exportService.exportToPDF();
  }
}
