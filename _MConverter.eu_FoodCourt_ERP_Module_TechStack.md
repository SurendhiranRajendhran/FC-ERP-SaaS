**Food Court & Canteen**

ERP System

*Complete Module Guide & Technology Stack*

College Canteen \| Corporate Canteen \| Mall Food Court

May 2026

# 1. Introduction {#introduction}

This document provides a complete blueprint for developing a Food Court & Canteen ERP system --- covering all modules required for day-to-day operations including daily menu management, stock tracking, counter and QR-based billing, kitchen display, multi-vendor management, HR, and analytics.

The system is designed to serve three distinct customer segments: college and school canteens, corporate and hospital canteens, and mall food courts with multiple vendor stalls. Both counter billing and QR self-ordering are supported from Day 1.

# 2. ERP Module Map {#erp-module-map}

The diagram below shows all 25 modules of the Food Court ERP grouped by functional category:

![](media/image1.png){width="6.5625in" height="3.0729166666666665in"}

*Figure 1: Food Court & Canteen ERP --- Complete Module Map*

# 3. Detailed Module Requirements {#detailed-module-requirements}

## 3.1 Daily Menu Management {#daily-menu-management}

The daily menu module is the starting point of every day\'s operations. Staff activate items available for the day, set time-based visibility, and mark items as sold out in real time.

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>Daily Menu Management</strong></td>
</tr>
<tr>
<td><strong>Daily Activation</strong></td>
<td>Enable or disable each menu item every morning. Sold-out toggle available throughout the day with one click.</td>
</tr>
<tr>
<td><strong>Item Master</strong></td>
<td>Item name, category, photo, base price, GST percentage, portion size, and allergen tags stored centrally.</td>
</tr>
<tr>
<td><strong>Category Management</strong></td>
<td>Organise items into Breakfast, Lunch, Snacks, Beverages, Combos, and Specials. Categories control menu display order.</td>
</tr>
<tr>
<td><strong>Combo Builder</strong></td>
<td>Create combo meals linking multiple items with auto-calculated combo price and auto-deduction of all linked item stocks.</td>
</tr>
<tr>
<td><strong>Time-Based Menu</strong></td>
<td>Breakfast items auto-hide after configured time (e.g. 11 AM). Lunch items visible only during lunch hours. Fully configurable.</td>
</tr>
<tr>
<td><strong>Vendor-wise Menu</strong></td>
<td>In food courts each stall manages its own separate menu. Central admin can view all stall menus but cannot edit them.</td>
</tr>
<tr>
<td><strong>Daily Special</strong></td>
<td>Mark any item as 'Today's Special' with custom price and highlighted display on QR menu and POS screen.</td>
</tr>
</tbody>
</table>

## 3.2 Stock & Inventory Management {#stock-inventory-management}

Stock management tracks raw materials from purchase through consumption to closing balance. Every sale auto-deducts ingredients based on recipe mapping.

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>Stock &amp; Inventory Management</strong></td>
</tr>
<tr>
<td><strong>Opening Stock Entry</strong></td>
<td>Staff enters morning physical stock for each ingredient and finished item. Quick bulk entry with pre-loaded yesterday's closing.</td>
</tr>
<tr>
<td><strong>Raw Material Master</strong></td>
<td>All ingredients with unit of measure (kg, litre, piece, packet), minimum stock level, and reorder quantity.</td>
</tr>
<tr>
<td><strong>Recipe Mapping</strong></td>
<td>Each menu item linked to required raw materials and exact quantities consumed per serving. Auto-deducts on every sale.</td>
</tr>
<tr>
<td><strong>Auto Stock Deduction</strong></td>
<td>On every confirmed order, raw material stock is deducted based on recipe mapping. Real-time stock balance always accurate.</td>
</tr>
<tr>
<td><strong>Low Stock Alerts</strong></td>
<td>WhatsApp and SMS alert sent to owner/manager when any ingredient falls below minimum stock level. Configurable thresholds.</td>
</tr>
<tr>
<td><strong>Closing Stock Entry</strong></td>
<td>End-of-day physical count entered against system count. Variance (difference) flagged for investigation. Wastage reasons logged.</td>
</tr>
<tr>
<td><strong>Wastage Tracking</strong></td>
<td>Log spoiled or wasted items with quantity, reason, and responsible person. Impacts daily cost calculation.</td>
</tr>
<tr>
<td><strong>Purchase Entry</strong></td>
<td>Goods received from supplier recorded with quantity, unit price, supplier name, invoice number, and GST.</td>
</tr>
<tr>
<td><strong>Supplier Management</strong></td>
<td>Supplier profiles with contact, payment terms, items supplied, delivery schedule, and outstanding payment tracking.</td>
</tr>
<tr>
<td><strong>Stock Reports</strong></td>
<td>Daily consumption, closing stock, purchase vs. consumption comparison, wastage summary, and low-stock items report.</td>
</tr>
</tbody>
</table>

## 3.3 Counter POS & Billing {#counter-pos-billing}

The counter POS is designed for speed --- large touch-friendly buttons, instant item search, and one-tap billing for high-volume peak hours.

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>Counter POS &amp; Billing</strong></td>
</tr>
<tr>
<td><strong>Touch-Screen POS</strong></td>
<td>Large category buttons and item tiles optimised for tablets. Works on Android tablet — no expensive hardware needed.</td>
</tr>
<tr>
<td><strong>Token / Table Number</strong></td>
<td>Assign token number for takeaway orders or table number for dine-in. Printed on KOT and displayed on token board.</td>
</tr>
<tr>
<td><strong>Split Billing</strong></td>
<td>Split one bill among multiple customers. Each portion paid separately via any payment method.</td>
</tr>
<tr>
<td><strong>Bill Modification</strong></td>
<td>Add or remove items before payment confirmation. Manager PIN required for modifications after KOT printed.</td>
</tr>
<tr>
<td><strong>Discount &amp; Offers</strong></td>
<td>Apply percentage or fixed amount discount. Coupon code entry. Staff meal discount. Student ID discount for canteens.</td>
</tr>
<tr>
<td><strong>Hold &amp; Recall</strong></td>
<td>Put an order on hold to serve next customer, then recall it when the held customer returns.</td>
</tr>
<tr>
<td><strong>KOT Printing</strong></td>
<td>Kitchen Order Ticket auto-prints at kitchen printer immediately on order confirmation. Separate KOT per stall in food courts.</td>
</tr>
<tr>
<td><strong>Bill Printing</strong></td>
<td>Thermal printer receipt with item list, quantities, prices, GST breakup, total, and payment mode.</td>
</tr>
<tr>
<td><strong>Multiple Payment Modes</strong></td>
<td>Accept cash, UPI scan, card swipe, meal card RFID, and prepaid wallet balance — in a single transaction split.</td>
</tr>
<tr>
<td><strong>Refund &amp; Cancellation</strong></td>
<td>Cancel order with manager approval. Refund to original payment mode. Cancellation reason logged for audit.</td>
</tr>
<tr>
<td><strong>Cash Drawer Management</strong></td>
<td>Opening cash entry, denomination-wise closing count, shortage/excess flagged, and daily cash handover report.</td>
</tr>
</tbody>
</table>

## 3.4 QR Code Self-Ordering {#qr-code-self-ordering}

Customers scan a table or counter QR code, browse the live menu, place their order, pay online, and receive a token number --- no staff involvement needed for the ordering process.

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>QR Code Self-Ordering</strong></td>
</tr>
<tr>
<td><strong>Table / Counter QR</strong></td>
<td>Unique QR code per table or pickup counter. Printed on standee or stuck to table. Replaces/supplements counter billing.</td>
</tr>
<tr>
<td><strong>Digital Live Menu</strong></td>
<td>Customer sees only today's available items with photos, prices, and sold-out status. Instant sync when items are marked sold out.</td>
</tr>
<tr>
<td><strong>Cart &amp; Customisation</strong></td>
<td>Add items to cart, select spice level or add-ons, enter special instructions, and adjust quantities.</td>
</tr>
<tr>
<td><strong>Online Payment</strong></td>
<td>UPI, credit/debit card, and net banking payment from customer's phone. No cash handling required.</td>
</tr>
<tr>
<td><strong>Token Generation</strong></td>
<td>Auto-generates unique token number after successful payment. Displayed on customer's screen and sent via SMS.</td>
</tr>
<tr>
<td><strong>Order Status Tracking</strong></td>
<td>Customer sees live status: Order Received → Preparing → Ready for Pickup. Updated by kitchen staff.</td>
</tr>
<tr>
<td><strong>No-App Ordering</strong></td>
<td>Entire ordering flow works in the phone's browser. No app download required by the customer.</td>
</tr>
<tr>
<td><strong>Multi-Vendor Routing</strong></td>
<td>In food courts, each item in the cart is automatically routed to the correct stall's kitchen display.</td>
</tr>
<tr>
<td><strong>Pre-Order for Slots</strong></td>
<td>For canteens, customers can pre-order for a specific time slot to reduce peak-hour queues.</td>
</tr>
</tbody>
</table>

## 3.5 Kitchen Display System (KDS) {#kitchen-display-system-kds}

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>Kitchen Display System</strong></td>
</tr>
<tr>
<td><strong>Live Order Screen</strong></td>
<td>All pending orders displayed on a large screen in the kitchen. Each order shows items, token number, and time elapsed.</td>
</tr>
<tr>
<td><strong>Order Ageing</strong></td>
<td>Orders pending beyond configurable time (e.g. 10 minutes) highlighted in yellow, then red to alert kitchen staff.</td>
</tr>
<tr>
<td><strong>Mark as Ready</strong></td>
<td>Kitchen staff taps 'Ready' on the KDS screen. Customer receives SMS/WhatsApp notification and token board updates.</td>
</tr>
<tr>
<td><strong>Counter-wise Display</strong></td>
<td>Each stall in food court has its own KDS showing only their items. Central KDS shows all orders for the owner.</td>
</tr>
<tr>
<td><strong>Rush Hour Mode</strong></td>
<td>During peak hours, KDS switches to condensed view showing more orders simultaneously on screen.</td>
</tr>
<tr>
<td><strong>Order History</strong></td>
<td>Kitchen can view last 2 hours of completed orders for reference in case of disputes.</td>
</tr>
</tbody>
</table>

## 3.6 Payment & Billing {#payment-billing}

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>Payment &amp; Billing</strong></td>
</tr>
<tr>
<td><strong>GST Billing</strong></td>
<td>Auto-calculate CGST and SGST based on item type. 5% for non-AC restaurants, 12% for AC. HSN/SAC code per item.</td>
</tr>
<tr>
<td><strong>UPI Integration</strong></td>
<td>Razorpay or PayU integration for QR-based UPI collection. Real-time payment confirmation to POS.</td>
</tr>
<tr>
<td><strong>Meal Card / RFID</strong></td>
<td>Employee or student RFID meal cards with preloaded balance. Tap to pay at counter. Monthly top-up by admin.</td>
</tr>
<tr>
<td><strong>Prepaid Wallet</strong></td>
<td>Customer registers and loads balance online. Deducted on each order. Refund to wallet on cancellation.</td>
</tr>
<tr>
<td><strong>Daily Reconciliation</strong></td>
<td>System total vs. physical cash vs. UPI settlements reconciled every day. Discrepancy report flagged to owner.</td>
</tr>
<tr>
<td><strong>Credit / Pending Payment</strong></td>
<td>Staff or student meals on credit — tracked per person. Monthly recovery with statement.</td>
</tr>
<tr>
<td><strong>GST Reports</strong></td>
<td>GSTR-1 and GSTR-3B data export. HSN-wise summary. Monthly GST liability calculation. Ready for CA filing.</td>
</tr>
<tr>
<td><strong>Vendor-wise GST</strong></td>
<td>In food courts, each vendor's GST is calculated and reported separately based on their own GSTIN.</td>
</tr>
</tbody>
</table>

## 3.7 Multi-Vendor Management {#multi-vendor-management}

Applicable for mall food courts, food parks, and any venue with multiple independent stalls under one roof.

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>Multi-Vendor Management</strong></td>
</tr>
<tr>
<td><strong>Vendor Profiles</strong></td>
<td>Each stall registered with name, GSTIN, bank account, contact, and assigned stall number.</td>
</tr>
<tr>
<td><strong>Vendor-wise Billing</strong></td>
<td>Each stall can operate its own POS counter and billing independently, or use a central billing counter.</td>
</tr>
<tr>
<td><strong>Revenue Sharing</strong></td>
<td>Food court owner takes a configured percentage commission from each vendor's gross sales. Auto-calculated daily.</td>
</tr>
<tr>
<td><strong>Vendor Settlement</strong></td>
<td>Weekly or monthly payout to each vendor — gross sales minus commission minus common area costs. Bank transfer advice.</td>
</tr>
<tr>
<td><strong>Vendor Dashboard</strong></td>
<td>Each vendor logs in to see only their own sales, stock, orders, and revenue. Cannot see other stalls' data.</td>
</tr>
<tr>
<td><strong>Common Area Costs</strong></td>
<td>Split shared costs (electricity, cleaning, security) across vendors by area or sales percentage.</td>
</tr>
<tr>
<td><strong>Vendor Performance</strong></td>
<td>Owner dashboard showing best/worst performing stalls by revenue, footfall, and average order value.</td>
</tr>
</tbody>
</table>

## 3.8 HR, Payroll & Attendance {#hr-payroll-attendance}

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>HR, Payroll &amp; Attendance</strong></td>
</tr>
<tr>
<td><strong>Staff Roles &amp; Logins</strong></td>
<td>Define roles: Owner, Manager, Billing Staff, Cook, Helper. Each role has specific module access permissions.</td>
</tr>
<tr>
<td><strong>Shift Management</strong></td>
<td>Morning/afternoon/evening shift scheduling. Roster view for week ahead. Swap shift request and approval.</td>
</tr>
<tr>
<td><strong>Attendance</strong></td>
<td>Biometric device or mobile app-based check-in and check-out. Linked to shift schedule. Late arrival flagged.</td>
</tr>
<tr>
<td><strong>Leave Management</strong></td>
<td>Leave application, approval workflow, leave balance tracking. Holiday calendar for canteen closure planning.</td>
</tr>
<tr>
<td><strong>Payroll</strong></td>
<td>Daily wage or monthly salary computation based on attendance. PF, ESI, and TDS deductions. Payslip PDF generation.</td>
</tr>
<tr>
<td><strong>Staff Meal Deduction</strong></td>
<td>Staff meals consumed at canteen auto-tracked and deducted from monthly salary with itemised statement.</td>
</tr>
<tr>
<td><strong>Performance Tracking</strong></td>
<td>Orders processed per billing staff, average handling time, upsell rate — for incentive calculation.</td>
</tr>
</tbody>
</table>

## 3.9 MIS, Reports & Analytics {#mis-reports-analytics}

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>MIS, Reports &amp; Analytics</strong></td>
</tr>
<tr>
<td><strong>Owner Dashboard</strong></td>
<td>Real-time view of today's revenue, orders, top-selling items, pending orders, and stock alerts on one screen.</td>
</tr>
<tr>
<td><strong>Daily Sales Report</strong></td>
<td>Item-wise sales count and revenue, payment mode split, GST collected, wastage, and net profit for the day.</td>
</tr>
<tr>
<td><strong>Stock Reports</strong></td>
<td>Consumption vs. opening stock, closing balance, purchase summary, wastage by item, and reorder requirement.</td>
</tr>
<tr>
<td><strong>Vendor Reports</strong></td>
<td>Per-vendor sales, commission deducted, payout due, and comparative performance across stalls.</td>
</tr>
<tr>
<td><strong>Peak Hours Analysis</strong></td>
<td>Order volume and revenue by hour of day. Helps plan staffing and kitchen prep for busy periods.</td>
</tr>
<tr>
<td><strong>Monthly P&amp;L</strong></td>
<td>Revenue, COGS (cost of goods sold), staff cost, overheads, and net profit per month. Trend comparison.</td>
</tr>
<tr>
<td><strong>Customer Analytics</strong></td>
<td>Repeat customer rate, average order value, loyalty points outstanding, and feedback scores.</td>
</tr>
<tr>
<td><strong>Custom Date Range</strong></td>
<td>All reports exportable for any custom date range in PDF or Excel format. Scheduled email delivery option.</td>
</tr>
</tbody>
</table>

## 3.10 Notifications & CRM {#notifications-crm}

<table style="width:93%;">
<colgroup>
<col style="width: 27%" />
<col style="width: 65%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>Notifications &amp; CRM</strong></td>
</tr>
<tr>
<td><strong>Low Stock WhatsApp Alert</strong></td>
<td>Instant WhatsApp message to owner when stock falls below minimum — item name, current quantity, reorder level.</td>
</tr>
<tr>
<td><strong>Daily Summary</strong></td>
<td>Auto-sent WhatsApp/email to owner at canteen closing time — total revenue, orders, top 3 items, cash collected.</td>
</tr>
<tr>
<td><strong>Customer Loyalty</strong></td>
<td>Points awarded per ₹100 spent. Redeem points on next order. Loyalty balance shown in QR ordering menu.</td>
</tr>
<tr>
<td><strong>Offer Broadcasts</strong></td>
<td>WhatsApp blast to all registered customers about today's special, weekend offer, or festive discount.</td>
</tr>
<tr>
<td><strong>Feedback Collection</strong></td>
<td>Post-order QR feedback form for rating food, service, and speed. Negative feedback alerts manager immediately.</td>
</tr>
<tr>
<td><strong>Order Notifications</strong></td>
<td>SMS and WhatsApp to customer when order is ready. Token number and estimated wait time included.</td>
</tr>
</tbody>
</table>

# 4. Recommended Technology Stack {#recommended-technology-stack}

The technology stack below is chosen for rapid development, scalability, cost-effectiveness, and suitability for a SaaS model serving multiple canteens and food courts simultaneously. It supports both web-based counter POS and mobile QR ordering from a single codebase.

## 4.1 Frontend (Web & POS) {#frontend-web-pos}

|  |  |  |  |
|:--:|:--:|:--:|:--:|
| **Layer** | **Technology** | **Why Chosen** | **Alternatives** |
| **Framework** | React.js | Component-based, fast rendering for POS screens | Vue.js, Angular |
| **UI Library** | Tailwind CSS + shadcn/ui | Fast styling, mobile-first, no bloat | Bootstrap, MUI |
| **State Management** | Zustand / Redux Toolkit | Simple global state for cart, orders, stock | Context API, MobX |
| **POS Interface** | React + PWA | Works on Android tablet browser offline | Electron (heavy) |
| **QR Menu** | React PWA (mobile-first) | No app download, works in any browser | Flutter Web |
| **Charts & Reports** | Recharts / Chart.js | Lightweight, interactive dashboards | D3.js (complex) |
| **Real-time Updates** | Socket.io (client) | Live order updates on KDS and POS | WebSockets, SSE |
| **Offline Support** | PWA + IndexedDB | Counter POS works without internet | Service Workers |
| **PDF Generation** | React-PDF / jsPDF | Bill and report PDF in browser | Puppeteer (server) |
| **Build Tool** | Vite | Fast development build, HMR | Webpack, CRA |

## 4.2 Backend (API & Business Logic) {#backend-api-business-logic}

|  |  |  |  |
|:--:|:--:|:--:|:--:|
| **Layer** | **Technology** | **Why Chosen** | **Alternatives** |
| **Runtime** | Node.js | Same language front+back, fast I/O, large ecosystem | Python, Java |
| **Framework** | Express.js / Fastify | Lightweight REST API, easy middleware | NestJS, Hapi |
| **API Style** | REST + WebSocket | REST for CRUD, WebSocket for live KDS/orders | GraphQL |
| **Authentication** | JWT + Refresh Tokens | Stateless, role-based, mobile-friendly | Sessions, OAuth |
| **Role-based Access** | Custom middleware | Owner/manager/staff/vendor/cook permissions | Casbin, RBAC libs |
| **Job Queue** | Bull.js + Redis | WhatsApp alerts, report generation, auto-close | RabbitMQ, SQS |
| **File Storage** | AWS S3 / Cloudflare R2 | Menu item photos, invoice PDFs, reports | Local disk (risky) |
| **Email** | Nodemailer + SMTP | Daily summary emails, GST reports | SendGrid, AWS SES |
| **WhatsApp** | Twilio / Gupshup API | Order ready alerts, low stock, daily summary | WATI, AiSensy |
| **SMS** | MSG91 / Fast2SMS | OTP, token notification, order ready | Twilio, TextLocal |

## 4.3 Database Layer {#database-layer}

|  |  |  |  |
|:--:|:--:|:--:|:--:|
| **Layer** | **Technology** | **Why Chosen** | **Alternatives** |
| **Primary DB** | PostgreSQL | Relational, ACID, perfect for billing/inventory | MySQL, MariaDB |
| **ORM** | Prisma / Sequelize | Type-safe queries, easy migrations | TypeORM, Knex |
| **Cache** | Redis | Session cache, rate limiting, job queues | Memcached |
| **Search** | PostgreSQL FTS | Item search in POS --- no extra service needed | Elasticsearch |
| **Multi-tenant** | Schema-per-tenant | Each food court gets isolated DB schema | Row-level tenancy |
| **Backups** | pg_dump + S3 daily | Automated nightly backup with 30-day retention | RDS automated |
| **Analytics DB** | TimescaleDB (optional) | Time-series sales data for trend analytics | ClickHouse |

## 4.4 Mobile App {#mobile-app}

|  |  |  |  |
|:--:|:--:|:--:|:--:|
| **Layer** | **Technology** | **Why Chosen** | **Alternatives** |
| **Framework** | React Native | One codebase for Android + iOS | Flutter, Kotlin/Swift |
| **Owner App** | React Native | Dashboard, alerts, reports, approvals on phone | PWA (limited push) |
| **Staff App** | React Native | Attendance check-in, shift view, order status | Web app |
| **Customer App** | PWA (browser) | No install needed --- QR scan opens in browser | React Native |
| **Push Notifications** | Firebase FCM | Order ready push to customer, alerts to owner | OneSignal, APNs |
| **Offline** | AsyncStorage + sync | Staff app works offline, syncs when connected | SQLite |
| **Bluetooth Printing** | react-native-ble | Connect to Bluetooth thermal printer from app | USB only |

## 4.5 Infrastructure & DevOps (Your Own Servers) {#infrastructure-devops-your-own-servers}

Since you have your own servers, here is the recommended setup for a SaaS deployment serving multiple food courts:

|  |  |  |  |
|:--:|:--:|:--:|:--:|
| **Layer** | **Technology** | **Why Chosen** | **Alternatives** |
| **Web Server** | Nginx | Reverse proxy, SSL termination, static serving | Apache, Caddy |
| **App Server** | PM2 + Node.js | Process management, auto-restart, clustering | Docker Swarm |
| **Containerisation** | Docker | Isolate each client environment, easy scaling | Bare metal |
| **Container Orchestration** | Docker Compose | Manage multi-container setup on your servers | Kubernetes (later) |
| **SSL Certificate** | Let\'s Encrypt | Free SSL for all subdomains (\*.yourdomain.com) | Paid SSL |
| **CI/CD** | GitHub Actions | Auto-deploy on push to main branch | Jenkins, GitLab CI |
| **Monitoring** | PM2 + Grafana | Server health, API response times, error rates | Datadog (paid) |
| **Log Management** | Winston + ELK lite | Centralised error logging, audit trails | Papertrail |
| **Subdomain per client** | Nginx virtual host | collegename.yourapp.com per canteen | Path-based routing |
| **Backup** | pg_dump + rsync to S3 | Nightly DB backup, weekly full server backup | Manual (risky) |

## 4.6 Third-Party Integrations {#third-party-integrations}

|  |  |  |  |
|:--:|:--:|:--:|:--:|
| **Integration** | **Provider** | **Purpose** | **Cost** |
| **Payment Gateway** | Razorpay / PayU | UPI, card, netbanking collection | 1.9--2% per txn |
| **WhatsApp Business** | Gupshup / WATI | Order alerts, low stock, daily summary | ₹0.35--₹0.75/msg |
| **SMS Gateway** | MSG91 / Fast2SMS | OTP, token notification | ₹0.15--₹0.18/SMS |
| **Biometric Device** | ZKTeco SDK | Staff attendance via fingerprint | ₹6,000--₹15,000 device |
| **Thermal Printer** | ESC/POS protocol | Bill and KOT printing | Any brand supported |
| **RFID Meal Card** | Standard 13.56MHz | Employee prepaid meal cards | ₹30--₹60 per card |
| **Google Maps** | Maps API | Delivery radius, outlet locator | Free up to 28K calls/mo |
| **Firebase** | Google FCM | Push notifications for mobile app | Free tier sufficient |

# 5. System Architecture Overview {#system-architecture-overview}

|                                     |                                     |
|:-----------------------------------:|:-----------------------------------:|
| **Client Side (Browser / Mobile)**  |    **Server Side (Your Server)**    |
|   React.js Web App (Counter POS)    |     Node.js + Express REST API      |
|    React PWA (QR Customer Menu)     |   PostgreSQL (per-tenant schema)    |
|  React Native (Owner / Staff App)   |      Redis (cache + job queue)      |
| Socket.io Client (KDS live updates) | Socket.io Server (real-time orders) |
|    Recharts (Reports dashboard)     |   Bull.js (WhatsApp / email jobs)   |
|    IndexedDB (offline POS data)     |     Nginx (reverse proxy + SSL)     |
|    PWA Service Worker (offline)     |      PM2 (process management)       |
|  Firebase FCM (push notifications)  |  Docker (containerised deployment)  |

# 6. Development Build Plan {#development-build-plan}

Recommended build sequence to get to a working, sellable product as fast as possible --- starting with the most critical features first:

|  |  |  |  |
|:--:|:--:|:--:|:--:|
| **Phase** | **Timeline** | **What to Build** | **Sellable At** |
| **Phase 1** | Week 1--2 | Item master, daily menu toggle, category setup, opening stock entry | --- |
| **Phase 2** | Week 3--4 | Counter POS, KOT printing, cash billing, basic daily sales report | Basic canteen |
| **Phase 3** | Week 5--6 | UPI payment gateway, GST billing, closing stock, daily summary WhatsApp | College canteen |
| **Phase 4** | Week 7--8 | QR self-ordering, kitchen display screen, token system, order status | Corporate canteen |
| **Phase 5** | Week 9--10 | Recipe mapping, auto stock deduction, low stock alert, wastage tracking | Full canteen ERP |
| **Phase 6** | Week 11--12 | Multi-vendor module, vendor dashboard, commission, vendor settlement | Mall food court |
| **Phase 7** | Week 13--14 | Meal card/RFID, prepaid wallet, mess subscription billing, loyalty points | Premium plans |
| **Phase 8** | Week 15--16 | HR, payroll, attendance, mobile app (owner + staff), advanced MIS | Enterprise plan |

# 7. SaaS Pricing Plans {#saas-pricing-plans}

|  |  |  |  |  |
|:--:|:--:|:--:|:--:|:--:|
| **Feature** | **Canteen Basic** | **Canteen Pro** | **Food Court** | **Enterprise** |
| **Target** | School / College | Corporate / Hospital | Mall Food Court | Canteen Chain |
| **Price / Year** | ₹12,000 | ₹20,000 | ₹40,000 | ₹75,000+ |
| **Daily Menu Toggle** | ✔ | ✔ | ✔ | ✔ |
| **Stock Management** | ✔ Basic | ✔ Full | ✔ Full | ✔ Full |
| **Counter POS** | ✔ | ✔ | ✔ | ✔ |
| **QR Self-Ordering** | ✗ | ✔ | ✔ | ✔ |
| **KDS** | ✗ | ✔ | ✔ | ✔ |
| **UPI / Card Payment** | ✔ | ✔ | ✔ | ✔ |
| **Meal Card / RFID** | ✗ | ✔ | ✔ | ✔ |
| **Multi-Vendor** | ✗ | ✗ | ✔ | ✔ |
| **Commission Tracking** | ✗ | ✗ | ✔ | ✔ |
| **Mess Subscription** | ✗ | ✔ | ✗ | ✔ |
| **HR & Payroll** | ✗ | ✔ | ✔ | ✔ |
| **Mobile App** | ✗ | ✔ | ✔ | ✔ |
| **WhatsApp Alerts** | ✔ Basic | ✔ | ✔ | ✔ Priority |
| **Multi-Branch** | ✗ | ✗ | ✗ | ✔ |

# 8. Summary {#summary}

The Food Court & Canteen ERP is one of the fastest products you can launch because approximately 40% of the modules (HR, Payroll, Accounts, Inventory, Attendance) are already being built as part of the College ERP. The additional development needed is primarily the POS interface, QR ordering flow, KDS, and food-specific stock logic.

- Phase 1--4 (8 weeks) is enough to sell the Canteen Basic and Canteen Pro plans to college and corporate canteens

- Phase 5--6 (12 weeks) completes the Food Court plan for mall and multi-vendor venues

- Phase 7--8 (16 weeks) delivers the full Enterprise plan with mobile app, meal cards, and multi-branch management
