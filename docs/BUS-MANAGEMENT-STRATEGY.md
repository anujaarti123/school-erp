# Bus Management — Phase 1 Strategy

> **Goal:** Simple bus management. Driver + Vehicle + Route linked. Parent app shows route & times. Admin notifies parents via WhatsApp group manually.

---

## 1. Scope (Phase 1 Only)

- Link **Driver → Bus (vehicle no) → Route**
- Student assignment to pickup/drop stops with times
- Parent app: show route, bus number, driver, pickup/drop times
- **Admin notifies parents manually** via WhatsApp group (no system-generated links)

---

## 2. Data Model (Minimal)

### Entities

| Table | Fields | Notes |
|-------|--------|-------|
| **Driver** | id, name, phone | Optional: license |
| **Vehicle** | id, busNumber, registration | e.g. KA-01-AB-1234 |
| **BusRoute** | id, name, driverId, vehicleId | Linked driver + vehicle |
| **BusStop** | id, routeId, name, sequence, arrivalTime, departureTime | Ordered stops with times |
| **Student** | + busRouteId, pickupStopId, dropStopId | Link student to route & stops |

### Existing

- `BusRoute` has `stops` (JSON), `driver`, `vehicle` — we extend with proper FKs
- `Student` has `busStop` (text) — we add `busRouteId`, `pickupStopId`, `dropStopId`

---

## 3. WhatsApp Notification — Manual Only

**No automated links.** Admin creates a WhatsApp group per route (e.g. "Route 1 - School Bus Parents"), adds all parents manually. When bus leaves, admin posts in that group: *"Bus has left. Please be ready at your stop."*

- Simple
- No multiple tabs or links
- Admin controls the message and timing

---

## 4. Admin Panel

### Bus Management

- **Drivers:** Add/edit drivers (name, phone)
- **Vehicles:** Add/edit vehicles (bus number, registration)
- **Routes:** Create routes, assign Driver + Vehicle, define stops with arrival/departure times
- **Students:** Assign students to route + pickup stop + drop stop

### No "Notify parents" button

Admin uses their own WhatsApp group for each route. No system integration for notifications.

---

## 5. Parent App

- **Bus card** (already exists) → navigates to Bus screen
- **Bus screen shows:**
  - Child's route name
  - Bus number
  - Driver name, driver phone
  - **Pickup:** Stop name, Arriving ~7:15 AM
  - **Drop:** Stop name, Leaving school ~2:45 PM

---

## 6. Implementation Order

1. **DB migration:** Driver, Vehicle, BusRoute (with driverId, vehicleId), BusStop, Student bus fields
2. **Admin:** Driver CRUD, Vehicle CRUD
3. **Admin:** Route CRUD, stop management, driver/vehicle assignment
4. **Admin:** Student assignment to route + pickup/drop stops
5. **API:** `GET /api/bus/my-children` for parent app
6. **Parent app:** Bus screen with route, times, driver, bus number

---

## 7. Summary

| Feature | How |
|---------|-----|
| Driver + Vehicle + Route | Linked in admin |
| Stops with times | Defined per route |
| Student assignment | Route + pickup stop + drop stop |
| Parent app | Route, bus no, driver, times |
| Admin notifies parents | Manual WhatsApp group |

**Simple. No extra complexity.**
