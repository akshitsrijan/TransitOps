# 🚛 TransitOps Database

> Production-ready MySQL database architecture for the TransitOps Smart Transport Operations Platform.

---

## 📌 Overview

TransitOps Database is the operational data layer of the TransitOps ecosystem.

It stores and manages all structured operational data required for fleet management while integrating seamlessly with the backend APIs and AI-powered Retrieval-Augmented Generation (RAG) service.

This database acts as the **single source of truth** for the application.

---

# 🏗 System Architecture

```text
                ┌─────────────────────────┐
                │   React / Next.js UI    │
                └────────────┬────────────┘
                             │
                             ▼
                ┌─────────────────────────┐
                │     FastAPI Backend     │
                │ (CRUD + Business Logic) │
                └────────────┬────────────┘
                             │
           ┌─────────────────┴─────────────────┐
           ▼                                   ▼
 ┌─────────────────────┐          ┌─────────────────────┐
 │      MySQL 8        │          │   Object Storage    │
 │ Operational Database│          │ Documents & Images  │
 └─────────────────────┘          └─────────────────────┘
           │
           │ Read Only
           ▼
 ┌─────────────────────┐
 │ Python RAG Service  │
 └────────────┬────────┘
              ▼
 ┌─────────────────────┐
 │      ChromaDB       │
 │ Enterprise Knowledge│
 └────────────┬────────┘
              ▼
 ┌─────────────────────┐
 │  Ollama (Qwen2.5)   │
 │ AI Response Engine  │
 └─────────────────────┘
```

---

# 🎯 Purpose

The TransitOps Database is responsible for storing all structured operational information including:

- Authentication
- Role-Based Access Control (RBAC)
- Fleet Management
- Driver Management
- Trip Management
- Maintenance Records
- Fuel Logs
- Expense Tracking
- Incident Management
- Notifications
- Audit Logging
- Vehicle Documentation Metadata
- Driver Documentation Metadata
- Branch Management

---

# 🚫 What is NOT Stored

This database intentionally does **not** store AI knowledge or enterprise documents.

The following belong inside **ChromaDB** instead:

- Policies
- SOPs
- Driver Manuals
- Government Regulations
- Insurance PDFs
- Vehicle Manuals
- Markdown Documents
- Embeddings
- Vector Data
- LLM Responses

Only metadata and references are stored inside MySQL.

---

# 🗄 Database Design Principles

The schema follows enterprise database design principles:

- Third Normal Form (3NF)
- ACID Compliance
- Referential Integrity
- Optimized Foreign Keys
- Indexed Search Columns
- Minimal Data Redundancy
- Production-ready Naming Conventions
- Scalable Relationships
- Secure Authentication Design

---

# 📂 Core Modules

## Authentication

- Users
- Roles
- Permissions (Future)
- Role Permissions (Future)

---

## Fleet

- Vehicles
- Vehicle Documents

---

## Driver Management

- Drivers
- Driver Documents

---

## Operations

- Trips
- Fuel Logs
- Maintenance
- Expenses
- Incidents

---

## Administration

- Branches
- Notifications
- Audit Logs

---

# 🧩 Core Entities

```
Users
Roles
Branches
Drivers
Vehicles
Trips
Maintenance
Fuel Logs
Expenses
Incidents
Vehicle Documents
Driver Documents
Notifications
Audit Logs
```

---

# 🔗 Entity Relationships

```
Role
 │
 └──────< Users

Branch
 ├──────< Drivers
 └──────< Vehicles

Driver
 ├──────< Trips
 └──────< Incidents

Vehicle
 ├──────< Trips
 ├──────< Maintenance
 ├──────< Fuel Logs
 ├──────< Expenses
 ├──────< Incidents
 └──────< Vehicle Documents

Trip
 ├──────< Fuel Logs
 ├──────< Expenses
 └──────< Incidents

Driver
 └──────< Driver Documents
```

---

# 🔒 Business Rules

The database supports the following operational constraints:

- Vehicle Registration Number must be unique.
- Vehicles under maintenance cannot be dispatched.
- Retired vehicles cannot be assigned to trips.
- Drivers with expired licenses cannot be assigned.
- Suspended drivers cannot be dispatched.
- Cargo weight must not exceed vehicle capacity.
- Drivers already on a trip cannot receive another assignment.
- Vehicles already on a trip cannot receive another assignment.
- Completing a trip restores vehicle and driver availability.
- Creating maintenance automatically updates vehicle status.

Business logic enforcement is handled by the backend APIs.

---

# 🤖 AI Integration

TransitOps uses a hybrid Retrieval-Augmented Generation (RAG) architecture.

### MySQL

Stores structured operational data.

### ChromaDB

Stores vector embeddings of enterprise documents.

### Ollama

Runs the Qwen2.5 Large Language Model.

### Python RAG Service

Provides read-only access to operational data and combines it with semantic document retrieval.

The RAG service never performs INSERT, UPDATE, or DELETE operations on MySQL.

---

# 📈 Scalability

Designed for:

- Multi-Branch Organizations
- Large Fleet Operations
- High Volume Trips
- AI-assisted Knowledge Retrieval
- Future Microservice Architecture

---

# 🛡 Security

- Password Hashing
- RBAC
- Audit Logging
- Read-only AI Access
- Foreign Key Constraints
- Indexed Queries
- Secure CRUD Operations

---

# 📊 Future Enhancements

- Permission Management
- Multi-tenancy
- Scheduled Maintenance
- Vehicle Assignment History
- Trip History
- Predictive Maintenance
- Fleet Analytics
- AI-powered Insights
- Automatic License Expiry Alerts

---

# 📁 Project Structure

```
database/

│── schema/
│   ├── tables.sql
│   ├── constraints.sql
│   ├── indexes.sql
│   ├── views.sql
│   ├── procedures.sql
│   ├── triggers.sql
│   └── seed.sql

│── docs/
│   ├── ERD.png
│   ├── Architecture.png
│   └── DatabaseDesign.md

│── migrations/

│── README.md
```

---

# 📚 Technology Stack

| Component | Technology |
|------------|------------|
| Database | MySQL 8 |
| Backend | FastAPI |
| Frontend | React / Next.js |
| AI | Ollama |
| LLM | Qwen2.5 |
| Vector Database | ChromaDB |
| Language | Python |

---

# 👨‍💻 Authors

TransitOps Development Team

Smart Transport Operations Platform

Enterprise Fleet Management System

---
