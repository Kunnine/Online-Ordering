# Fast Food Online Ordering System

A modern, full-stack online food ordering application built with **Laravel 11** (Backend REST API) and **React 19 + Vite** (Frontend SPA), featuring real-time state updates, dynamic inventory management with race-condition prevention, multiple payment methods (Cash on Delivery and Bakong KHQR dynamic QR code payments), and a dedicated Admin Management Suite.

---

## Architecture & Project Structure

The project is structured as a monorepo containing the backend API, frontend client, and payment integration components:

```
Online_Ordering/
├── fastfood-backend/        # Laravel 11 RESTful API backend
│   ├── app/                 # Application logic (Controllers, Models, Services)
│   │   ├── Http/Controllers # API & Admin controllers
│   │   └── Services/        # Payment and business logic services
│   ├── bootstrap/           # Laravel 11 bootstrap & route configuration
│   ├── config/              # App, auth, cors, and database configurations
│   ├── database/            # Migrations, seeders, and factories
│   ├── routes/              # api.php, web.php, console.php
│   └── tests/               # Automated unit and feature tests
├── fastfood-frontend/       # React 19 + Vite single-page application
│   ├── public/              # Static public assets
│   └── src/
│       ├── components/      # Reusable UI components (ProductCard, Navbar, etc.)
│       ├── context/         # React Context (AuthContext, CartContext)
│       ├── pages/           # Customer pages (Menu, Cart, Checkout, KhqrPayment)
│       │   └── admin/       # Admin pages (ManageProducts, ManageOrders, Reports)
│       └── services/        # Axios API client and route definitions
├── khqr-api/                # (Optional) Standalone Node.js KHQR service
├── .gitignore               # Root git exclusion rules (vendors, node_modules, .env)
└── README.md                # Project documentation
```

---

## Key Features

### Customer Experience
- **Interactive Menu & Categories**: Browse items by category, search by keyword, view prices, and see real-time availability badges.
- **Cart Management**: Persistent shopping cart with quantity limits bound directly to current inventory stock.
- **Smart Checkout**:
  - Auto-fills registered delivery details (name, phone, address).
  - Client-side and server-side validation against stock changes.
  - Choice between **Cash on Delivery (COD)** and **Bakong KHQR (ABA Pay / QR Code)**.
- **Order Tracking**: Immediate confirmation screen for COD and dedicated QR scanning interface for KHQR payments.

### Admin Management Dashboard
- **Product & Inventory Management**: Create, edit, restock, or toggle item availability. Out-of-stock items automatically disable checkout.
- **Order Processing**: Track order lifecycle (`pending` → `processing` → `completed` / `cancelled`).
- **Automated Stock Replenishment**: Cancelling an order automatically restores all reserved product inventory back to the warehouse.
- **Payment Verification**: View payment transaction hashes, verify manual receipts, and mark cash payments as collected.
- **Sales Reports & Analytics**: Interactive revenue charts, sales by category, and monthly order summaries using Recharts.

### Security & Performance
- **Pessimistic Inventory Locking**: `lockForUpdate()` is used during checkout transactions to prevent double-spending and overselling under concurrent load.
- **Rate-Limited Authentication**: Login and registration routes are protected against brute-force attacks via `throttle:10,1`.
- **Route-Level Role Guards**: Admin endpoints are strictly isolated under Sanctum auth middleware.
- **Optimized Bundle**: Admin panels and reporting suites utilize `React.lazy` and `Suspense` code-splitting, keeping the initial frontend bundle lightweight (~358 kB).

---

## Tech Stack

- **Backend**: PHP 8.2+, Laravel 11, Laravel Sanctum, Laravel Reverb (WebSockets).
- **Frontend**: React 19, Vite, Tailwind CSS, Lucide React, Recharts, Axios.
- **Database**: MySQL 8.0+ (InnoDB with foreign key constraints & row locking).
- **Payment Gateways**:
  - Cash on Delivery (COD)
  - Bakong KHQR (EMVCo compliant QR generator)
  - Stripe (Ready for optional card payments)

---

## Prerequisites

Before running the application locally, ensure you have:
- [PHP 8.2 or 8.3+](https://www.php.net/) with `pdo_mysql`, `curl`, `mbstring`, `openssl`, and `gd` extensions enabled.
- [Composer](https://getcomposer.org/) (PHP dependency manager).
- [Node.js](https://nodejs.org/) (v18+ recommended) and `npm`.
- [MySQL 8.0+](https://dev.mysql.com/downloads/) or a local stack such as **WAMP / XAMPP / Herd**.

---

## Installation & Setup

### 1. Backend Setup (`fastfood-backend`)

1. Open your terminal and navigate to the backend directory:
   ```bash
   cd fastfood-backend
   ```

2. Install PHP dependencies:
   ```bash
   composer install
   ```

3. Create the environment configuration file:
   ```bash
   cp .env.example .env
   ```

4. Configure your database settings inside `.env`:
   ```env
   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=fastfood_db
   DB_USERNAME=root
   DB_PASSWORD=
   ```

5. Generate the application encryption key:
   ```bash
   php artisan key:generate
   ```

6. Run database migrations and seed the initial catalog and admin user:
   ```bash
   php artisan migrate --seed
   ```

7. Link public storage for product images and generated QR codes:
   ```bash
   php artisan storage:link
   ```

8. Start the local Laravel development server:
   ```bash
   php artisan serve
   ```
   The backend API will run at: `http://127.0.0.1:8000`

---

### 2. Frontend Setup (`fastfood-frontend`)

1. Open a new terminal tab and navigate to the frontend directory:
   ```bash
   cd fastfood-frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Configure the frontend environment file:
   ```bash
   cp .env.example .env
   ```

4. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will run at: `http://localhost:5173`

5. (Optional) To create an optimized production build:
   ```bash
   npm run build
   ```

---

## API Reference Overview

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/api/register` | Customer account registration | Public (Rate-limited) |
| `POST` | `/api/login` | Account authentication & token generation | Public (Rate-limited) |
| `POST` | `/api/logout` | Revoke current Sanctum token | Authenticated |
| `GET` | `/api/user` | Fetch currently authenticated user profile | Authenticated |
| `GET` | `/api/products` | Retrieve active menu items with stock status | Public |
| `GET` | `/api/categories` | Retrieve menu categories | Public |
| `POST` | `/api/orders` | Place a new order with stock validation | Authenticated |
| `GET` | `/api/orders/{id}` | Retrieve specific order details | Authenticated |
| `GET` | `/api/payment/qr-code` | Fetch dynamic KHQR code for an order | Authenticated |
| `GET` | `/api/payment/status/{id}` | Query payment transaction status | Authenticated |
| `GET` | `/api/admin/orders` | List all orders with filters | Admin Only |
| `PUT` | `/api/admin/orders/{id}/status` | Update order fulfillment status | Admin Only |
| `PUT` | `/api/admin/orders/{id}/payment-status` | Update payment status (e.g. mark COD paid) | Admin Only |
| `GET` | `/api/admin/stats` | Retrieve revenue and order statistics | Admin Only |

---

## Pushing to Git

Follow these steps to initialize and push this project to GitHub, GitLab, or Bitbucket:

1. **Verify your working directory** is at the project root:
   ```bash
   cd c:\wamp64\www\Online_Ordering
   ```

2. **Initialize Git** (if not already initialized):
   ```bash
   git init
   ```

3. **Check Status**:
   Ensure `.env` files and `node_modules`/`vendor` are ignored:
   ```bash
   git status
   ```

4. **Stage and Commit**:
   ```bash
   git add .
   git commit -m "Initial commit: Fast Food Online Ordering System"
   ```

5. **Link your Remote Repository**:
   ```bash
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   ```

6. **Push to Remote**:
   ```bash
   git push -u origin main
   ```

---

## License

This project is open-source and available under the [MIT License](LICENSE).
