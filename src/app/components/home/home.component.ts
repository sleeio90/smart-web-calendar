import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CalendarService } from '../../services/calendar.service';
import { DayType, CalendarDay } from '../../models/calendar-day';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  year = 2025;
  months = [
    { id: 0, name: 'Gennaio' },
    { id: 1, name: 'Febbraio' },
    { id: 2, name: 'Marzo' },
    { id: 3, name: 'Aprile' },
    { id: 4, name: 'Maggio' },
    { id: 5, name: 'Giugno' },
    { id: 6, name: 'Luglio' },
    { id: 7, name: 'Agosto' },
    { id: 8, name: 'Settembre' },
    { id: 9, name: 'Ottobre' },
    { id: 10, name: 'Novembre' },
    { id: 11, name: 'Dicembre' }
  ];

  // Proprietà per il modale di aggiunta date
  showDateModal = false;
  selectionMode: 'single' | 'range' = 'single';
  selectedDate: string = '';
  startDate: string = '';
  endDate: string = '';
  // Specificato esplicitamente che può essere qualsiasi valore dell'enum DayType
  selectedType: DayType = DayType.CASA;
  selectedHours: number = 8;
  // Specificato esplicitamente anche per secondaryType
  secondaryType: DayType = DayType.NONE;  // Tipo secondario per completare la giornata
  showSecondaryType: boolean = false;     // Flag per mostrare l'opzione del tipo secondario
  warningMessage: string = '';
  dayTypes = DayType;

  constructor(
    private router: Router,
    private calendarService: CalendarService
  ) { }

  ngOnInit(): void {
    // Pre-genera i dati del calendario per tutti i mesi del 2025
    this.months.forEach((month, index) => {
      const isLast = index === this.months.length - 1;
      // Salva i dati solo dopo l'ultimo mese per ridurre le operazioni di I/O
      this.calendarService.generateCalendarMonth(this.year, month.id, isLast);
    });
  }

  navigateToMonth(monthId: number): void {
    console.log(`Navigating to month: ${this.year}-${monthId}`);
    this.router.navigate(['/calendar', this.year, monthId])
      .then(success => {
        console.log(`Navigation result: ${success}`);
      })
      .catch(error => {
        console.error('Navigation error:', error);
      });
  }

  navigateToSummary(): void {
    this.router.navigate(['/summary']);
  }

  // Metodi per la gestione del modale di aggiunta date
  openAddDateModal(): void {
    const today = new Date();
    const dateToUse = new Date(2025, today.getMonth(), today.getDate());
    
    this.showDateModal = true;
    this.selectedDate = this.formatDateForInput(dateToUse);
    this.startDate = this.formatDateForInput(dateToUse);
    this.endDate = this.formatDateForInput(new Date(dateToUse.getTime() + 7 * 24 * 60 * 60 * 1000)); // +7 giorni
    this.selectedType = DayType.CASA;
    this.selectedHours = 8;
    this.warningMessage = '';
  }

  closeDateModal(): void {
    this.showDateModal = false;
  }

  formatDateForInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Aggiorna le ore in base al tipo selezionato
  updateSelectedType(type: DayType): void {
    this.selectedType = type;
    
    // Imposta le ore predefinite appropriate per il tipo selezionato
    if (type === DayType.PAR) {
      this.selectedHours = 4; // Default per PAR è 4 ore
      this.showSecondaryType = true; // Per PAR mostra opzione secondaria
      this.secondaryType = DayType.CASA; // Default secondario è CASA
    } else if (type === DayType.FERIE) {
      this.selectedHours = 8; // Default per FERIE è 8 ore
      this.showSecondaryType = false; // 8 ore di ferie occupano l'intera giornata
      this.secondaryType = DayType.NONE; // Resetta il tipo secondario
    } else if (type === DayType.MALATTIA) {
      this.selectedHours = 8; // MALATTIA è sempre 8 ore
      this.showSecondaryType = false; // Nessun tipo secondario per MALATTIA
      this.secondaryType = DayType.NONE;
    } else {
      // Per CASA o AZIENDA, nascondi l'opzione secondaria
      this.showSecondaryType = false;
      this.secondaryType = DayType.NONE;
    }
  }
  
  // Gestisce il cambio di ore per PAR o FERIE
  updateSelectedHours(hours: number): void {
    this.selectedHours = hours;
    
    // Se le ore sono < 8, mostra l'opzione per il tipo secondario
    if ((this.selectedType === DayType.PAR || this.selectedType === DayType.FERIE) && hours < 8) {
      this.showSecondaryType = true;
      
      // Se non era già impostato, imposta un tipo secondario predefinito
      if (this.secondaryType === DayType.NONE) {
        this.secondaryType = DayType.CASA;
      }
      // Se il tipo secondario è lo stesso del primario, reset a CASA
      else if (this.secondaryType === this.selectedType) {
        this.secondaryType = DayType.CASA;
      }
      // Se il tipo primario è PAR con 2 o 6 ore e il secondario è FERIE, reset a CASA
      else if (this.selectedType === DayType.PAR && (hours === 2 || hours === 6) && this.secondaryType === DayType.FERIE) {
        this.secondaryType = DayType.CASA;
        console.log('FERIE come tipo secondario è disponibile solo quando PAR è di 4 ore. Impostato a CASA.');
      }
    } else {
      this.showSecondaryType = false;
      this.secondaryType = DayType.NONE;
    }
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

  isFormValid(): boolean {
    // Valida la selezione della data
    if (this.selectionMode === 'single' && !this.selectedDate) {
      this.warningMessage = 'Seleziona una data';
      return false;
    }

    if (this.selectionMode === 'range' && (!this.startDate || !this.endDate)) {
      this.warningMessage = 'Seleziona date di inizio e fine';
      return false;
    }

    // Valida l'intervallo di date
    if (this.selectionMode === 'range') {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      if (start > end) {
        this.warningMessage = 'La data di inizio deve essere precedente alla data di fine';
        return false;
      }
    }

    // Verifica che le ore siano state selezionate per PAR e FERIE
    if ((this.selectedType === DayType.PAR || this.selectedType === DayType.FERIE) && 
        (!this.selectedHours || this.selectedHours <= 0)) {
      this.warningMessage = 'Per i tipi PAR e FERIE è obbligatorio inserire le ore';
      return false;
    }

    this.warningMessage = '';
    return true;
  }

  applyToSelectedDates(): void {
    if (!this.isFormValid()) {
      return;
    }

    const dates: Date[] = [];

    if (this.selectionMode === 'single') {
      dates.push(new Date(this.selectedDate));
    } else {
      // Calcola tutte le date nell'intervallo
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      const current = new Date(start);

      while (current <= end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    }      // Filtra date valide (esclusi weekend e festivi)
    const validDates = dates.filter(date => {
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isHoliday = this.calendarService.isHoliday(date);
      return !isWeekend && !isHoliday;
    });

    if (validDates.length === 0) {
      this.warningMessage = 'Nessuna data valida selezionata (esclusi weekend e festivi)';
      return;
    }

    // Applica il tipo selezionato a tutte le date valide
    for (const date of validDates) {
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();

      // Crea il giorno del calendario con il tipo selezionato
      let calendarDay: CalendarDay;
      
      // Se sono PAR o FERIE con meno di 8 ore e c'è un tipo secondario
      if ((this.selectedType === DayType.PAR || this.selectedType === DayType.FERIE) && 
          this.selectedHours < 8 && 
          this.secondaryType !== DayType.NONE) {
        
        // Se entrambi i tipi sono PAR o FERIE, manteniamo il principale come quello scelto
        // e impostiamo le ore come quelle specificate
        if ((this.secondaryType === DayType.PAR || this.secondaryType === DayType.FERIE) &&
            this.selectedType !== this.secondaryType) {
            
          calendarDay = {
            date,
            day,
            month,
            year,
            type: this.selectedType,     // Il tipo principale rimane quello scelto (PAR o FERIE)
            secondaryType: this.secondaryType, // Il tipo secondario è l'altro PAR o FERIE
            hours: this.selectedHours,   // Ore specificate per il tipo principale
            isWeekend: false,
            isHoliday: false
          };
        } else {
          // Caso standard: tipo secondario è CASA o AZIENDA
          // Determina il tipo principale per la giornata
          // Priorità a CASA per il conteggio dei giorni di smart working
          const primaryType = this.secondaryType === DayType.CASA ? DayType.CASA : this.secondaryType;
          
          calendarDay = {
            date,
            day,
            month,
            year,
            type: primaryType,        // Il tipo principale sarà CASA o AZIENDA
            secondaryType: this.selectedType, // Salviamo PAR o FERIE come tipo secondario
            hours: this.selectedHours,  // Ore di PAR o FERIE
            isWeekend: false,
            isHoliday: false
          };
        }
      } else {
        // Caso normale, un solo tipo per la giornata
        calendarDay = {
          date,
          day,
          month,
          year,
          type: this.selectedType,
          hours: (this.selectedType === DayType.PAR || this.selectedType === DayType.FERIE) 
            ? this.selectedHours 
            : undefined,
          isWeekend: false,
          isHoliday: false
        };
      }

      // Aggiorna il giorno nel servizio
      this.calendarService.updateDay(calendarDay);
    }

    // Chiudi il modale dopo aver applicato le modifiche
    this.closeDateModal();

    // Costruisci un messaggio di conferma più dettagliato
    let tipologia = '';
    
    // Caso combinato: PAR o FERIE con un tipo secondario
    if ((this.selectedType === DayType.PAR || this.selectedType === DayType.FERIE) && 
        this.selectedHours < 8 && 
        this.secondaryType !== DayType.NONE) {
      
      const tipoOre = this.selectedType === DayType.PAR ? 'PAR' : 'FERIE';
      let tipoAltro = '';
      
      // Se il secondario è PAR o FERIE
      if (this.secondaryType === DayType.PAR || this.secondaryType === DayType.FERIE) {
        tipoAltro = this.secondaryType === DayType.PAR ? 'PAR' : 'FERIE';
        tipologia = `${tipoOre} (${this.selectedHours} ore) + ${tipoAltro} (${8 - this.selectedHours} ore)`;
      } else {
        // Caso CASA o AZIENDA come secondario
        tipoAltro = this.secondaryType === DayType.CASA ? 'CASA' : 'AZIENDA';
        tipologia = `${tipoOre} (${this.selectedHours} ore) + ${tipoAltro} (${8 - this.selectedHours} ore)`;
      }
    } else {
      // Caso standard, tipo singolo
      tipologia = this.selectedType === DayType.CASA ? 'CASA' : 
                  this.selectedType === DayType.AZIENDA ? 'AZIENDA' : 
                  this.selectedType === DayType.PAR ? `PAR (${this.selectedHours} ore)` : 
                  `FERIE (${this.selectedHours} ore)`;
    }
    
    // Formatta le date in modo leggibile
    const formatDate = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    
    let dateInfo = '';
    if (validDates.length === 1) {
      dateInfo = formatDate(validDates[0]);
    } else {
      dateInfo = `dal ${formatDate(validDates[0])} al ${formatDate(validDates[validDates.length - 1])}`;
    }
    
    // Messaggio di conferma
    alert(`Modifiche applicate a ${validDates.length} giorni (${dateInfo}) con tipologia: ${tipologia}`);
  }

  // Metodo per verificare se il tipo primario corrisponde a quello specificato
  // Utilizziamo questo metodo per evitare errori di tipo in TypeScript
  isSelectedType(type: DayType): boolean {
    return this.selectedType === type;
  }
}
