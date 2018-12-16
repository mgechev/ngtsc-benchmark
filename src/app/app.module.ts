import { ModuleWithProviders, NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { AuthModule } from './auth/auth.module';
import { HomeModule } from './home/home.module';
import {
  FooterComponent,
  HeaderComponent,
  SharedModule
} from './shared';
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';

@NgModule({
  declarations: [AppComponent, FooterComponent, HeaderComponent],
  imports: [
    CoreModule,
    SharedModule,
    HomeModule,
    AuthModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
