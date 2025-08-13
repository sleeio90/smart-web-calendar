import { Injectable } from '@angular/core';
import { CalendarService } from './calendar.service';
import { DayType } from '../models/calendar-day';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor(private calendarService: CalendarService) { }

  // Metodo per ottenere il nome del tipo di giorno
  private getDayTypeName(type: DayType): string {
    switch (type) {
      case DayType.CASA: return 'CASA';
      case DayType.AZIENDA: return 'AZIENDA';
      case DayType.PAR: return 'PAR';
      case DayType.FERIE: return 'FERIE';
      case DayType.FESTIVO: return 'FESTIVO';
      case DayType.MALATTIA: return 'MALATTIA';
      default: return 'NESSUNO';
    }
  }

  // Metodo per esportare i dati del calendario in Excel
  exportToExcel(): void {
    const year = 2025; // Anno di riferimento
    const summary = this.calendarService.getSummary(year);
    const workbook = XLSX.utils.book_new();
    
    // Titolo del workbook
    workbook.Props = {
      Title: "Calendario Smart Working " + year,
      Subject: "Riepilogo annuale e mensile",
      Author: "Smart Calendar App",
      CreatedDate: new Date()
    };

    // Foglio con il riepilogo mensile
    const monthlyData = summary.monthlyData.map(month => {
      return {
        'Mese': this.getMonthName(month.month),
        'Giorni CASA': month.casaDays,
        'Giorni AZIENDA': month.aziendaDays,
        'Ore PAR': month.parHours,
        'Ore FERIE': month.ferieHours,
        'Giorni MALATTIA': month.malattiaDays,
        'Giorni Lavorativi': month.workingDays,
        'Utilizzo (%)': this.calculateUtilizationPercent(month) + '%' // Aggiungiamo il simbolo % per uniformità
      };
    });

    const monthlySheet = XLSX.utils.json_to_sheet(monthlyData);
    XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Riepilogo Mensile');

    // Foglio con il riepilogo annuale
    const yearlyData = [{
      'Giorni CASA Totali': summary.casaDays,
      'Giorni AZIENDA Totali': summary.aziendaDays,
      'Ore PAR Totali': summary.parHours,
      'Ore FERIE Totali': summary.ferieHours,
      'Giorni MALATTIA Totali': summary.malattiaDays,
      'Giorni Lavorativi Totali': summary.workingDays
    }];

    const yearlySheet = XLSX.utils.json_to_sheet(yearlyData);
    XLSX.utils.book_append_sheet(workbook, yearlySheet, 'Riepilogo Annuale');

    // Foglio con il dettaglio di tutti i giorni
    const allCalendarDays = this.calendarService.getAllCalendarDays();
    const daysData = allCalendarDays
      .filter(day => 
        // Includiamo solo giorni con un tipo assegnato (diverso da NONE e FESTIVO)
        day.type !== DayType.NONE && day.type !== DayType.FESTIVO && 
        // Escludiamo weekend e festivi
        !day.isWeekend && !day.isHoliday
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime()) // Ordiniamo per data
      .map((day, index) => {
        // Se c'è un tipo secondario, includiamo il dettaglio delle ore
        if (day.secondaryType) {
          return {
            '#': index + 1,
            'Data': this.formatDate(day.date),
            'Tipo Primario': this.getDayTypeName(day.type),
            'Ore Primario': day.hours || 0,
            'Tipo Secondario': this.getDayTypeName(day.secondaryType),
            'Ore Secondario': 8 - (day.hours || 0) // Le ore rimanenti per arrivare a 8
          };
        } else {
          // Se non c'è tipo secondario, non includiamo le ore
          return {
            '#': index + 1,
            'Data': this.formatDate(day.date),
            'Tipo Primario': this.getDayTypeName(day.type),
            'Tipo Secondario': ''
          };
        }
      });

    const daysSheet = XLSX.utils.json_to_sheet(daysData);
    XLSX.utils.book_append_sheet(workbook, daysSheet, 'Dettaglio Giorni');

    // Esporta il file Excel
    XLSX.writeFile(workbook, 'Calendario_Smart_Working_2025.xlsx');
  }

  // Metodo per esportare i dati del calendario in PDF
  exportToPDF(): void {
    const year = 2025; // Anno di riferimento
    const summary = this.calendarService.getSummary(year);
    const doc = new jsPDF();
    
    // Titolo
    doc.setFontSize(18);
    doc.text('Calendario Smart Working 2025', 14, 20);
    
    // Riepilogo annuale
    doc.setFontSize(14);
    doc.text('Riepilogo Annuale', 14, 30);
    
    const yearlyData = [
      ['Giorni CASA', summary.casaDays.toString()],
      ['Giorni AZIENDA', summary.aziendaDays.toString()],
      ['Ore PAR', summary.parHours.toString()],
      ['Ore FERIE', summary.ferieHours.toString()],
      ['Giorni MALATTIA', summary.malattiaDays.toString()],
      ['Giorni Lavorativi', summary.workingDays.toString()]
    ];
    
    autoTable(doc, {
      startY: 35,
      head: [['Tipologia', 'Valore']],
      body: yearlyData,
      theme: 'striped',
      headStyles: { fillColor: [66, 133, 244] }
    });
    
    // Riepilogo mensile
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Riepilogo Mensile', 14, 20);
    
    const monthlyHead = [['Mese', 'CASA', 'AZIENDA', 'PAR (ore)', 'FERIE (ore)', 'MALATTIA', 'Lavorativi', 'Utilizzo (%)']];
    const monthlyBody = summary.monthlyData.map(month => [
      this.getMonthName(month.month),
      month.casaDays.toString(),
      month.aziendaDays.toString(),
      month.parHours.toString(),
      month.ferieHours.toString(),
      month.malattiaDays.toString(),
      month.workingDays.toString(),
      this.calculateUtilizationPercent(month) + '%'  // Aggiungiamo il simbolo % per uniformità
    ]);
    
    autoTable(doc, {
      startY: 25,
      head: monthlyHead,
      body: monthlyBody,
      theme: 'striped',
      headStyles: { fillColor: [66, 133, 244] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 }
      }
    });
    
    // Aggiungiamo una pagina per il dettaglio giorni
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Dettaglio Giorni', 14, 20);
    
    // Otteniamo tutti i giorni del calendario
    // Usiamo getAllCalendarDays e poi filtriamo solo i giorni con un tipo assegnato
    // per assicurarci di includere tutti i giorni con tipologia assegnata
    const allCalendarDays = this.calendarService.getAllCalendarDays();
    
    // Creiamo due array separati: uno per i giorni con tipo secondario e uno senza
    const daysWithSecondaryType: string[][] = [];
    const daysWithoutSecondaryType: string[][] = [];
    
    // Filtriamo e dividiamo i giorni
    allCalendarDays
      .filter(day => 
        // Includiamo solo giorni con un tipo assegnato (diverso da NONE e FESTIVO)
        day.type !== DayType.NONE && day.type !== DayType.FESTIVO && 
        // Escludiamo weekend e festivi
        !day.isWeekend && !day.isHoliday
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime()) // Ordiniamo per data
      .forEach((day, index) => {
        if (day.secondaryType) {
          daysWithSecondaryType.push([
            (index + 1).toString(), // Indice incrementale
            this.formatDate(day.date),
            this.getDayTypeName(day.type),
            (day.hours || 0).toString(),
            this.getDayTypeName(day.secondaryType),
            (8 - (day.hours || 0)).toString() // Ore secondarie
          ]);
        } else {
          daysWithoutSecondaryType.push([
            (index + 1).toString(), // Indice incrementale
            this.formatDate(day.date),
            this.getDayTypeName(day.type),
            '', // Cella vuota per allineamento
            '', // Cella vuota per allineamento
            '' // Cella vuota per allineamento
          ]);
        }
      });
    
    // Intestazioni per la tabella dei giorni con tipo secondario
    const daysWithSecondaryTypeHead = [['#', 'Data', 'Tipo Primario', 'Ore Primario', 'Tipo Secondario', 'Ore Secondario']];
    
    // Intestazioni per la tabella dei giorni senza tipo secondario
    const daysWithoutSecondaryTypeHead = [['#', 'Data', 'Tipo', '', '', '']];
    
    // Creiamo una pagina per i giorni con tipo secondario (se ce ne sono)
    if (daysWithSecondaryType.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Dettaglio Giorni con Tipo Secondario', 14, 20);
      
      autoTable(doc, {
        startY: 25,
        head: daysWithSecondaryTypeHead,
        body: daysWithSecondaryType,
        theme: 'striped',
        headStyles: { fillColor: [66, 133, 244] },
        styles: { fontSize: 8 }
      });
    }
    
    // Creiamo una pagina per i giorni senza tipo secondario (se ce ne sono)
    if (daysWithoutSecondaryType.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Dettaglio Giorni con Tipo Singolo', 14, 20);
      
      autoTable(doc, {
        startY: 25,
        head: daysWithoutSecondaryTypeHead,
        body: daysWithoutSecondaryType,
        theme: 'striped',
        headStyles: { fillColor: [66, 133, 244] },
        styles: { fontSize: 8 }
      });
    }
    
    // Salvataggio del PDF
    doc.save('Calendario_Smart_Working_2025.pdf');
  }

  // Metodo per calcolare la percentuale di utilizzo
  private calculateUtilizationPercent(month: any): string {
    const workingDays = month.workingDays;
    if (workingDays === 0) return '0';
    
    // Calcolo giorni equivalenti da ore di PAR e FERIE, come in summary.component.ts
    const parDaysEquivalent = month.parHours / 8; // Assuming 8 hours per day
    const ferieDaysEquivalent = month.ferieHours / 8; // Assuming 8 hours per day
    const malattiaDays = month.malattiaDays || 0; // Giorni di malattia (sempre 8 ore)
    
    // Calcola il totale dei giorni approssimato (potrebbe includere conteggi duplicati)
    const rawTotalDays = month.casaDays + month.aziendaDays + parDaysEquivalent + ferieDaysEquivalent + malattiaDays;
    
    // Limita al 100% se supera i giorni lavorativi
    const totalEquivalentDays = Math.min(rawTotalDays, workingDays);
    
    // Utilizza Math.round per ottenere un intero, come in summary.component.ts
    return Math.round((totalEquivalentDays / workingDays) * 100).toString();
  }

  // Helper per ottenere il nome del mese
  private getMonthName(monthIndex: number): string {
    const monthNames = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ];
    return monthNames[monthIndex];
  }

  // Helper per formattare la data
  private formatDate(date: Date): string {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
