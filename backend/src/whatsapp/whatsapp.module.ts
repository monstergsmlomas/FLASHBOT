import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { ConversationService } from './conversation.service';
import { PrismaService } from '../prisma.service';
import { AppointmentsModule } from '../appointments/appointments.module';
import { CustomersModule } from '../customers/customers.module';
import { TenantsModule } from '../tenants/tenants.module';
import { ServicesModule } from '../services/services.module';
import { EmployeesModule } from '../employees/employees.module';
import { OrdersModule } from '../orders/orders.module';
import { SparePartsModule } from '../spare-parts/spare-parts.module';
import { RepairsModule } from '../repairs/repairs.module';

@Module({
  imports: [
    AppointmentsModule,
    CustomersModule,
    TenantsModule,
    ServicesModule,
    EmployeesModule,
    OrdersModule,
    SparePartsModule,
    RepairsModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, ConversationService, PrismaService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
