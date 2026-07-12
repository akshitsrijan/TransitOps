import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type {
  Driver,
  Expense,
  FuelLog,
  MaintenanceLog,
  Trip,
  Vehicle,
} from '../types'
import {
  seedDrivers,
  seedExpenses,
  seedFuelLogs,
  seedMaintenanceLogs,
  seedTrips,
  seedVehicles,
} from '../data/seed'
import { loadFromStorage, nextId, saveToStorage } from '../lib/storage'
import { fail, ok, type Result } from '../lib/validation'

const KEYS = {
  vehicles: 'transitops.vehicles',
  drivers: 'transitops.drivers',
  trips: 'transitops.trips',
  maintenance: 'transitops.maintenance',
  fuel: 'transitops.fuel',
  expenses: 'transitops.expenses',
}

// Assumed revenue rate used only to compute the Vehicle ROI metric in Reports,
// since the data model has no revenue/billing entity.
export const ASSUMED_REVENUE_PER_KM = 2.5

interface DataContextValue {
  vehicles: Vehicle[]
  drivers: Driver[]
  trips: Trip[]
  maintenanceLogs: MaintenanceLog[]
  fuelLogs: FuelLog[]
  expenses: Expense[]

  addVehicle: (v: Omit<Vehicle, 'id'>) => Result
  updateVehicle: (id: string, v: Omit<Vehicle, 'id'>) => Result
  deleteVehicle: (id: string) => Result

  addDriver: (d: Omit<Driver, 'id'>) => Result
  updateDriver: (id: string, d: Omit<Driver, 'id'>) => Result
  deleteDriver: (id: string) => Result

  createTrip: (t: Pick<Trip, 'source' | 'destination' | 'vehicleId' | 'driverId' | 'cargoWeightKg' | 'plannedDistanceKm'>) => Result
  dispatchTrip: (id: string) => Result
  completeTrip: (id: string, actualDistanceKm: number, fuelConsumedLiters: number) => Result
  cancelTrip: (id: string) => Result

  addMaintenanceLog: (m: Pick<MaintenanceLog, 'vehicleId' | 'description' | 'cost'>) => Result
  closeMaintenanceLog: (id: string) => Result

  addFuelLog: (f: Omit<FuelLog, 'id'>) => Result
  addExpense: (e: Omit<Expense, 'id'>) => Result

  dispatchableVehicles: Vehicle[]
  assignableDrivers: Driver[]
}

const DataContext = createContext<DataContextValue | null>(null)

function isLicenseExpired(driver: Driver) {
  return new Date(driver.licenseExpiry).getTime() < Date.now()
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => loadFromStorage(KEYS.vehicles, seedVehicles))
  const [drivers, setDrivers] = useState<Driver[]>(() => loadFromStorage(KEYS.drivers, seedDrivers))
  const [trips, setTrips] = useState<Trip[]>(() => loadFromStorage(KEYS.trips, seedTrips))
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>(() =>
    loadFromStorage(KEYS.maintenance, seedMaintenanceLogs),
  )
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>(() => loadFromStorage(KEYS.fuel, seedFuelLogs))
  const [expenses, setExpenses] = useState<Expense[]>(() => loadFromStorage(KEYS.expenses, seedExpenses))

  useEffect(() => saveToStorage(KEYS.vehicles, vehicles), [vehicles])
  useEffect(() => saveToStorage(KEYS.drivers, drivers), [drivers])
  useEffect(() => saveToStorage(KEYS.trips, trips), [trips])
  useEffect(() => saveToStorage(KEYS.maintenance, maintenanceLogs), [maintenanceLogs])
  useEffect(() => saveToStorage(KEYS.fuel, fuelLogs), [fuelLogs])
  useEffect(() => saveToStorage(KEYS.expenses, expenses), [expenses])

  // ---------- Vehicles ----------
  function addVehicle(v: Omit<Vehicle, 'id'>): Result {
    if (vehicles.some((x) => x.registrationNumber.toLowerCase() === v.registrationNumber.toLowerCase())) {
      return fail(`Registration number "${v.registrationNumber}" is already in use.`)
    }
    setVehicles((prev) => [...prev, { ...v, id: nextId('v') }])
    return ok
  }

  function updateVehicle(id: string, v: Omit<Vehicle, 'id'>): Result {
    if (
      vehicles.some((x) => x.id !== id && x.registrationNumber.toLowerCase() === v.registrationNumber.toLowerCase())
    ) {
      return fail(`Registration number "${v.registrationNumber}" is already in use.`)
    }
    setVehicles((prev) => prev.map((x) => (x.id === id ? { ...v, id } : x)))
    return ok
  }

  function deleteVehicle(id: string): Result {
    if (trips.some((t) => t.vehicleId === id && (t.status === 'Draft' || t.status === 'Dispatched'))) {
      return fail('Cannot delete a vehicle with active or draft trips.')
    }
    setVehicles((prev) => prev.filter((x) => x.id !== id))
    return ok
  }

  // ---------- Drivers ----------
  function addDriver(d: Omit<Driver, 'id'>): Result {
    if (drivers.some((x) => x.licenseNumber.toLowerCase() === d.licenseNumber.toLowerCase())) {
      return fail(`License number "${d.licenseNumber}" is already in use.`)
    }
    setDrivers((prev) => [...prev, { ...d, id: nextId('d') }])
    return ok
  }

  function updateDriver(id: string, d: Omit<Driver, 'id'>): Result {
    if (drivers.some((x) => x.id !== id && x.licenseNumber.toLowerCase() === d.licenseNumber.toLowerCase())) {
      return fail(`License number "${d.licenseNumber}" is already in use.`)
    }
    setDrivers((prev) => prev.map((x) => (x.id === id ? { ...d, id } : x)))
    return ok
  }

  function deleteDriver(id: string): Result {
    if (trips.some((t) => t.driverId === id && (t.status === 'Draft' || t.status === 'Dispatched'))) {
      return fail('Cannot delete a driver with active or draft trips.')
    }
    setDrivers((prev) => prev.filter((x) => x.id !== id))
    return ok
  }

  // ---------- Trips ----------
  const dispatchableVehicles = vehicles.filter((v) => v.status === 'Available')
  const assignableDrivers = drivers.filter((d) => d.status === 'Available' && !isLicenseExpired(d))

  function createTrip(t: Pick<Trip, 'source' | 'destination' | 'vehicleId' | 'driverId' | 'cargoWeightKg' | 'plannedDistanceKm'>): Result {
    const vehicle = vehicles.find((v) => v.id === t.vehicleId)
    const driver = drivers.find((d) => d.id === t.driverId)
    if (!vehicle) return fail('Select a vehicle.')
    if (!driver) return fail('Select a driver.')
    if (vehicle.status === 'Retired' || vehicle.status === 'In Shop') {
      return fail(`Vehicle ${vehicle.registrationNumber} is ${vehicle.status} and cannot be dispatched.`)
    }
    if (vehicle.status === 'On Trip') {
      return fail(`Vehicle ${vehicle.registrationNumber} is already on a trip.`)
    }
    if (driver.status === 'Suspended') {
      return fail(`Driver ${driver.name} is suspended and cannot be assigned.`)
    }
    if (isLicenseExpired(driver)) {
      return fail(`Driver ${driver.name}'s license expired on ${driver.licenseExpiry}.`)
    }
    if (driver.status === 'On Trip') {
      return fail(`Driver ${driver.name} is already on a trip.`)
    }
    if (t.cargoWeightKg > vehicle.maxLoadCapacityKg) {
      return fail(`Cargo weight (${t.cargoWeightKg} kg) exceeds vehicle max load capacity (${vehicle.maxLoadCapacityKg} kg).`)
    }
    if (t.cargoWeightKg <= 0) return fail('Cargo weight must be greater than zero.')
    if (t.plannedDistanceKm <= 0) return fail('Planned distance must be greater than zero.')
    if (!t.source.trim() || !t.destination.trim()) return fail('Source and destination are required.')

    const trip: Trip = {
      id: nextId('t'),
      source: t.source,
      destination: t.destination,
      vehicleId: t.vehicleId,
      driverId: t.driverId,
      cargoWeightKg: t.cargoWeightKg,
      plannedDistanceKm: t.plannedDistanceKm,
      status: 'Draft',
      createdAt: new Date().toISOString(),
    }
    setTrips((prev) => [...prev, trip])
    return ok
  }

  function dispatchTrip(id: string): Result {
    const trip = trips.find((t) => t.id === id)
    if (!trip) return fail('Trip not found.')
    if (trip.status !== 'Draft') return fail('Only draft trips can be dispatched.')
    const vehicle = vehicles.find((v) => v.id === trip.vehicleId)
    const driver = drivers.find((d) => d.id === trip.driverId)
    if (!vehicle || vehicle.status !== 'Available') return fail('Vehicle is no longer available.')
    if (!driver || driver.status !== 'Available' || isLicenseExpired(driver)) {
      return fail('Driver is no longer available.')
    }

    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'Dispatched', dispatchedAt: new Date().toISOString() } : t)),
    )
    setVehicles((prev) => prev.map((v) => (v.id === trip.vehicleId ? { ...v, status: 'On Trip' } : v)))
    setDrivers((prev) => prev.map((d) => (d.id === trip.driverId ? { ...d, status: 'On Trip' } : d)))
    return ok
  }

  function completeTrip(id: string, actualDistanceKm: number, fuelConsumedLiters: number): Result {
    const trip = trips.find((t) => t.id === id)
    if (!trip) return fail('Trip not found.')
    if (trip.status !== 'Dispatched') return fail('Only dispatched trips can be completed.')
    if (actualDistanceKm <= 0) return fail('Final odometer distance must be greater than zero.')
    if (fuelConsumedLiters < 0) return fail('Fuel consumed cannot be negative.')

    setTrips((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, status: 'Completed', completedAt: new Date().toISOString(), actualDistanceKm, fuelConsumedLiters }
          : t,
      ),
    )
    setVehicles((prev) =>
      prev.map((v) => (v.id === trip.vehicleId ? { ...v, status: 'Available', odometerKm: v.odometerKm + actualDistanceKm } : v)),
    )
    setDrivers((prev) => prev.map((d) => (d.id === trip.driverId ? { ...d, status: 'Available' } : d)))
    return ok
  }

  function cancelTrip(id: string): Result {
    const trip = trips.find((t) => t.id === id)
    if (!trip) return fail('Trip not found.')
    if (trip.status !== 'Draft' && trip.status !== 'Dispatched') {
      return fail('Only draft or dispatched trips can be cancelled.')
    }
    const wasDispatched = trip.status === 'Dispatched'

    setTrips((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'Cancelled', cancelledAt: new Date().toISOString() } : t)),
    )
    if (wasDispatched) {
      setVehicles((prev) => prev.map((v) => (v.id === trip.vehicleId ? { ...v, status: 'Available' } : v)))
      setDrivers((prev) => prev.map((d) => (d.id === trip.driverId ? { ...d, status: 'Available' } : d)))
    }
    return ok
  }

  // ---------- Maintenance ----------
  function addMaintenanceLog(m: Pick<MaintenanceLog, 'vehicleId' | 'description' | 'cost'>): Result {
    const vehicle = vehicles.find((v) => v.id === m.vehicleId)
    if (!vehicle) return fail('Select a vehicle.')
    if (!m.description.trim()) return fail('Description is required.')
    if (m.cost < 0) return fail('Cost cannot be negative.')

    const log: MaintenanceLog = {
      id: nextId('m'),
      vehicleId: m.vehicleId,
      description: m.description,
      cost: m.cost,
      openedAt: new Date().toISOString(),
      status: 'Active',
    }
    setMaintenanceLogs((prev) => [...prev, log])
    setVehicles((prev) => prev.map((v) => (v.id === m.vehicleId ? { ...v, status: 'In Shop' } : v)))
    return ok
  }

  function closeMaintenanceLog(id: string): Result {
    const log = maintenanceLogs.find((m) => m.id === id)
    if (!log) return fail('Maintenance log not found.')
    if (log.status !== 'Active') return fail('Maintenance log is already closed.')

    setMaintenanceLogs((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'Closed', closedAt: new Date().toISOString() } : m)),
    )
    setVehicles((prev) =>
      prev.map((v) => (v.id === log.vehicleId && v.status !== 'Retired' ? { ...v, status: 'Available' } : v)),
    )
    return ok
  }

  // ---------- Fuel & Expenses ----------
  function addFuelLog(f: Omit<FuelLog, 'id'>): Result {
    if (!vehicles.some((v) => v.id === f.vehicleId)) return fail('Select a vehicle.')
    if (f.liters <= 0) return fail('Liters must be greater than zero.')
    if (f.cost < 0) return fail('Cost cannot be negative.')
    setFuelLogs((prev) => [...prev, { ...f, id: nextId('f') }])
    return ok
  }

  function addExpense(e: Omit<Expense, 'id'>): Result {
    if (!vehicles.some((v) => v.id === e.vehicleId)) return fail('Select a vehicle.')
    if (e.amount <= 0) return fail('Amount must be greater than zero.')
    setExpenses((prev) => [...prev, { ...e, id: nextId('e') }])
    return ok
  }

  return (
    <DataContext.Provider
      value={{
        vehicles,
        drivers,
        trips,
        maintenanceLogs,
        fuelLogs,
        expenses,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addDriver,
        updateDriver,
        deleteDriver,
        createTrip,
        dispatchTrip,
        completeTrip,
        cancelTrip,
        addMaintenanceLog,
        closeMaintenanceLog,
        addFuelLog,
        addExpense,
        dispatchableVehicles,
        assignableDrivers,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

export { isLicenseExpired }
