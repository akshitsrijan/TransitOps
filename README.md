# TransitOps — Smart Transport Operations Platform

TransitOps is an end-to-end transport operations platform built for a fleet-management hackathon. It digitizes vehicle, driver, dispatch, maintenance, and expense management while enforcing business rules and providing operational insights — replacing spreadsheets and manual logbooks.

## Problem

Logistics companies managing fleets via spreadsheets run into scheduling conflicts, underutilized vehicles, missed maintenance, expired driver licenses, inaccurate expense tracking, and poor visibility into operations. TransitOps centralizes the full lifecycle: vehicle registration, driver management, dispatching, maintenance, fuel logging, and analytics.

## Target Users

- **Fleet Manager** — oversees fleet assets, maintenance, vehicle lifecycle, and operational efficiency.
- **Driver** — creates trips, assigns vehicles and drivers, monitors active deliveries.
- **Safety Officer** — ensures driver compliance, tracks license validity, monitors safety scores.
- **Financial Analyst** — reviews operational expenses, fuel consumption, maintenance costs, and profitability.

## Features

### Authentication
- Email/password login
- Role-Based Access Control (RBAC)
- Authenticated access only

### Dashboard
- KPIs: Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, Fleet Utilization (%)
- Filters by vehicle type, status, and region

### Vehicle Registry
- Registration Number (unique), Model, Type, Max Load Capacity, Odometer, Acquisition Cost, Status
- Status: `Available` · `On Trip` · `In Shop` · `Retired`

### Driver Management
- Name, License Number, License Category, License Expiry, Contact, Safety Score, Status
- Status: `Available` · `On Trip` · `Off Duty` · `Suspended`

### Trip Management
- Create trips with source, destination, available vehicle, available driver, cargo weight, planned distance
- Lifecycle: `Draft` → `Dispatched` → `Completed` → `Cancelled`

### Maintenance
- Create maintenance records for vehicles
- Adding a vehicle to an active maintenance log automatically sets status to `In Shop`, removing it from dispatch selection

### Fuel & Expense Management
- Log fuel (liters, cost, date) and other expenses (tolls, maintenance, etc.)
- Auto-computes total operational cost (Fuel + Maintenance) per vehicle

### Reports & Analytics
- Fuel Efficiency (Distance / Fuel)
- Fleet Utilization
- Operational Cost
- Vehicle ROI: `(Revenue - (Maintenance + Fuel)) / Acquisition Cost`
- CSV export (PDF export optional)

## Business Rules (enforced by the system)

- Vehicle registration numbers must be unique.
- `Retired` or `In Shop` vehicles never appear in dispatch selection.
- Drivers with expired licenses or `Suspended` status cannot be assigned to trips.
- A vehicle or driver already `On Trip` cannot be assigned to another trip.
- Cargo weight must not exceed the vehicle's max load capacity.
- Dispatching a trip sets both vehicle and driver to `On Trip`.
- Completing a trip sets both vehicle and driver back to `Available`.
- Cancelling a dispatched trip restores vehicle and driver to `Available`.
- Creating an active maintenance record sets the vehicle to `In Shop`.
- Closing maintenance restores the vehicle to `Available` (unless retired).

## Data Model

Core entities: `Users`, `Roles`, `Vehicles`, `Drivers`, `Trips`, `Maintenance Logs`, `Fuel Logs`, `Expenses`

## Example Workflow

1. Register vehicle `Van-05`, max capacity 500 kg, status `Available`.
2. Register driver `Alex` with a valid license.
3. Create a trip with cargo weight = 450 kg.
4. System validates 450 kg ≤ 500 kg and allows dispatch.
5. Vehicle and driver automatically become `On Trip`.
6. Complete the trip (enter final odometer + fuel consumed).
7. Vehicle and driver automatically become `Available`.
8. Log a maintenance record (e.g., oil change) — vehicle automatically becomes `In Shop` and is hidden from dispatch.
9. Reports update operational cost and fuel efficiency based on the latest trip and fuel log.

## Deliverables

- [ ] Responsive web interface
- [ ] Authentication with RBAC
- [ ] CRUD for Vehicles and Drivers
- [ ] Trip Management with validations
- [ ] Automatic status transitions
- [ ] Maintenance workflow
- [ ] Fuel & Expense tracking
- [ ] Dashboard with KPIs

## Bonus Features

- [ ] Charts and visual analytics
- [ ] PDF export
- [ ] Email reminders for expiring licenses
- [ ] Vehicle document management
- [ ] Search, filters, and sorting
- [ ] Dark mode

## Tech Stack

_TODO: fill in once decided (e.g., React + Node/Express + PostgreSQL, or your framework of choice)._

## Getting Started

```bash
# clone the repo
git clone <your-repo-url>
cd transitops

# TODO: install dependencies
# TODO: set up environment variables
# TODO: run the app
```

## License

_TODO: add a license if needed._
