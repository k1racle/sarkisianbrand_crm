import { Body, Controller, Get, Header, Param, ParseEnumPipe, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CustomerStatus, OrganizationStatus } from '@prisma/client';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Customer360Service } from './customer360.service';
import { AddOrganizationMemberDto, CreateCustomerDto, CreateOrganizationDto, UpdateCustomerDto, UpdateOrganizationDto } from './dto/customer360.dto';

@ApiTags('customer-360')
@ApiBearerAuth()
@Controller('customer-360')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER_B2B', 'MANAGER_SALES', 'SUPERVISOR', 'EXECUTIVE')
export class Customer360Controller {
  constructor(private readonly customers: Customer360Service) {}

  @Get('dashboard') @Header('Cache-Control', 'private, no-store') @Permissions('customers.read') dashboard(@Req() req: any) { return this.customers.dashboard(req.user.sub); }
  @Get('team') @Header('Cache-Control', 'private, no-store') @Permissions('customers.read') team(@Req() req: any) { return this.customers.team(req.user.sub); }
  @Permissions('customers.read')
  @Get('customers') @Header('Cache-Control', 'private, no-store') listCustomers(@Req() req: any, @Query('search') search?: string, @Query('status', new ParseEnumPipe(CustomerStatus, { optional: true })) status?: CustomerStatus, @Query('segment') segment?: string) { return this.customers.customers(req.user.sub, search, status, segment); }
  @Permissions('customers.write')
  @Post('customers') createCustomer(@Body() dto: CreateCustomerDto, @Req() req: any) { return this.customers.createCustomer(req.user.sub, dto); }
  @Permissions('customers.read')
  @Get('customers/:id') @Header('Cache-Control', 'private, no-store') customer(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) { return this.customers.customer(req.user.sub, id); }
  @Permissions('customers.write')
  @Patch('customers/:id') updateCustomer(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomerDto, @Req() req: any) { return this.customers.updateCustomer(req.user.sub, id, dto); }
  @Permissions('customers.read')
  @Get('organizations') @Header('Cache-Control', 'private, no-store') listOrganizations(@Req() req: any, @Query('search') search?: string, @Query('status', new ParseEnumPipe(OrganizationStatus, { optional: true })) status?: OrganizationStatus) { return this.customers.organizations(req.user.sub, search, status); }
  @Permissions('customers.write')
  @Post('organizations') createOrganization(@Body() dto: CreateOrganizationDto, @Req() req: any) { return this.customers.createOrganization(req.user.sub, dto); }
  @Permissions('customers.read')
  @Get('organizations/:id') @Header('Cache-Control', 'private, no-store') organization(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) { return this.customers.organization(req.user.sub, id); }
  @Permissions('customers.write')
  @Patch('organizations/:id') updateOrganization(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrganizationDto, @Req() req: any) { return this.customers.updateOrganization(req.user.sub, id, dto); }
  @Permissions('customers.write')
  @Post('organizations/:id/members') addMember(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddOrganizationMemberDto, @Req() req: any) { return this.customers.addMember(req.user.sub, id, dto); }
}
