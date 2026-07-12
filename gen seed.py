import random
from datetime import date, timedelta

random.seed(42)

OUT = []
def w(line=""):
    OUT.append(line)

# ---------------------------------------------------------------------------
# Reference data
# ---------------------------------------------------------------------------

first_names_m = ["Rajesh","Suresh","Anil","Vijay","Ramesh","Arun","Sanjay","Manoj",
    "Deepak","Vikram","Ashok","Ravi","Prakash","Naveen","Sunil","Rahul","Amit",
    "Vinod","Ganesh","Mahesh","Santosh","Pradeep","Yogesh","Ajay","Kiran",
    "Srinivas","Shankar","Harish","Dinesh","Gopal","Balaji","Chandran","Murali",
    "Kumar","Raju","Venkatesh"]
first_names_f = ["Sunita","Anita","Kavita","Lakshmi","Priya","Deepa","Meena",
    "Radha","Geeta","Shalini","Pooja","Neha","Divya","Swati","Rekha","Sarita",
    "Manju","Usha","Vandana","Jyoti"]
last_names = ["Kumar","Sharma","Reddy","Naidu","Rao","Iyer","Nair","Menon",
    "Gowda","Patil","Shetty","Pillai","Verma","Yadav","Singh","Gupta","Mishra",
    "Chauhan","Desai","Joshi","Kulkarni","Bhat","Hegde","Prasad","Murthy",
    "Rathore","Chandran","Subramaniam","Krishnan","Pandey"]

def rand_name(gender=None):
    g = gender or random.choice(["M","M","M","F"])
    fn = random.choice(first_names_m) if g == "M" else random.choice(first_names_f)
    ln = random.choice(last_names)
    return fn, ln

def rand_phone():
    return "+91-" + str(random.choice([7,8,9])) + "".join(str(random.randint(0,9)) for _ in range(9))

def rand_date(start_year=2018, end_year=2025):
    start = date(start_year,1,1)
    end = date(end_year,12,31)
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))

def sql_str(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"

def sql_date(d):
    if d is None:
        return "NULL"
    return "'" + d.isoformat() + "'"

STATE_CODES = ["KA","MH","TN","DL","UP","GJ","RJ","WB","AP","TS","KL","PB","HR","MP"]

def rand_vehicle_number():
    sc = random.choice(STATE_CODES)
    rto = f"{random.randint(1,60):02d}"
    letters = "".join(random.choice("ABCDEFGHJKLMNPQRSTUVWXYZ") for _ in range(2))
    num = random.randint(1000,9999)
    return f"{sc}-{rto}-{letters}-{num}"

CITIES = ["Bengaluru","Mumbai","Chennai","Delhi","Hyderabad","Pune","Kolkata",
    "Ahmedabad","Jaipur","Lucknow","Kochi","Chandigarh","Nagpur","Coimbatore",
    "Mysuru","Mangaluru","Vijayawada","Indore","Surat","Nashik"]

# ---------------------------------------------------------------------------
w("-- =============================================================")
w("-- TransitOps Database - Seed Data")
w("-- Generated seed.sql: schema (idempotent) + realistic sample data")
w("-- Target: PostgreSQL 13+")
w("-- =============================================================")
w()
w("BEGIN;")
w()
w("-- Clean slate (safe re-run) --------------------------------------------")
w("DROP TABLE IF EXISTS incidents CASCADE;")
w("DROP TABLE IF EXISTS leave_records CASCADE;")
w("DROP TABLE IF EXISTS attendance CASCADE;")
w("DROP TABLE IF EXISTS fuel_logs CASCADE;")
w("DROP TABLE IF EXISTS maintenance_records CASCADE;")
w("DROP TABLE IF EXISTS trips CASCADE;")
w("DROP TABLE IF EXISTS vehicle_assignments CASCADE;")
w("DROP TABLE IF EXISTS vehicles CASCADE;")
w("DROP TABLE IF EXISTS drivers CASCADE;")
w("DROP TABLE IF EXISTS employees CASCADE;")
w("DROP TABLE IF EXISTS departments CASCADE;")
w()

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------
w("-- =============================================================")
w("-- SCHEMA")
w("-- =============================================================")
w()
w("""CREATE TABLE departments (
    department_id      SERIAL PRIMARY KEY,
    department_name    VARCHAR(100) NOT NULL,
    location            VARCHAR(100) NOT NULL,
    head_of_department  VARCHAR(100),
    created_at          DATE NOT NULL DEFAULT CURRENT_DATE
);""")
w()
w("""CREATE TABLE employees (
    employee_id         SERIAL PRIMARY KEY,
    first_name           VARCHAR(50) NOT NULL,
    last_name            VARCHAR(50) NOT NULL,
    department_id        INTEGER NOT NULL REFERENCES departments(department_id),
    designation           VARCHAR(60) NOT NULL,
    phone                VARCHAR(20) NOT NULL,
    email                VARCHAR(100) NOT NULL UNIQUE,
    date_of_joining       DATE NOT NULL,
    status               VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active','Inactive','On Leave','Terminated'))
);""")
w()
w("""CREATE TABLE drivers (
    driver_id            SERIAL PRIMARY KEY,
    employee_id          INTEGER NOT NULL UNIQUE REFERENCES employees(employee_id),
    license_number        VARCHAR(30) NOT NULL UNIQUE,
    license_type          VARCHAR(20) NOT NULL,
    license_issue_date     DATE NOT NULL,
    license_expiry_date    DATE NOT NULL,
    years_of_experience    INTEGER NOT NULL DEFAULT 0,
    status                VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active','Inactive','Suspended'))
);""")
w()
w("""CREATE TABLE vehicles (
    vehicle_id           SERIAL PRIMARY KEY,
    vehicle_number         VARCHAR(20) NOT NULL UNIQUE,
    vehicle_type           VARCHAR(30) NOT NULL,
    make                  VARCHAR(40) NOT NULL,
    model                 VARCHAR(40) NOT NULL,
    year_of_manufacture     INTEGER NOT NULL,
    seating_capacity        INTEGER NOT NULL,
    fuel_type              VARCHAR(20) NOT NULL,
    purchase_date           DATE NOT NULL,
    status                 VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active','In Maintenance','Retired')),
    current_odometer_km      NUMERIC(10,1) NOT NULL DEFAULT 0
);""")
w()
w("""CREATE TABLE vehicle_assignments (
    assignment_id         SERIAL PRIMARY KEY,
    vehicle_id            INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
    driver_id             INTEGER NOT NULL REFERENCES drivers(driver_id),
    assigned_date          DATE NOT NULL,
    unassigned_date         DATE,
    status                 VARCHAR(20) NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active','Ended'))
);""")
w()
w("""CREATE TABLE trips (
    trip_id               SERIAL PRIMARY KEY,
    vehicle_id             INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
    driver_id              INTEGER NOT NULL REFERENCES drivers(driver_id),
    route_name              VARCHAR(100) NOT NULL,
    origin                  VARCHAR(60) NOT NULL,
    destination              VARCHAR(60) NOT NULL,
    start_time                TIMESTAMP NOT NULL,
    end_time                  TIMESTAMP NOT NULL,
    distance_km               NUMERIC(6,1) NOT NULL,
    passenger_count            INTEGER NOT NULL DEFAULT 0,
    status                    VARCHAR(20) NOT NULL DEFAULT 'Completed'
        CHECK (status IN ('Scheduled','In Progress','Completed','Cancelled'))
);""")
w()
w("""CREATE TABLE maintenance_records (
    maintenance_id          SERIAL PRIMARY KEY,
    vehicle_id               INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
    maintenance_type          VARCHAR(50) NOT NULL,
    description                VARCHAR(200),
    maintenance_date           DATE NOT NULL,
    cost                       NUMERIC(10,2) NOT NULL,
    performed_by                VARCHAR(80) NOT NULL,
    next_due_date               DATE,
    status                      VARCHAR(20) NOT NULL DEFAULT 'Completed'
        CHECK (status IN ('Completed','Pending','In Progress'))
);""")
w()
w("""CREATE TABLE fuel_logs (
    fuel_log_id             SERIAL PRIMARY KEY,
    vehicle_id               INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
    driver_id                INTEGER NOT NULL REFERENCES drivers(driver_id),
    fuel_date                 DATE NOT NULL,
    fuel_quantity_litres        NUMERIC(7,2) NOT NULL,
    fuel_cost_inr               NUMERIC(10,2) NOT NULL,
    odometer_reading_km          NUMERIC(10,1) NOT NULL,
    fuel_station                VARCHAR(80) NOT NULL
);""")
w()
w("""CREATE TABLE attendance (
    attendance_id            SERIAL PRIMARY KEY,
    employee_id                INTEGER NOT NULL REFERENCES employees(employee_id),
    attendance_date             DATE NOT NULL,
    status                      VARCHAR(20) NOT NULL
        CHECK (status IN ('Present','Absent','Half Day','On Leave')),
    check_in_time                TIME,
    check_out_time               TIME,
    UNIQUE(employee_id, attendance_date)
);""")
w()
w("""CREATE TABLE leave_records (
    leave_id                 SERIAL PRIMARY KEY,
    employee_id                INTEGER NOT NULL REFERENCES employees(employee_id),
    leave_type                  VARCHAR(20) NOT NULL
        CHECK (leave_type IN ('Sick','Casual','Earned','Unpaid')),
    start_date                   DATE NOT NULL,
    end_date                     DATE NOT NULL,
    status                       VARCHAR(20) NOT NULL DEFAULT 'Approved'
        CHECK (status IN ('Approved','Pending','Rejected')),
    reason                       VARCHAR(150)
);""")
w()
w("""CREATE TABLE incidents (
    incident_id               SERIAL PRIMARY KEY,
    trip_id                     INTEGER REFERENCES trips(trip_id),
    vehicle_id                  INTEGER NOT NULL REFERENCES vehicles(vehicle_id),
    driver_id                   INTEGER NOT NULL REFERENCES drivers(driver_id),
    incident_date                 DATE NOT NULL,
    incident_type                 VARCHAR(30) NOT NULL
        CHECK (incident_type IN ('Accident','Breakdown','Traffic Violation','Passenger Complaint','Theft')),
    severity                      VARCHAR(10) NOT NULL
        CHECK (severity IN ('Low','Medium','High')),
    description                   VARCHAR(250),
    status                        VARCHAR(20) NOT NULL DEFAULT 'Resolved'
        CHECK (status IN ('Open','Under Review','Resolved'))
);""")
w()

# ---------------------------------------------------------------------------
# DEPARTMENTS (10)
# ---------------------------------------------------------------------------
departments = [
    ("Fleet Operations", "Bengaluru", "Rajesh Kumar"),
    ("Human Resources", "Bengaluru", "Sunita Sharma"),
    ("Finance & Accounts", "Mumbai", "Anil Reddy"),
    ("Maintenance & Workshop", "Chennai", "Suresh Naidu"),
    ("Driver Management", "Bengaluru", "Vijay Rao"),
    ("Safety & Compliance", "Hyderabad", "Kavita Iyer"),
    ("Customer Relations", "Pune", "Manoj Nair"),
    ("IT & Systems", "Bengaluru", "Deepak Menon"),
    ("Procurement", "Delhi", "Priya Gowda"),
    ("Route Planning", "Mumbai", "Ashok Patil"),
]
w("-- =============================================================")
w("-- DEPARTMENTS (10)")
w("-- =============================================================")
w("INSERT INTO departments (department_id, department_name, location, head_of_department, created_at) VALUES")
rows = []
for i, (name, loc, head) in enumerate(departments, start=1):
    created = rand_date(2015, 2019)
    rows.append(f"({i}, {sql_str(name)}, {sql_str(loc)}, {sql_str(head)}, {sql_date(created)})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# EMPLOYEES (20) - first 15 will also be drivers
# ---------------------------------------------------------------------------
DRIVER_DESIGNATION = "Driver"
OTHER_DESIGNATIONS = ["HR Executive","Accountant","Fleet Manager","Maintenance Supervisor",
    "Safety Officer","Customer Support Executive","IT Administrator","Procurement Officer",
    "Route Planner","Operations Manager"]

n_employees = 20
n_drivers = 15
employees = []  # (id, first, last, dept_id, designation, phone, email, doj, status)

used_emails = set()
def make_email(fn, ln, idx):
    base = f"{fn.lower()}.{ln.lower()}{idx}@transitops.co.in"
    return base

for i in range(1, n_employees + 1):
    fn, ln = rand_name()
    if i <= n_drivers:
        designation = DRIVER_DESIGNATION
        dept_id = 5  # Driver Management
    else:
        designation = random.choice(OTHER_DESIGNATIONS)
        dept_id = random.randint(1, 10)
    phone = rand_phone()
    email = make_email(fn, ln, i)
    doj = rand_date(2016, 2024)
    status = random.choices(["Active","Active","Active","Inactive"], weights=[7,7,7,1])[0]
    employees.append((i, fn, ln, dept_id, designation, phone, email, doj, status))

w("-- =============================================================")
w("-- EMPLOYEES (20) - employee_id 1-15 double as Drivers")
w("-- =============================================================")
w("INSERT INTO employees (employee_id, first_name, last_name, department_id, designation, phone, email, date_of_joining, status) VALUES")
rows = []
for (eid, fn, ln, dept_id, desig, phone, email, doj, status) in employees:
    rows.append(f"({eid}, {sql_str(fn)}, {sql_str(ln)}, {dept_id}, {sql_str(desig)}, {sql_str(phone)}, {sql_str(email)}, {sql_date(doj)}, {sql_str(status)})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# DRIVERS (15) - linked 1:1 to employees 1..15
# ---------------------------------------------------------------------------
LICENSE_TYPES = ["LMV","HMV","HGMV","HPMV"]
drivers = []  # (driver_id, employee_id, license_no, type, issue, expiry, exp_years, status)
for i in range(1, n_drivers + 1):
    emp_id = i
    license_no = f"KA{random.randint(10,60):02d}{rand_date(2005,2015).year}{random.randint(1000000,9999999)}"
    ltype = random.choice(LICENSE_TYPES)
    issue = rand_date(2008, 2018)
    expiry = date(issue.year + random.choice([10, 15, 20]), issue.month, min(issue.day,28))
    exp_years = random.randint(3, 25)
    status = random.choices(["Active","Active","Active","Suspended"], weights=[8,8,8,1])[0]
    drivers.append((i, emp_id, license_no, ltype, issue, expiry, exp_years, status))

w("-- =============================================================")
w("-- DRIVERS (15)")
w("-- =============================================================")
w("INSERT INTO drivers (driver_id, employee_id, license_number, license_type, license_issue_date, license_expiry_date, years_of_experience, status) VALUES")
rows = []
for (did, emp_id, lic, ltype, issue, expiry, exp_years, status) in drivers:
    rows.append(f"({did}, {emp_id}, {sql_str(lic)}, {sql_str(ltype)}, {sql_date(issue)}, {sql_date(expiry)}, {exp_years}, {sql_str(status)})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# VEHICLES (25)
# ---------------------------------------------------------------------------
VEHICLE_TYPES = ["Bus", "Mini Bus", "Van", "Shuttle"]
MAKES_MODELS = [
    ("Tata", "Starbus"), ("Tata", "Ultra"), ("Ashok Leyland", "Viking"),
    ("Ashok Leyland", "Falcon"), ("Eicher", "Skyline Pro"),
    ("Force Motors", "Traveller"), ("Mahindra", "Cruzio"),
    ("Volvo", "B7R"), ("Bharat Benz", "1015"), ("Tata", "Winger"),
]
FUEL_TYPES = ["Diesel", "Diesel", "CNG", "Electric"]

vehicles = []  # (id, number, type, make, model, year, capacity, fuel, purchase_date, status, odometer)
vehicle_numbers_used = set()
for i in range(1, 26):
    while True:
        vnum = rand_vehicle_number()
        if vnum not in vehicle_numbers_used:
            vehicle_numbers_used.add(vnum)
            break
    vtype = random.choice(VEHICLE_TYPES)
    make, model = random.choice(MAKES_MODELS)
    year = random.randint(2015, 2025)
    capacity = {"Bus": random.choice([40,45,50]), "Mini Bus": random.choice([20,25,28]),
                "Van": random.choice([8,10,12]), "Shuttle": random.choice([14,16,18])}[vtype]
    fuel = random.choice(FUEL_TYPES)
    purchase_date = date(year, random.randint(1,12), random.randint(1,28))
    status = random.choices(["Active","Active","Active","In Maintenance","Retired"], weights=[6,6,6,2,1])[0]
    odometer = round(random.uniform(5000, 180000), 1)
    vehicles.append((i, vnum, vtype, make, model, year, capacity, fuel, purchase_date, status, odometer))

w("-- =============================================================")
w("-- VEHICLES (25)")
w("-- =============================================================")
w("INSERT INTO vehicles (vehicle_id, vehicle_number, vehicle_type, make, model, year_of_manufacture, seating_capacity, fuel_type, purchase_date, status, current_odometer_km) VALUES")
rows = []
for (vid, vnum, vtype, make, model, year, cap, fuel, pdate, status, odo) in vehicles:
    rows.append(f"({vid}, {sql_str(vnum)}, {sql_str(vtype)}, {sql_str(make)}, {sql_str(model)}, {year}, {cap}, {sql_str(fuel)}, {sql_date(pdate)}, {sql_str(status)}, {odo})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# VEHICLE ASSIGNMENTS (25) - each driver gets 1-2 vehicles over time
# ---------------------------------------------------------------------------
assignments = []
aid = 1
for did, emp_id, *_rest in drivers:
    num_assignments = random.choice([1, 1, 2])
    used_vehicles = random.sample(range(1, 26), num_assignments)
    for idx, vid in enumerate(used_vehicles):
        assigned_date = rand_date(2021, 2025)
        if idx < len(used_vehicles) - 1:
            unassigned = assigned_date + timedelta(days=random.randint(60, 400))
            status = "Ended"
        else:
            unassigned = None
            status = "Active"
        assignments.append((aid, vid, did, assigned_date, unassigned, status))
        aid += 1

w("-- =============================================================")
w(f"-- VEHICLE ASSIGNMENTS ({len(assignments)})")
w("-- =============================================================")
w("INSERT INTO vehicle_assignments (assignment_id, vehicle_id, driver_id, assigned_date, unassigned_date, status) VALUES")
rows = []
for (aid_, vid, did, adate, udate, status) in assignments:
    rows.append(f"({aid_}, {vid}, {did}, {sql_date(adate)}, {sql_date(udate)}, {sql_str(status)})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# TRIPS (50)
# ---------------------------------------------------------------------------
ROUTE_TEMPLATES = [
    "City Center - Tech Park", "Airport Shuttle", "Railway Station - Industrial Area",
    "North Campus - South Campus", "Residential Loop A", "Residential Loop B",
    "Downtown - Suburb Express", "Hospital - Metro Station", "University - City Mall",
    "Factory Shuttle Route", "Corporate Park Express", "Old Town - New Town Connector",
]

trips = []
for i in range(1, 51):
    vid = random.randint(1, 25)
    did = random.randint(1, 15)
    origin, destination = random.sample(CITIES, 2)
    route_name = random.choice(ROUTE_TEMPLATES)
    trip_date = rand_date(2025, 2026)
    start_h = random.randint(5, 20)
    start_dt = f"{trip_date.isoformat()} {start_h:02d}:{random.choice(['00','15','30','45'])}:00"
    duration_min = random.randint(30, 240)
    # compute end datetime
    from datetime import datetime
    sdt = datetime.strptime(start_dt, "%Y-%m-%d %H:%M:%S")
    edt = sdt + timedelta(minutes=duration_min)
    distance = round(random.uniform(8, 220), 1)
    passengers = random.randint(5, 50)
    status = random.choices(["Completed","Completed","Completed","Cancelled","Scheduled"], weights=[7,7,7,1,1])[0]
    trips.append((i, vid, did, route_name, origin, destination, sdt, edt, distance, passengers, status))

w("-- =============================================================")
w("-- TRIPS (50)")
w("-- =============================================================")
w("INSERT INTO trips (trip_id, vehicle_id, driver_id, route_name, origin, destination, start_time, end_time, distance_km, passenger_count, status) VALUES")
rows = []
for (tid, vid, did, route, origin, dest, sdt, edt, dist, pax, status) in trips:
    rows.append(f"({tid}, {vid}, {did}, {sql_str(route)}, {sql_str(origin)}, {sql_str(dest)}, '{sdt.isoformat(sep=' ')}', '{edt.isoformat(sep=' ')}', {dist}, {pax}, {sql_str(status)})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# MAINTENANCE RECORDS (40)
# ---------------------------------------------------------------------------
MAINT_TYPES = ["Oil Change","Brake Inspection","Tyre Replacement","Engine Overhaul",
    "AC Service","Battery Replacement","General Service","Clutch Repair",
    "Suspension Repair","Electrical Repair","Body Repair","Coolant Flush"]
WORKSHOPS = ["Bosch Car Service Bengaluru","Tata Motors Authorized Workshop",
    "Ashok Leyland Service Center Chennai","Speedway Auto Works","City Fleet Garage",
    "Volvo Bus Service Hub","Eicher Service Point","Metro Motor Works",
    "Highway Truck & Bus Care","Precision Auto Repairs"]

maintenance_records = []
for i in range(1, 41):
    vid = random.randint(1, 25)
    mtype = random.choice(MAINT_TYPES)
    desc = f"{mtype} performed as per scheduled maintenance checklist"
    mdate = rand_date(2024, 2026)
    cost = round(random.uniform(1200, 85000), 2)
    performed_by = random.choice(WORKSHOPS)
    next_due = mdate + timedelta(days=random.randint(60, 180))
    status = random.choices(["Completed","Completed","Completed","Pending","In Progress"], weights=[7,7,7,1,1])[0]
    maintenance_records.append((i, vid, mtype, desc, mdate, cost, performed_by, next_due, status))

w("-- =============================================================")
w("-- MAINTENANCE RECORDS (40)")
w("-- =============================================================")
w("INSERT INTO maintenance_records (maintenance_id, vehicle_id, maintenance_type, description, maintenance_date, cost, performed_by, next_due_date, status) VALUES")
rows = []
for (mid, vid, mtype, desc, mdate, cost, perf, next_due, status) in maintenance_records:
    rows.append(f"({mid}, {vid}, {sql_str(mtype)}, {sql_str(desc)}, {sql_date(mdate)}, {cost}, {sql_str(perf)}, {sql_date(next_due)}, {sql_str(status)})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# FUEL LOGS (50)
# ---------------------------------------------------------------------------
FUEL_STATIONS = ["Indian Oil - MG Road","Bharat Petroleum - Outer Ring Road",
    "Hindustan Petroleum - NH48","Reliance Petrol Pump - Whitefield",
    "Shell - Electronic City","Indian Oil - Hosur Road","Bharat Petroleum - Airport Road",
    "HP CNG Station - Peenya","Indian Oil - Sarjapur Road","Nayara Energy - Tumkur Road"]

fuel_logs = []
for i in range(1, 51):
    vid = random.randint(1, 25)
    did = random.randint(1, 15)
    fdate = rand_date(2025, 2026)
    qty = round(random.uniform(20, 180), 2)
    cost_per_l = round(random.uniform(92, 105), 2)
    cost = round(qty * cost_per_l, 2)
    odo = round(random.uniform(5000, 190000), 1)
    station = random.choice(FUEL_STATIONS)
    fuel_logs.append((i, vid, did, fdate, qty, cost, odo, station))

w("-- =============================================================")
w("-- FUEL LOGS (50)")
w("-- =============================================================")
w("INSERT INTO fuel_logs (fuel_log_id, vehicle_id, driver_id, fuel_date, fuel_quantity_litres, fuel_cost_inr, odometer_reading_km, fuel_station) VALUES")
rows = []
for (fid, vid, did, fdate, qty, cost, odo, station) in fuel_logs:
    rows.append(f"({fid}, {vid}, {did}, {sql_date(fdate)}, {qty}, {cost}, {odo}, {sql_str(station)})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# ATTENDANCE (20 employees x 10 working days = 200 records)
# ---------------------------------------------------------------------------
attendance = []
aid = 1
attendance_dates = [date(2026, 6, 1) + timedelta(days=d) for d in range(15) if (date(2026,6,1)+timedelta(days=d)).weekday() < 6]
attendance_dates = attendance_dates[:10]
for emp in employees:
    emp_id = emp[0]
    for adate in attendance_dates:
        status = random.choices(["Present","Present","Present","Present","Absent","Half Day","On Leave"],
                                 weights=[10,10,10,10,1,1,2])[0]
        if status == "Present":
            check_in = f"{random.randint(7,9):02d}:{random.choice(['00','15','30','45'])}:00"
            check_out = f"{random.randint(17,19):02d}:{random.choice(['00','15','30','45'])}:00"
        elif status == "Half Day":
            check_in = f"{random.randint(7,9):02d}:00:00"
            check_out = f"{random.randint(12,14):02d}:00:00"
        else:
            check_in = None
            check_out = None
        attendance.append((aid, emp_id, adate, status, check_in, check_out))
        aid += 1

w("-- =============================================================")
w(f"-- ATTENDANCE ({len(attendance)} records: 20 employees x 10 working days)")
w("-- =============================================================")
w("INSERT INTO attendance (attendance_id, employee_id, attendance_date, status, check_in_time, check_out_time) VALUES")
rows = []
for (aid_, emp_id, adate, status, cin, cout) in attendance:
    cin_sql = f"'{cin}'" if cin else "NULL"
    cout_sql = f"'{cout}'" if cout else "NULL"
    rows.append(f"({aid_}, {emp_id}, {sql_date(adate)}, {sql_str(status)}, {cin_sql}, {cout_sql})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# LEAVE RECORDS (18)
# ---------------------------------------------------------------------------
LEAVE_TYPES = ["Sick", "Casual", "Earned", "Unpaid"]
LEAVE_REASONS = {
    "Sick": ["Fever and body ache", "Viral infection", "Medical checkup", "Dental surgery"],
    "Casual": ["Family function", "Personal work", "Travel", "House shifting"],
    "Earned": ["Annual vacation", "Family trip", "Wedding in family"],
    "Unpaid": ["Extended personal leave", "Emergency at home"],
}
leave_records = []
for i in range(1, 19):
    emp_id = random.randint(1, 20)
    ltype = random.choice(LEAVE_TYPES)
    start = rand_date(2025, 2026)
    end = start + timedelta(days=random.randint(0, 5))
    status = random.choices(["Approved","Approved","Approved","Pending","Rejected"], weights=[6,6,6,1,1])[0]
    reason = random.choice(LEAVE_REASONS[ltype])
    leave_records.append((i, emp_id, ltype, start, end, status, reason))

w("-- =============================================================")
w("-- LEAVE RECORDS (18)")
w("-- =============================================================")
w("INSERT INTO leave_records (leave_id, employee_id, leave_type, start_date, end_date, status, reason) VALUES")
rows = []
for (lid, emp_id, ltype, start, end, status, reason) in leave_records:
    rows.append(f"({lid}, {emp_id}, {sql_str(ltype)}, {sql_date(start)}, {sql_date(end)}, {sql_str(status)}, {sql_str(reason)})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# INCIDENTS (16)
# ---------------------------------------------------------------------------
INCIDENT_TYPES = ["Accident","Breakdown","Traffic Violation","Passenger Complaint","Theft"]
INCIDENT_DESCRIPTIONS = {
    "Accident": ["Minor collision with a two-wheeler at signal", "Vehicle grazed a divider while parking",
                 "Rear-ended by another vehicle in traffic"],
    "Breakdown": ["Engine overheating on route", "Sudden tyre puncture mid-trip",
                  "Battery failure at depot"],
    "Traffic Violation": ["Overspeeding flagged by traffic police", "Signal jump reported by control room",
                           "Illegal parking near bus stand"],
    "Passenger Complaint": ["Passenger complaint about rash driving", "Complaint regarding delayed pickup",
                             "Complaint about vehicle cleanliness"],
    "Theft": ["Fuel pilferage suspected", "Spare parts reported missing from depot"],
}
SEVERITIES = ["Low","Medium","High"]

incidents = []
for i in range(1, 17):
    trip_id = random.choice([random.randint(1,50), None])
    vid = random.randint(1, 25)
    did = random.randint(1, 15)
    idate = rand_date(2025, 2026)
    itype = random.choice(INCIDENT_TYPES)
    severity = random.choices(SEVERITIES, weights=[5,3,2])[0]
    desc = random.choice(INCIDENT_DESCRIPTIONS[itype])
    status = random.choices(["Open","Under Review","Resolved","Resolved"], weights=[1,1,4,4])[0]
    incidents.append((i, trip_id, vid, did, idate, itype, severity, desc, status))

w("-- =============================================================")
w("-- INCIDENTS (16)")
w("-- =============================================================")
w("INSERT INTO incidents (incident_id, trip_id, vehicle_id, driver_id, incident_date, incident_type, severity, description, status) VALUES")
rows = []
for (iid, trip_id, vid, did, idate, itype, sev, desc, status) in incidents:
    trip_sql = trip_id if trip_id is not None else "NULL"
    rows.append(f"({iid}, {trip_sql}, {vid}, {did}, {sql_date(idate)}, {sql_str(itype)}, {sql_str(sev)}, {sql_str(desc)}, {sql_str(status)})")
w(",\n".join(rows) + ";")
w()

# ---------------------------------------------------------------------------
# Sync sequences (since we used explicit IDs)
# ---------------------------------------------------------------------------
w("-- =============================================================")
w("-- Sync sequences with explicit inserted IDs")
w("-- =============================================================")
seqs = [
    ("departments", "department_id"),
    ("employees", "employee_id"),
    ("drivers", "driver_id"),
    ("vehicles", "vehicle_id"),
    ("vehicle_assignments", "assignment_id"),
    ("trips", "trip_id"),
    ("maintenance_records", "maintenance_id"),
    ("fuel_logs", "fuel_log_id"),
    ("attendance", "attendance_id"),
    ("leave_records", "leave_id"),
    ("incidents", "incident_id"),
]
for tbl, col in seqs:
    w(f"SELECT setval(pg_get_serial_sequence('{tbl}', '{col}'), COALESCE((SELECT MAX({col}) FROM {tbl}), 1), true);")
w()
w("COMMIT;")
w()

with open("/mnt/user-data/outputs/seed.sql", "w") as f:
    f.write("\n".join(OUT))

print("Rows generated:")
print("departments:", len(departments))
print("employees:", len(employees))
print("drivers:", len(drivers))
print("vehicles:", len(vehicles))
print("vehicle_assignments:", len(assignments))
print("trips:", len(trips))
print("maintenance_records:", len(maintenance_records))
print("fuel_logs:", len(fuel_logs))
print("attendance:", len(attendance))
print("leave_records:", len(leave_records))
print("incidents:", len(incidents))
