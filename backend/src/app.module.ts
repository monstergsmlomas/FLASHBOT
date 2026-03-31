import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { CustomersModule } from './customers/customers.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { TemplatesModule } from './templates/templates.module';
import { ServicesModule } from './services/services.module';
import { EmployeesModule } from './employees/employees.module';
import { SalesModule } from './sales/sales.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    TenantsModule,
    AppointmentsModule,
    CustomersModule,
    WhatsappModule,
    TemplatesModule,
    ServicesModule,
    EmployeesModule,
    SalesModule,
    OrdersModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
