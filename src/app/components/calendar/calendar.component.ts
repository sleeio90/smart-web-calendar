import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarDay, DayType } from '../../models/calendar-day';
import { CalendarService } from '../../services/calendar.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  year: number = 2025;
  month: number = 0;
  calendarDays: CalendarDay[] = [];
  weekdays: string[] = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  monthNames: string[] = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  dayTypes = DayType;
  selectedDay: CalendarDay | null = null;
  // Specificato esplicitamente che può essere qualsiasi valore dell'enum DayType
  selectedType: DayType = DayType.NONE;
  selectedHours: number = 0;
  // Specificato esplicitamente anche per secondaryType
  secondaryType: DayType = DayType.NONE;
  showSecondaryType: boolean = false;
  
  summary = {
    casaDays: 0,
    aziendaDays: 0,
    parHours: 0,
    ferieHours: 0,
    malattiaDays: 0,
    workingDays: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private calendarService: CalendarService
  ) { }

  ngOnInit(): void {
    console.log('CalendarComponent initialized');
    this.route.params.subscribe(params => {
      console.log('Route params received:', params);
      this.year = +params['year'] || 2025;
      this.month = +params['month'] || 0;
      console.log(`Loading calendar for ${this.year}-${this.month}`);
      this.loadCalendar();
    });

    this.calendarService.getCalendarUpdated().subscribe(() => {
      console.log('Calendar updated, refreshing summary');
      this.updateSummary();
    });
  }

  loadCalendar(): void {
    console.log('Loading calendar, before generateCalendarMonth call');
    try {
      // Generiamo il calendario senza salvare per evitare un loop infinito
      this.calendarDays = this.calendarService.generateCalendarMonth(this.year, this.month, false);
      console.log(`Calendar days generated: ${this.calendarDays.length} days`);
      this.updateSummary();
    } catch (error) {
      console.error('Error loading calendar:', error);
    }
  }

  updateSummary(): void {
    const monthData = this.calendarService
      .getSummary(this.year)
      .monthlyData
      .find(m => m.month === this.month);
    
    if (monthData) {
      this.summary = {
        casaDays: monthData.casaDays,
        aziendaDays: monthData.aziendaDays,
        parHours: monthData.parHours,
        ferieHours: monthData.ferieHours,
        malattiaDays: monthData.malattiaDays || 0,
        workingDays: monthData.workingDays
      };
    }
  }

  navigateToMonth(delta: number): void {
    let newMonth = this.month + delta;
    let newYear = this.year;

    if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    } else if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    }

    this.router.navigate(['/calendar', newYear, newMonth]);
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  goToSummary(): void {
    this.router.navigate(['/summary']);
  }

  selectDay(day: CalendarDay): void {
    console.log('Day selected:', day);
    if (!day || day.isWeekend || day.isHoliday) {
      console.log('Day is weekend or holiday, ignoring selection');
      return;
    }
    
    this.selectedDay = { ...day };
    this.selectedType = day.type || DayType.NONE;
    this.selectedHours = day.hours || 0;
    
    // Handle secondary type if present
    if (day.secondaryType) {
      this.secondaryType = day.secondaryType;
      this.showSecondaryType = true;
    } else {
      this.secondaryType = DayType.NONE;
      this.showSecondaryType = false;
    }
    
    console.log('Selected day set:', this.selectedDay);
  }

  updateSelectedType(type: DayType): void {
    this.selectedType = type;
    
    // Reset secondary type when changing primary type
    this.secondaryType = DayType.NONE;
    
    // Gestione specifica per MALATTIA (sempre 8 ore, nessun tipo secondario)
    if (type === DayType.MALATTIA) {
      this.selectedHours = 8;
      this.showSecondaryType = false;
    }
    // Gestione per PAR (default 4 ore)
    else if (type === DayType.PAR) {
      // Impostazione ore di default per PAR
      this.selectedHours = 4;
      this.showSecondaryType = true;
      this.secondaryType = DayType.CASA;
    }
    // Gestione per FERIE (default 8 ore)
    else if (type === DayType.FERIE) {
      // Impostazione ore di default per FERIE
      this.selectedHours = 8;
      this.showSecondaryType = false;
    }
    // Gestione per i tipi secondari
    else {
      this.showSecondaryType = false;
    }
  }
  
  updateSelectedHours(): void {
    // Show secondary type options when hours < 8
    if ((this.selectedType === DayType.PAR || this.selectedType === DayType.FERIE) && this.selectedHours < 8) {
      this.showSecondaryType = true;
      
      // If secondary type isn't already set, default to CASA
      if (this.secondaryType === DayType.NONE) {
        this.secondaryType = DayType.CASA;
      }
      // Se il tipo secondario è incompatibile (stesso tipo del primario), resettiamo
      else if (this.secondaryType === this.selectedType) {
        this.secondaryType = DayType.CASA;
      }
      // Se il tipo primario è PAR con 2 o 6 ore e il secondario è FERIE, reset a CASA
      else if (this.selectedType === DayType.PAR && (this.selectedHours === 2 || this.selectedHours === 6) && this.secondaryType === DayType.FERIE) {
        this.secondaryType = DayType.CASA;
        console.log('FERIE come tipo secondario è disponibile solo quando PAR è di 4 ore. Impostato a CASA.');
      }
    } else {
      this.showSecondaryType = false;
      this.secondaryType = DayType.NONE;
    }
  }

  updateDay(): void {
    if (!this.selectedDay) return;

    // Verifica che le ore siano impostate per PAR e FERIE
    if ((this.selectedType === DayType.PAR || this.selectedType === DayType.FERIE) && 
        (!this.selectedHours || this.selectedHours <= 0)) {
      alert('Per i tipi PAR e FERIE è obbligatorio inserire le ore!');
      return;
    }

    let updatedDay: CalendarDay;
    
    // Case for mixed day type: PAR or FERIE with less than 8 hours and a secondary type
    if ((this.selectedType === DayType.PAR || this.selectedType === DayType.FERIE) && 
        this.selectedHours < 8 && 
        this.showSecondaryType) {
      
      // Se entrambi i tipi sono PAR o FERIE, manteniamo il principale come quello scelto
      // e impostiamo le ore come quelle specificate
      if ((this.secondaryType === DayType.PAR || this.secondaryType === DayType.FERIE) &&
          this.selectedType !== this.secondaryType) {
          
        updatedDay = {
          ...this.selectedDay,
          type: this.selectedType,
          secondaryType: this.secondaryType,
          hours: this.selectedHours
        };
      } else {
        // Caso standard (CASA o AZIENDA come secondario)
        // Determine primary type based on configuration (CASA gets priority for counting)
        const primaryType = this.secondaryType;
        
        updatedDay = {
          ...this.selectedDay,
          type: primaryType,
          secondaryType: this.selectedType,
          hours: this.selectedHours
        };
      }
    } else {
      // Standard day type with single type
      updatedDay = {
        ...this.selectedDay,
        type: this.selectedType,
        secondaryType: undefined,
        hours: (this.selectedType === DayType.PAR || this.selectedType === DayType.FERIE || this.selectedType === DayType.MALATTIA) 
          ? Number(this.selectedHours) 
          : undefined
      };
    }

    this.calendarService.updateDay(updatedDay);
    this.selectedDay = null;
    this.loadCalendar();
  }

  cancelEdit(): void {
    this.selectedDay = null;
  }

  getDayClass(day: CalendarDay): any {
    // Handle mixed day types with special classes
    if (day.type && day.secondaryType) {
      if (day.type === DayType.CASA && day.secondaryType === DayType.PAR) {
        return { 'casa-mixed': true };
      } else if (day.type === DayType.AZIENDA && day.secondaryType === DayType.PAR) {
        return { 'azienda-mixed': true };
      } else if (day.type === DayType.CASA && day.secondaryType === DayType.FERIE) {
        return { 'casa-ferie-mixed': true };
      } else if (day.type === DayType.AZIENDA && day.secondaryType === DayType.FERIE) {
        return { 'azienda-ferie-mixed': true };
      } else if (day.type === DayType.PAR && day.secondaryType === DayType.FERIE) {
        return { 'par-ferie-mixed': true };
      } else if (day.type === DayType.FERIE && day.secondaryType === DayType.PAR) {
        return { 'ferie-par-mixed': true };
      }
    }

    // Standard day types
    return {
      'weekend': day.isWeekend,
      'holiday': day.isHoliday,
      'casa': day.type === DayType.CASA && !day.secondaryType,
      'azienda': day.type === DayType.AZIENDA && !day.secondaryType,
      'par': day.type === DayType.PAR && !day.secondaryType,
      'ferie': day.type === DayType.FERIE && !day.secondaryType,
      'malattia': day.type === DayType.MALATTIA
    };
  }
  
  getSpacersArray(): Array<number> {
    if (!this.calendarDays || this.calendarDays.length === 0) {
      return [];
    }
    
    const firstDay = this.calendarDays[0];
    if (!firstDay || !firstDay.date) {
      return [];
    }
    
    const dayOfWeek = firstDay.date.getDay();
    const spacersCount = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0 is Sunday, we need Monday as first day
    
    return Array(spacersCount).fill(0);
  }

  updateSecondaryType(type: DayType): void {
    // Se il tipo secondario è lo stesso del principale, reset a CASA
    if (this.selectedType === type) {
      this.secondaryType = DayType.CASA;
      console.log('Non puoi selezionare lo stesso tipo come secondario. Impostato a CASA.');
      return;
    }
    
    // Imposta il tipo secondario
    this.secondaryType = type;
    
    // Log per PAR/FERIE
    if (type === DayType.PAR || type === DayType.FERIE) {
      console.log(`Tipo secondario impostato a ${type} con ${8 - this.selectedHours} ore`);
    } else {
      console.log(`Tipo secondario impostato a ${type}`);
    }
  }

  // Metodo per verificare se il tipo primario corrisponde a quello specificato
  // Utilizziamo questo metodo per evitare errori di tipo in TypeScript
  isSelectedType(type: DayType): boolean {
    return this.selectedType === type;
  }
}
