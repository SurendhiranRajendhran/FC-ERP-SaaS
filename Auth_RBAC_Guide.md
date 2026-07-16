# Authentication & Role-Based Access Control (RBAC) Guide

This guide details the complete authentication flow, role-based access control, security rules, and user permissions implemented in the Food Court ERP.

## 1. Overview & Purpose
The Authentication & RBAC module secures the ERP by ensuring that only authorized personnel can access specific system features. It prevents unauthorized access, protects sensitive financial and HR data, and tailors the user interface to show only relevant tools based on a user's job role.

## 2. Authentication Flow

### Login Flow
1. **Login Screen**: The system starts with a secure `/login` screen. All application functionality is hidden behind this wall (except for public QR ordering).
2. **Credential Verification**: Users enter their email and password. The backend queries the `staff` table, checking that the user exists and is active (`is_active = 1`).
3. **Password Validation**: Passwords are securely hashed using `bcrypt`. The system compares the provided password against the stored hash. 
4. **JWT Generation**: If valid, the backend issues a **JSON Web Token (JWT)** signed with a secret key. This token contains the user's `id`, `name`, `role`, and `vendor_id`. It is set to expire after 12 hours.
5. **State Initialization**: The React frontend stores this token and user metadata in `localStorage`, and injects it into the global application state. 

### API Protection (Fetch Interceptor)
- The frontend features a custom `window.fetch` interceptor. Every outgoing API request to the backend automatically attaches the JWT as a `Bearer` token in the `Authorization` header.
- If an API request returns a `401 Unauthorized` (e.g., if the token expires), the frontend gracefully ignores data-fetching for that request, and the user is required to log back in.

### Logout Flow
- A dedicated logout button in the sidebar clears the `localStorage` and resets the frontend state, immediately returning the user to the Login Screen.

---

## 3. Available Roles & Permissions

The system defines four distinct staff roles, each with tailored access to specific modules.

### 👑 Owner / Manager
These are administrative roles with full access to the entire ERP system.
- **Access Level**: Full System Access
- **Backend Permissions**: Can access every API endpoint.
- **Frontend Visibility**: Can see all sidebar tabs, including POS, KDS, Vendors, HR & Payroll, and MIS Reports.
- **Specific Capabilities**: Can view financial reports, manage staff, process payroll, approve leaves, create vendors, manage overheads, and edit the global inventory.
- *Real-World Example*: The food court manager logs in to approve a cook's leave request and then checks the day's total sales in the MIS Reports module.

### 🧑‍🍳 Cook
Kitchen staff dedicated to preparing orders and managing kitchen inventory.
- **Access Level**: Kitchen & Inventory Access
- **Backend Permissions**: `/api/kds`, `/api/inventory`, `/api/staff-meals`.
- **Frontend Visibility**: The KDS (Kitchen Display System) is the primary interface. The POS tab is completely hidden from Cooks.
- **Specific Capabilities**: Can view live incoming orders, update order status to 'Ready', view order history, and declare staff meals. Can also access inventory to update stock levels.
- *Real-World Example*: A cook logs in on the kitchen tablet. They only see the Kitchen Display System (KDS) tab showing new orders. They cannot see the POS or HR payroll data.

### 💁 Cashier
Front-of-house staff responsible for billing, taking orders, and managing customers.
- **Access Level**: Billing & Customer Access
- **Backend Permissions**: `/api/pos`, `/api/categories`, `/api/customers`, `/api/staff-meals`.
- **Frontend Visibility**: The POS (Point of Sale) tab is the primary interface. The KDS tab is completely hidden from Cashiers.
- **Specific Capabilities**: Can punch new orders, apply discounts, manage credit customers, process payments, and declare staff meals. Cannot access reports or HR data.
- *Real-World Example*: A cashier logs in at the front counter. They see the POS system to punch orders for walk-in customers but cannot access the kitchen's KDS or see how much other staff members are paid.

---

## 4. Frontend UI Guard & State Protection

### The "Auth Guard"
The main `App.jsx` component implements a strict React Auth Guard:
```javascript
// ── Auth Guard ─────────────────────────────────────
if (!token || !user) {
  return <LoginScreen onLogin={handleLogin} />;
}
```
If no token is present, the app strictly renders *only* the `<LoginScreen />`. None of the ERP components, layouts, or data fetchers are rendered or executed. 

### Data Fetching Guards
Every `useEffect` hook responsible for polling or fetching data (like KDS polling or dashboard metric fetching) contains an explicit `if (!token) return;` guard. This prevents the frontend from spamming the backend with unauthorized requests when a user is sitting at the login screen.

### Conditional Sidebar Rendering
The sidebar navigation dynamically renders tabs based on the `user.role`:
- **POS Tab**: `{user.role !== 'Cook' && ( ... )}` (Hidden for cooks)
- **KDS Tab**: `{user.role !== 'Cashier' && ( ... )}` (Hidden for cashiers)
- **HR, Vendors, Reports**: `{['Owner', 'Manager'].includes(user.role) && ( ... )}` (Visible only to admins)

---

## 5. Backend Security & Route Protection

The `server.js` implements a rigorous middleware chain to protect endpoints.

### 1. `authenticateToken` Middleware
This middleware intercepts every request to `/api/*`:
- Checks for the `Authorization: Bearer <token>` header.
- Verifies the token using `jwt.verify()` and the `JWT_SECRET`.
- If valid, attaches the decoded `req.user` payload to the request for downstream use.
- Rejects requests without tokens or with expired tokens (returns `401` or `403`).

### 2. Public Route Exceptions
Certain endpoints bypass authentication to allow public-facing features (like the QR ordering menu) to function:
- `/api/auth/login` (To allow logging in)
- `/api/server-info` (Health check)
- `/api/items` (GET) (Allows customers scanning a QR code to view the menu)
- `/api/orders` (POST) (Allows customers to submit an order from their phone)
- `/api/orders/:id/status` (GET) (Allows customers to track their order live)

### 3. `authorizeRoles` Middleware
This enforces Role-Based Access Control (RBAC) at the route level. It checks the `req.user.role` attached by the token authenticator against a list of allowed roles for that specific route.
```javascript
// Examples of Route Protections
app.use('/api/hr', authorizeRoles('Owner', 'Manager'));
app.use('/api/pos', authorizeRoles('Owner', 'Manager', 'Cashier'));
app.use('/api/kds', authorizeRoles('Owner', 'Manager', 'Cook'));
app.use('/api/staff-meals', authorizeRoles('Owner', 'Manager', 'Cook', 'Cashier'));
```
If a user tries to access an API they don't have permission for (e.g., a Cashier trying to send a POST request to `/api/hr/payroll`), the server rejects it with a `403 Forbidden: Access denied. Requires one of roles: Owner, Manager`.

---

## 6. Summary of Security Benefits
1. **Zero Trust Architecture**: Every single backend API request (except explicit public ones) requires cryptographic token verification.
2. **Data Isolation**: Cashiers cannot see financial reports, and Cooks cannot see HR payroll data.
3. **Tamper-Proof Roles**: Because the user's role is baked into the cryptographically signed JWT by the backend, a malicious user cannot alter their frontend local storage to grant themselves "Admin" privileges; the backend will reject their requests.
4. **Graceful Degradation**: If a token expires naturally after 12 hours, the frontend safely stops fetching data and presents the login screen without crashing.
