# Wallet Application

A full-stack educational wallet application demonstrating modern web development practices with user authentication, wallet management, money transfers, and real-time support chat.

## Overview

This is an educational full-stack wallet application built to demonstrate:
- JWT-based authentication and authorization
- Role-based access control (USER/ADMIN)
- Secure money transfers with transaction history
- Real-time support chat with WebSocket
- Responsive design for desktop, tablet, and mobile
- RESTful API architecture with NestJS
- MongoDB database with Mongoose ODM

**Disclaimer**: This is an educational project application and is not connected to a real bank or financial institution. Do not use for actual financial transactions.

## Features

### Authentication
- User registration with username, email, and password
- JWT-based login with secure token storage
- Automatic wallet creation on registration
- Password hashing with bcrypt
- Role-based access control (USER/ADMIN)

### Wallet & Transactions
- View wallet balance and wallet information
- Send money to other users with fuzzy search
- Transaction history with filtering (type, status, date range)
- Clickable transaction rows to view full details in modal
- Transaction cancellation within 24-hour window
- Export transactions to CSV
- Decimal.js for precise financial calculations

### Money Requests
- Request money from other users
- Accept or reject requests
- Automatic transfer on acceptance
- Request cancellation
- Status tracking (pending/accepted/rejected/cancelled)

### Notifications
- Real-time notifications for transactions and requests
- Unread count badge
- Mark as read functionality
- Mark all as read
- Delete individual notifications
- Clear all notifications

### User Search
- Fuzzy search by username or email using Fuse.js
- Debounced search input for performance
- User selection with display of selected user

### Support Chat
- Real-time messaging with WebSocket (Socket.IO)
- JWT authentication on WebSocket connection
- Admin availability status
- Conversation history
- Role-based access (USER/ADMIN)
- Mobile-responsive chat interface
- Conversation closing capability

### Profile
- View profile information
- Change email
- Change password

### Analytics
- Income and expense tracking
- Net cash flow calculation
- Savings rate calculation
- Date filtering (preset periods: 7D, 30D, 3M, 6M, 1Y)
- Custom date range filtering
- Spending categories based on transaction descriptions

### Admin
- User management: view all registered users and their wallets
- User search and details modal
- Transaction monitoring
- Support availability toggle
- Admin-only endpoints protected by guards

### Responsive UI
- Mobile-first design with breakpoints (320px, 768px, 1024px, 1280px)
- Mobile navigation with hamburger menu
- Responsive tables with horizontal scroll
- Touch-friendly button sizes (44px minimum)
- Skeleton loading states for better UX

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Backend | NestJS, TypeScript |
| Database | MongoDB with Mongoose ODM |
| Authentication | JWT, bcrypt, Passport |
| API | REST with Axios |
| Real-time | Socket.IO (client and server) |
| Validation | class-validator, class-transformer |
| Financial calculations | decimal.js |
| Search | Fuse.js |
| Email | Brevo (optional) |

## Project Structure

```
Final Project/
├── frontend/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/   # Reusable components (NotificationBell, ChatWidget, UserSearch, Skeleton)
│   │   ├── context/      # React context providers (AuthContext, ChatContext, ThemeContext)
│   │   ├── hooks/        # Custom hooks (useDebounce)
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client and socket service
│   │   └── types/        # TypeScript type definitions
│   └── public/          # Static assets
├── backend/              # NestJS backend
│   ├── src/
│   │   ├── admin/        # Admin module (controller, service, DTOs)
│   │   ├── auth/         # Authentication module (controller, service, guards, strategies, DTOs)
│   │   ├── chat/         # Support chat module (gateway, controller, service, schemas, DTOs)
│   │   ├── common/       # Shared utilities (enums)
│   │   ├── email/        # Email service (Brevo integration)
│   │   ├── money-requests/ # Money requests module (controller, service, schema, DTOs)
│   │   ├── notifications/ # Notifications module (controller, service, schema)
│   │   ├── payments/     # Payment processing (controller, service, schema, DTOs)
│   │   ├── users/        # User management (service, schema)
│   │   └── wallet/       # Wallet operations (service, schema)
│   └── test/             # Test configuration
└── README.md             # This file
```

## Architecture

```
Frontend (React + TypeScript)
    ↓ REST API (Axios)
    ↓ WebSocket (Socket.IO)
Backend API (NestJS + TypeScript)
    ↓
MongoDB Database
```

### Frontend Responsibilities
- User interface and interaction
- Client-side routing with React Router
- State management with React Context (AuthContext, ChatContext, ThemeContext)
- API communication via Axios with JWT interceptors
- WebSocket connection management for real-time chat
- Form validation and error handling

### Backend Responsibilities
- REST API endpoints for all operations
- WebSocket gateway for real-time chat
- JWT authentication and authorization
- Role-based access control (USER/ADMIN)
- Business logic for financial operations
- MongoDB transactions for atomic balance updates
- Email notifications via Brevo (optional)

### Database Responsibilities
- User and wallet data storage
- Transaction records with related sender/receiver
- Money request tracking
- Notification storage
- Chat conversation and message persistence

## Authentication & Security

- **JWT Authentication**: Stateless token-based authentication with expiration
- **Password Hashing**: bcrypt with 10 salt rounds
- **Role-Based Authorization**: JwtAuthGuard and RolesGuard protect endpoints
- **Ownership Validation**: Users can only access their own data (wallet, transactions, notifications)
- **Input Validation**: class-validator DTOs for all API inputs
- **WebSocket Authentication**: JWT validation on Socket.IO connection
- **CORS**: Configured for specific origin (http://localhost:5173)
- **Password Exclusion**: Password field never returned in API responses
- **NoSQL Injection Prevention**: Mongoose ObjectId casting prevents injection

## Installation

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB (running locally or cloud instance)
- npm

### Backend Setup

```bash
cd backend
npm install
```

Create `.env` file in backend directory:

```env
MONGO_URI=mongodb://localhost:27017/wallet-app
JWT_SECRET=your-secret-key-here
PORT=3000
BREVO_API_KEY=your-brevo-api-key-here
BREVO_SENDER_EMAIL=your-verified-sender-email@domain.com
BREVO_SENDER_NAME=Wallet
```

### Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` file in frontend directory:

```env
VITE_API_URL=http://localhost:3000
```

## Environment Variables

### Backend (.env)
- `MONGO_URI`: MongoDB connection string (required)
- `JWT_SECRET`: Secret key for JWT signing (required)
- `PORT`: Backend server port (default: 3000)
- `BREVO_API_KEY`: Brevo API key for email service (optional)
- `BREVO_SENDER_EMAIL`: Verified sender email for Brevo (optional)
- `BREVO_SENDER_NAME`: Sender name for emails (optional)

### Frontend (.env)
- `VITE_API_URL`: Backend API URL (required)

## Running the Project

### Backend

```bash
cd backend
npm run start:dev
```

Backend will run on http://localhost:3000

### Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on http://localhost:5173

## Building

### Frontend

```bash
cd frontend
npm run build
```

Output is generated in `frontend/dist/`

### Backend

```bash
cd backend
npm run build
```

Output is generated in `backend/dist/`

## Testing

The project has Jest configured for testing, but no tests are currently implemented.

### Available Test Commands

**Backend**
```bash
npm run test         # Run unit tests
npm run test:e2e     # Run end-to-end tests
npm run test:cov     # Run tests with coverage
```

## API Overview

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `PATCH /auth/email` - Change email
- `PATCH /auth/password` - Change password

### Wallet
- `GET /wallet` - Get wallet balance
- `POST /wallet/transfer` - Send money
- `GET /wallet/transactions` - Get transaction history
- `GET /wallet/analytics` - Get spending analytics
- `GET /wallet/transactions/export` - Export transactions to CSV
- `POST /payments/transactions/:transactionId/cancel` - Cancel transaction
- `POST /payments/checkout` - Initiate top-up checkout
- `POST /payments/webhook` - Payment webhook handler

### Users
- `GET /users/search` - Fuzzy search users

### Money Requests
- `POST /money-requests` - Create money request
- `GET /money-requests/incoming` - Get incoming requests
- `GET /money-requests/outgoing` - Get outgoing requests
- `POST /money-requests/:id/respond` - Accept/reject request
- `POST /money-requests/:id/cancel` - Cancel request

### Notifications
- `GET /notifications` - Get user notifications
- `GET /notifications/unread-count` - Get unread count
- `PATCH /notifications/:id/read` - Mark as read
- `PATCH /notifications/read-all` - Mark all as read
- `DELETE /notifications/:id` - Delete notification
- `DELETE /notifications` - Clear all notifications

### Support Chat
- `POST /chat/conversations` - Create conversation
- `GET /chat/conversations` - Get conversations
- `GET /chat/conversations/:id` - Get conversation details
- `GET /chat/conversations/:id/messages` - Get messages
- `PATCH /chat/conversations/:id/close` - Close conversation

### Admin
- `GET /admin/users` - Get all users (admin only)
- `GET /admin/users/:id` - Get user details (admin only)
- `GET /admin/availability` - Get admin availability
- `PATCH /admin/availability` - Update admin availability
- `GET /admin/available-representatives` - Get available admins

## Real-Time Chat

- **WebSocket**: Socket.IO for real-time bidirectional communication
- **Authentication**: JWT token validated on connection
- **Conversations**: Users can create support conversations with available admins
- **Messages**: Real-time message delivery within conversations
- **Participant Validation**: Only conversation participants can send messages
- **Admin Availability**: Users can only create conversations when admins are online
- **Conversation Status**: Conversations can be OPEN or CLOSED
- **Notifications**: Admin messages trigger notifications for users

## Admin Functionality

- **User Management**: View all registered users with wallet balances
- **User Search**: Search users by username or email
- **User Details**: Modal with detailed user information
- **Support Availability**: Toggle online status to receive support requests
- **Chat Access**: View and respond to user support conversations
- **Protected Endpoints**: All admin endpoints require ADMIN role

## Project Status

This is a complete full-stack educational wallet application demonstrating:
- JWT-based authentication and authorization
- Role-based access control
- Wallet operations with precise financial calculations
- Transaction management with history and filtering
- Money request workflow
- Real-time chat with WebSocket
- Responsive design for all devices
- MongoDB persistence with atomic transactions

The application is functional and ready for demonstration or educational use.

## Demo Guide

For a structured demonstration guide, see `DEMO.md`.

## License

This project is for educational purposes.
