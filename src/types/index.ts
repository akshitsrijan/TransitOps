export type Role = 'Fleet Manager' | 'Driver' | 'Safety Officer' | 'Financial Analyst'

export interface User {
  id: string
  name: string
  email: string
  password: string
  role: Role
}

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired'

export interface Vehicle {
  id: string
  registrationNumber: string
  model: string
  type: string
  maxLoadCapacityKg: number
  odometerKm: number
  acquisitionCost: number
  status: VehicleStatus
  region: string
}

export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended'

export interface Driver {
  id: string
  name: string
  licenseNumber: string
  licenseCategory: string
  licenseExpiry: string // ISO date
  contact: string
  safetyScore: number
  status: DriverStatus
}

export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled'

export interface Trip {
  id: string
  source: string
  destination: string
  vehicleId: string
  driverId: string
  cargoWeightKg: number
  plannedDistanceKm: number
  actualDistanceKm?: number
  fuelConsumedLiters?: number
  status: TripStatus
  createdAt: string
  dispatchedAt?: string
  completedAt?: string
  cancelledAt?: string
}

export type MaintenanceStatus = 'Active' | 'Closed'

export interface MaintenanceLog {
  id: string
  vehicleId: string
  description: string
  cost: number
  openedAt: string
  closedAt?: string
  status: MaintenanceStatus
}

export interface FuelLog {
  id: string
  vehicleId: string
  liters: number
  cost: number
  date: string
}

export type ExpenseCategory = 'Toll' | 'Maintenance' | 'Insurance' | 'Fine' | 'Other'

export interface Expense {
  id: string
  vehicleId: string
  category: ExpenseCategory
  amount: number
  date: string
  notes?: string
}
