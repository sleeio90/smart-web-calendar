import { Injectable } from '@angular/core';
import { DayType, CalendarDay } from '../models/calendar-day';
import { Observable, of, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private calendarData: { [key: string]: CalendarDay } = {};
  private storageKey = 'smartWorkingCalendar2025';
  private calendarUpdated = new BehaviorSubject<boolean>(false);

  // Lista delle festività italiane e del Santo Patrono di Palermo per il 2025
  private holidays: Date[] = [
    new Date(2025, 0, 1),  // Capodanno
    new Date(2025, 0, 6),  // Epifania
    new Date(2025, 3, 21), // Lunedì dell'Angelo
    new Date(2025, 3, 25), // Festa della Liberazione
    new Date(2025, 4, 1),  // Festa dei Lavoratori
    new Date(2025, 5, 2),  // Festa della Repubblica
    new Date(2025, 6, 15), // Santo Patrono di Palermo
    new Date(2025, 7, 15), // Assunzione
    new Date(2025, 10, 1), // Tutti i Santi
    new Date(2025, 11, 8), // Immacolata Concezione
    new Date(2025, 11, 25), // Natale
    new Date(2025, 11, 26), // Santo Stefano
  ];

  constructor() { 
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const savedData = localStorage.getItem(this.storageKey);
      if (savedData) {
        console.log('Found saved calendar data in localStorage');
        const parsed = JSON.parse(savedData);
        // Converti le date salvate come stringhe in oggetti Date
        this.calendarData = Object.keys(parsed).reduce((acc, key) => {
          try {
            // Assicurati che hours sia un numero
            const parsedItem = {...parsed[key]};
            if (parsedItem.hours !== undefined) {
              parsedItem.hours = Number(parsedItem.hours);
            }
            
            acc[key] = {
              ...parsedItem,
              date: new Date(parsed[key].date)
            };
          } catch (error) {
            console.error(`Error parsing date for key ${key}:`, error);
            // Use current date as fallback
            acc[key] = {
              ...parsed[key],
              date: new Date()
            };
          }
          return acc;
        }, {} as { [key: string]: CalendarDay });
        this.calendarUpdated.next(true);
        console.log('Calendar data loaded successfully');
      } else {
        console.log('No saved calendar data found');
      }
    } catch (error) {
      console.error('Error loading data from storage:', error);
      this.calendarData = {};
    }
  }

  private saveToStorage(): void {
    try {
      // Prepariamo una versione del calendario con date convertite in stringhe
      // per evitare errori di circolarità durante la serializzazione
      interface SerializableCalendarDay extends Omit<CalendarDay, 'date'> {
        date: string;
      }
      
      const serializableData: Record<string, SerializableCalendarDay> = {};
      
      for (const key in this.calendarData) {
        if (this.calendarData.hasOwnProperty(key)) {
          const day = this.calendarData[key];
          serializableData[key] = {
            ...day,
            date: day.date ? day.date.toISOString() : new Date().toISOString()
          };
        }
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(serializableData));
      this.calendarUpdated.next(true);
      console.log('Calendar data saved to localStorage');
    } catch (error) {
      console.error('Error saving data to storage:', error);
      // In caso di errore, proviamo a pulire lo storage esistente
      try {
        localStorage.removeItem(this.storageKey);
        console.log('Storage cleared due to error');
      } catch (clearError) {
        console.error('Failed to clear storage:', clearError);
      }
    }
  }

  getCalendarUpdated(): Observable<boolean> {
    return this.calendarUpdated.asObservable();
  }

  // Ottieni tutti i giorni del calendario come array
  getAllCalendarDays(): CalendarDay[] {
    return Object.values(this.calendarData);
  }

  generateCalendarMonth(year: number, month: number, saveData: boolean = false): CalendarDay[] {
    console.log(`Generating calendar for ${year}-${month}`);
    const days: CalendarDay[] = [];
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    console.log(`Month has ${daysInMonth} days`);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 è domenica, 6 è sabato
      const isHoliday = this.isHoliday(date);
      
      const key = this.getDateKey(year, month, day);
      let calendarDay: CalendarDay;
      
      if (this.calendarData[key]) {
        calendarDay = this.calendarData[key];
      } else {
        calendarDay = {
          date,
          day,
          month,
          year,
          type: isWeekend || isHoliday ? DayType.FESTIVO : DayType.NONE,
          isWeekend,
          isHoliday
        };
        this.calendarData[key] = calendarDay;
      }
      
      days.push(calendarDay);
    }

    // Save only when explicitly requested
    if (saveData) {
      this.saveToStorage();
    }
    return days;
  }

  isHoliday(date: Date): boolean {
    return this.holidays.some(holiday => 
      holiday.getDate() === date.getDate() && 
      holiday.getMonth() === date.getMonth() && 
      holiday.getFullYear() === date.getFullYear()
    );
  }

  private getDateKey(year: number, month: number, day: number): string {
    return `${year}-${month}-${day}`;
  }

  updateDay(day: CalendarDay): void {
    try {
      const key = this.getDateKey(day.year, day.month, day.day);
      
      // Verifichiamo se il giorno esiste già nel calendario
      if (!this.calendarData[key]) {
        // Se non esiste, determiniamo se è weekend o festivo
        const date = new Date(day.year, day.month, day.day);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = this.isHoliday(date);
        
        // Creiamo una nuova entry con proprietà corrette
        this.calendarData[key] = {
          ...day,
          isWeekend,
          isHoliday
        };
      } else {
        // Se esiste, aggiorniamo mantenendo isWeekend e isHoliday
        this.calendarData[key] = { 
          ...day,
          isWeekend: this.calendarData[key].isWeekend,
          isHoliday: this.calendarData[key].isHoliday
        };
      }
      
      this.saveToStorage();
      console.log(`Day updated: ${day.year}-${day.month}-${day.day}, type: ${day.type}`);
    } catch (error) {
      console.error('Error updating day:', error);
    }
  }

  getSummary(year: number): {
    casaDays: number;
    aziendaDays: number;
    parHours: number;
    ferieHours: number;
    malattiaDays: number;
    workingDays: number;
    monthlyData: { 
      month: number, 
      casaDays: number, 
      aziendaDays: number, 
      parHours: number, 
      ferieHours: number, 
      malattiaDays: number,
      workingDays: number 
    }[];
  } {
    console.log(`Calculating summary for year ${year}`);
    try {
      const monthlyData = [];
      let totalCasaDays = 0;
      let totalAziendaDays = 0;
      let totalParHours = 0;
      let totalFerieHours = 0;
      let totalMalattiaDays = 0;
      let totalWorkingDays = 0;

    for (let month = 0; month < 12; month++) {
      // Utilizziamo generateCalendarMonth senza salvare per evitare loop infiniti
      const days = this.generateCalendarMonth(year, month, false);
      const workingDays = days.filter(day => !day.isWeekend && !day.isHoliday).length;
      
      // Giorni di CASA: come tipo principale 
      let casaDays = Object.values(this.calendarData)
        .filter(day => 
          day.year === year && 
          day.month === month && 
          day.type === DayType.CASA
        ).length;
      
      // Aggiungi giorni CASA se è tipo secondario
      casaDays += Object.values(this.calendarData)
        .filter(day => 
          day.year === year && 
          day.month === month && 
          day.secondaryType === DayType.CASA
        ).length;
      
      // Giorni di AZIENDA: come tipo principale
      let aziendaDays = Object.values(this.calendarData)
        .filter(day => 
          day.year === year && 
          day.month === month && 
          day.type === DayType.AZIENDA
        ).length;
        
      // Aggiungi giorni AZIENDA se è tipo secondario
      aziendaDays += Object.values(this.calendarData)
        .filter(day => 
          day.year === year && 
          day.month === month && 
          day.secondaryType === DayType.AZIENDA
        ).length;
      
      // Calcolo ore PAR: come tipo principale
      let parHours = Object.values(this.calendarData)
        .filter(day => day.year === year && day.month === month && day.type === DayType.PAR)
        .reduce((sum, day) => {
          // Se PAR è tipo principale
          return sum + (parseInt(String(day.hours)) || 0);
        }, 0);
      
      // Calcolo giorni MALATTIA: sempre 8 ore
      const malattiaDays = Object.values(this.calendarData)
        .filter(day => day.year === year && day.month === month && day.type === DayType.MALATTIA)
        .length;
      // Aggiungi ore PAR da giorni con PAR come tipo secondario
      parHours += Object.values(this.calendarData)
        .filter(day => day.year === year && day.month === month && day.secondaryType === DayType.PAR && day.type !== DayType.PAR)
        .reduce((sum, day) => {
          // Per PAR come secondario, contiamo le ore rimanenti (8 - ore principali)
          const primaryHours = parseInt(String(day.hours)) || 0;
          const secondaryHours = 8 - primaryHours;
          return sum + secondaryHours;
        }, 0);
      
      // Calcolo ore FERIE: come tipo principale
      let ferieHours = Object.values(this.calendarData)
        .filter(day => day.year === year && day.month === month && day.type === DayType.FERIE)
        .reduce((sum, day) => {
          // Se FERIE è tipo principale
          return sum + (parseInt(String(day.hours)) || 0);
        }, 0);
      
      // Aggiungi ore FERIE da giorni con FERIE come tipo secondario
      ferieHours += Object.values(this.calendarData)
        .filter(day => day.year === year && day.month === month && day.secondaryType === DayType.FERIE && day.type !== DayType.FERIE)
        .reduce((sum, day) => {
          // Per FERIE come secondario, contiamo le ore rimanenti (8 - ore principali)
          const primaryHours = parseInt(String(day.hours)) || 0;
          const secondaryHours = 8 - primaryHours;
          return sum + secondaryHours;
        }, 0);
      
      monthlyData.push({
        month,
        casaDays,
        aziendaDays,
        parHours,
        ferieHours,
        malattiaDays,
        workingDays
      });
      
      totalCasaDays += casaDays;
      totalAziendaDays += aziendaDays;
      totalParHours += parHours;
      totalFerieHours += ferieHours;
      totalMalattiaDays += malattiaDays;
      totalWorkingDays += workingDays;
    }

    return {
      casaDays: totalCasaDays,
      aziendaDays: totalAziendaDays,
      parHours: totalParHours,
      ferieHours: totalFerieHours,
      malattiaDays: totalMalattiaDays,
      workingDays: totalWorkingDays,
      monthlyData
    };
    } catch (error) {
      console.error('Error calculating summary:', error);
      return {
        casaDays: 0,
        aziendaDays: 0,
        parHours: 0,
        ferieHours: 0,
        malattiaDays: 0,
        workingDays: 0,
        monthlyData: []
      };
    }
  }
}
