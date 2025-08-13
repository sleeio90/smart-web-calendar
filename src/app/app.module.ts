import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { HomeComponent } from './components/home/home.component';
import { SummaryComponent } from './components/summary/summary.component';
import { CalendarService } from './services/calendar.service';
import { ExportService } from './services/export.service';

@NgModule({
  declarations: [
    AppComponent,
    CalendarComponent,
    HomeComponent,
    SummaryComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule
  ],
  providers: [
    CalendarService,
    ExportService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
