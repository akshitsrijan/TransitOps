import type { Driver, Expense, FuelLog, MaintenanceLog, Trip, User, Vehicle } from '../types'

export const seedUsers: User[] = [
  { id: 'u1', name: 'Maria Chen', email: 'manager@transitops.com', password: 'password123', role: 'Fleet Manager' },
  { id: 'u2', name: 'Alex Rivera', email: 'driver@transitops.com', password: 'password123', role: 'Driver' },
  { id: 'u3', name: 'Sam Okafor', email: 'safety@transitops.com', password: 'password123', role: 'Safety Officer' },
  { id: 'u4', name: 'Priya Nair', email: 'finance@transitops.com', password: 'password123', role: 'Financial Analyst' },
]

export const seedVehicles: Vehicle[] = [
  { id: 'v1', registrationNumber: 'VAN-05', model: 'Ford Transit', type: 'Van', maxLoadCapacityKg: 500, odometerKm: 42150, acquisitionCost: 38000, status: 'Available', region: 'North' },
  { id: 'v2', registrationNumber: 'TRK-12', model: 'Isuzu NPR', type: 'Truck', maxLoadCapacityKg: 3500, odometerKm: 88320, acquisitionCost: 62000, status: 'On Trip', region: 'South' },
  { id: 'v3', registrationNumber: 'VAN-08', model: 'Mercedes Sprinter', type: 'Van', maxLoadCapacityKg: 800, odometerKm: 15200, acquisitionCost: 45000, status: 'In Shop', region: 'East' },
  { id: 'v4', registrationNumber: 'TRK-03', model: 'Volvo FL', type: 'Truck', maxLoadCapacityKg: 5000, odometerKm: 121000, acquisitionCost: 89000, status: 'Retired', region: 'West' },
  { id: 'v5', registrationNumber: 'VAN-11', model: 'Ford Transit', type: 'Van', maxLoadCapacityKg: 500, odometerKm: 9800, acquisitionCost: 39500, status: 'Available', region: 'North' },
  { id: 'v6', registrationNumber: 'TRK-19', model: 'Isuzu NPR', type: 'Truck', maxLoadCapacityKg: 3500, odometerKm: 55400, acquisitionCost: 63000, status: 'On Trip', region: 'South' },
  { id: 'v7', registrationNumber: 'CAR-02', model: 'Toyota Corolla', type: 'Car', maxLoadCapacityKg: 150, odometerKm: 31000, acquisitionCost: 21000, status: 'Available', region: 'East' },
]

export const seedDrivers: Driver[] = [
  { id: 'd1', name: 'Alex Rivera', licenseNumber: 'LIC-10023', licenseCategory: 'C', licenseExpiry: '2027-03-15', contact: '555-0101', safetyScore: 92, status: 'Available' },
  { id: 'd2', name: 'Jordan Blake', licenseNumber: 'LIC-10078', licenseCategory: 'C+E', licenseExpiry: '2026-11-02', contact: '555-0102', safetyScore: 87, status: 'On Trip' },
  { id: 'd3', name: 'Taylor Reed', licenseNumber: 'LIC-10099', licenseCategory: 'B', licenseExpiry: '2026-01-20', contact: '555-0103', safetyScore: 78, status: 'Off Duty' },
  { id: 'd4', name: 'Morgan Diaz', licenseNumber: 'LIC-10112', licenseCategory: 'C', licenseExpiry: '2025-09-01', contact: '555-0104', safetyScore: 65, status: 'Suspended' },
  { id: 'd5', name: 'Casey Kim', licenseNumber: 'LIC-10145', licenseCategory: 'C+E', licenseExpiry: '2027-06-30', contact: '555-0105', safetyScore: 95, status: 'On Trip' },
  { id: 'd6', name: 'Riley Santos', licenseNumber: 'LIC-10201', licenseCategory: 'B', licenseExpiry: '2026-08-14', contact: '555-0106', safetyScore: 89, status: 'Available' },
]

export const seedTrips: Trip[] = [
  { id: 't1', source: 'Warehouse A', destination: 'Downtown Depot', vehicleId: 'v2', driverId: 'd2', cargoWeightKg: 2800, plannedDistanceKm: 65, status: 'Dispatched', createdAt: '2026-07-10T08:00:00Z', dispatchedAt: '2026-07-10T08:15:00Z' },
  { id: 't2', source: 'Port Terminal', destination: 'North Storage', vehicleId: 'v6', driverId: 'd5', cargoWeightKg: 3100, plannedDistanceKm: 40, status: 'Dispatched', createdAt: '2026-07-11T06:30:00Z', dispatchedAt: '2026-07-11T07:00:00Z' },
  { id: 't3', source: 'Warehouse B', destination: 'Retail Center', vehicleId: 'v1', driverId: 'd1', cargoWeightKg: 420, plannedDistanceKm: 22, actualDistanceKm: 23.5, fuelConsumedLiters: 6.1, status: 'Completed', createdAt: '2026-07-08T09:00:00Z', dispatchedAt: '2026-07-08T09:20:00Z', completedAt: '2026-07-08T11:05:00Z' },
  { id: 't4', source: 'Depot 5', destination: 'Customer Site', vehicleId: 'v5', driverId: 'd6', cargoWeightKg: 300, plannedDistanceKm: 18, status: 'Draft', createdAt: '2026-07-12T07:00:00Z' },
]

export const seedMaintenanceLogs: MaintenanceLog[] = [
  { id: 'm1', vehicleId: 'v3', description: 'Brake pad replacement', cost: 420, openedAt: '2026-07-09T10:00:00Z', status: 'Active' },
  { id: 'm2', vehicleId: 'v1', description: 'Oil change', cost: 90, openedAt: '2026-06-15T10:00:00Z', closedAt: '2026-06-15T14:00:00Z', status: 'Closed' },
]

export const seedFuelLogs: FuelLog[] = [
  { id: 'f1', vehicleId: 'v1', liters: 40, cost: 62, date: '2026-07-05' },
  { id: 'f2', vehicleId: 'v2', liters: 120, cost: 186, date: '2026-07-08' },
  { id: 'f3', vehicleId: 'v6', liters: 95, cost: 148, date: '2026-07-09' },
  { id: 'f4', vehicleId: 'v1', liters: 38, cost: 59, date: '2026-06-20' },
]

export const seedExpenses: Expense[] = [
  { id: 'e1', vehicleId: 'v2', category: 'Toll', amount: 45, date: '2026-07-08', notes: 'Highway toll' },
  { id: 'e2', vehicleId: 'v1', category: 'Insurance', amount: 220, date: '2026-07-01' },
  { id: 'e3', vehicleId: 'v3', category: 'Maintenance', amount: 420, date: '2026-07-09', notes: 'Brake pad replacement' },
]
