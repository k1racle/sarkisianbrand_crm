import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CustomerStatus, OrganizationStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Customer360Service } from './customer360.service';
import { AddOrganizationMemberDto, CreateOrganizationDto, UpdateCustomerDto, UpdateOrganizationDto } from './dto/customer360.dto';

@ApiTags('customer-360')
@ApiBearerAuth()
@Controller('customer-360')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR', 'EXECUTIVE')
export class Customer360Controller {
  constructor(private readonly customers: Customer360Service) {}

  @Get('dashboard') @Permissions('customers.read') dashboard() { return this.customers.dashboard(); }
  @Permissions('customers.read')
  @Get('customers') listCustomers(@Query('search') search?: string, @Query('status') status?: CustomerStatus, @Query('segment') segment?: string) { return this.customers.customers(search, status, segment); }
  @Permissions('customers.read')
  @Get('customers/:id') customer(@Param('id') id: string) { return this.customers.customer(id); }
  @Permissions('customers.write')
  @Patch('customers/:id') updateCustomer(@Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.customers.updateCustomer(id, dto); }
  @Permissions('customers.read')
  @Get('organizations') listOrganizations(@Query('search') search?: string, @Query('status') status?: OrganizationStatus) { return this.customers.organizations(search, status); }
  @Permissions('customers.write')
  @Post('organizations') createOrganization(@Body() dto: CreateOrganizationDto) { return this.customers.createOrganization(dto); }
  @Permissions('customers.read')
  @Get('organizations/:id') organization(@Param('id') id: string) { return this.customers.organization(id); }
  @Permissions('customers.write')
  @Patch('organizations/:id') updateOrganization(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) { return this.customers.updateOrganization(id, dto); }
  @Permissions('customers.write')
  @Post('organizations/:id/members') addMember(@Param('id') id: string, @Body() dto: AddOrganizationMemberDto) { return this.customers.addMember(id, dto); }
}
