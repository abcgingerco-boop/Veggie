import { Vehicle, Buyer, Grade, BagWeight } from '../types'

export function mapVehicle(row: any): Vehicle {
  return {
    id: row.id,
    date: row.date,
    vehicleNumber: row.vehicle_number,
    gradeWiseBags: row.grade_wise_bags || {},
  }
}

export function mapBuyer(row: any): Buyer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone || undefined,
    isActive: row.is_active,
  }
}

export function mapGrade(row: any): Grade {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    isActive: row.is_active,
  }
}

export function mapBagWeight(row: any): BagWeight {
  return {
    id: row.id,
    date: row.date,
    buyerId: row.buyer_id,
    grade: row.grade,
    bagNumber: row.bag_number,
    weight: Number(row.weight),
    timestamp: new Date(row.created_at).getTime(),
  }
}
