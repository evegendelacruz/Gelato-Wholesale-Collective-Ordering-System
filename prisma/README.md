# Prisma Setup for Momolato Ordering System

This directory contains the Prisma schema for the Momolato Ordering System database.

## Installation

1. **Install Prisma dependencies:**

```bash
npm install prisma @prisma/client
```

2. **Configure the database connection:**

Copy the example environment file and update with your Supabase credentials:

```bash
cp prisma/.env.example .env
```

Then edit `.env` and replace `[YOUR-PASSWORD]` with your Supabase database password.

To find your connection string:
- Go to Supabase Dashboard → Settings → Database
- Copy the connection string from "Connection string" section
- Replace the password placeholder with your actual database password

3. **Generate Prisma Client:**

```bash
npx prisma generate
```

## Database Commands

### Introspect existing database
If you already have tables in Supabase and want to update the schema:

```bash
npx prisma db pull
```

### Push schema changes to database
To sync your Prisma schema with the database (development only):

```bash
npx prisma db push
```

### Create and run migrations (production)
For production deployments with proper migration tracking:

```bash
npx prisma migrate dev --name init
```

### Open Prisma Studio
Visual database editor:

```bash
npx prisma studio
```

## Usage in Code

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Example: Fetch all products
const products = await prisma.productList.findMany()

// Example: Create a client order
const order = await prisma.clientOrder.create({
  data: {
    order_id: 'ORD-00001',
    client_auth_id: 'user-uuid',
    order_date: '2024-01-15',
    delivery_date: '2024-01-17',
    total_amount: 150.00,
    status: 'Pending',
    items: {
      create: [
        {
          product_id: 1,
          product_name: 'Vanilla Gelato',
          quantity: 5,
          unit_price: 30.00,
          subtotal: 150.00
        }
      ]
    }
  },
  include: {
    items: true
  }
})
```

## Schema Overview

### User Management
- `AdminUser` - Admin/staff accounts
- `ClientUser` - Business client accounts

### Products
- `ProductList` - Product catalog
- `ClientProduct` - Client-specific product availability and pricing
- `DropdownOptions` - Product type options for regular orders
- `OrderDropdownOptions` - Product type options for online orders

### Orders
- `ClientBasket` - Shopping cart items
- `ClientOrder` - Orders from registered clients
- `ClientOrderItem` - Line items for client orders
- `CustomerOrder` - Orders from walk-in/online customers
- `CustomerOrderItem` - Line items for customer orders

### Statements & Reports
- `ClientStatement` - Monthly billing statements
- `DeliveryReport` - Aggregated delivery reports

### Configuration
- `HeaderOption` - Print header templates
- `FooterOption` - Print footer templates

## Note on Existing Supabase Setup

This project currently uses Supabase client directly. Prisma can be used alongside or as a replacement for direct Supabase queries. Both approaches are valid:

- **Supabase Client**: Real-time subscriptions, Row Level Security (RLS), Auth integration
- **Prisma**: Type-safe queries, migrations, better IDE support, relations handling

You can use both in the same project based on your needs.
